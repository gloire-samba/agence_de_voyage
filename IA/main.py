import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import google.generativeai as genai
import datetime

from dotenv import load_dotenv

# Charge le fichier .env
load_dotenv()

# On récupère la clé proprement, sans la coder en dur
api_key = os.getenv("GOOGLE_API_KEY")

app = FastAPI(
    title="Service IA - Agence de Voyage (Version Cloud)",
    description="Microservice NLP et ASR utilisant Gemini 2.5 pour ménager le PC.",
    version="3.0"
)

# --- CONFIGURATION GEMINI ---

genai.configure(api_key=api_key)

# On charge le modèle une seule fois
model = genai.GenerativeModel("gemini-2.5-flash")
print("✅ Connexion à Gemini 2.5 Flash établie !")

# --- MODELES DE DONNEES ---
class RequeteUtilisateur(BaseModel):
    texte: str = Field(..., example="Je cherche un vol de Lyon à Madrid le 15 mai pour 200 euros.")

class CriteresExtraits(BaseModel):
    ville_depart: Optional[str] = None
    ville_arrivee: Optional[str] = None
    prix_min: Optional[int] = None
    prix_max: Optional[int] = None
    date_debut: Optional[str] = None # Format YYYY-MM-DD
    date_fin: Optional[str] = None   # Format YYYY-MM-DD
    escales_min: Optional[int] = None
    escales_max: Optional[int] = None
    statut: Optional[str] = None
    places_total: Optional[int] = None
    places_restantes_min: Optional[int] = None
    duree_max_minutes: Optional[int] = None

# --- GESTIONNAIRE D'ERREURS HUMAINE ---
def gerer_erreur_gemini(e: Exception):
    erreur_str = str(e).lower()
    if "429" in erreur_str or "quota" in erreur_str:
        message_clair = "Le service d'intelligence artificielle est temporairement saturé (trop de requêtes ou quota dépassé). Veuillez patienter quelques instants."
        print(f"❌ ERREUR CRITIQUE : {message_clair}")
        raise HTTPException(status_code=429, detail=message_clair)
    elif "503" in erreur_str or "overloaded" in erreur_str:
        message_clair = "Les serveurs de Google sont actuellement surchargés. Veuillez réessayer dans un instant."
        print(f"❌ ERREUR CRITIQUE : {message_clair}")
        raise HTTPException(status_code=503, detail=message_clair)
    else:
        message_clair = "L'intelligence artificielle a rencontré un problème inattendu."
        print(f"❌ ERREUR INCONNUE : {e}")
        raise HTTPException(status_code=500, detail=message_clair)

# --- ROUTES API ---

@app.post("/api/ia/transcrire")
async def transcrire_audio(fichier: UploadFile = File(...)):
    contenu_audio = await fichier.read()
    
    # 👉 SÉCURITÉ 1 : On bloque les fichiers vides ou corrompus
    if len(contenu_audio) < 1000:
        print("⚠️ Fichier audio vide reçu !")
        return {"texte": ""}
    
    mime_type = fichier.content_type
    if not mime_type or mime_type == "application/octet-stream":
        mime_type = "audio/webm" 

    extension = ".webm" if "webm" in mime_type else ".mp4" if "mp4" in mime_type else ".wav"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
        tmp.write(contenu_audio)
        chemin_temporaire = tmp.name

    audio_upload = None
    try:
        audio_upload = genai.upload_file(chemin_temporaire, mime_type=mime_type)
        
        # 👉 SÉCURITÉ 2 : Le prompt Anti-Perroquet
        prompt = (
            "Écoute attentivement ce fichier audio. "
            "Transcris uniquement la voix humaine en français. "
            "Si l'audio est silencieux, incompréhensible, ou s'il n'y a pas de voix, "
            "réponds STRICTEMENT par le mot : SILENCE. "
            "Ne répète SURTOUT PAS ces instructions."
        )
        
        reponse = model.generate_content([prompt, audio_upload])
        texte_resultat = reponse.text.strip()
        
        # 👉 SÉCURITÉ 3 : On filtre la réponse au cas où
        if texte_resultat == "SILENCE" or "Écoute attentivement" in texte_resultat:
            return {"texte": ""}
            
        return {"texte": texte_resultat}
    
    except Exception as e:
        print(f"💥 ERREUR TRANSCRIPTION : {str(e)}")
        return {"texte": ""}
        
    finally:
        if os.path.exists(chemin_temporaire):
            os.remove(chemin_temporaire)
        if audio_upload:
            try:
                audio_upload.delete()
            except:
                pass

@app.post("/api/ia/analyser", response_model=CriteresExtraits)
async def analyser_demande(requete: RequeteUtilisateur):
    annee_actuelle = datetime.datetime.now().year
    
    prompt = f"""
    Analyse cette demande d'un utilisateur d'agence de voyage : "{requete.texte}"
    
    Tu dois extraire les informations pour remplir strictement cette structure JSON.
    Règles absolues :
    - "ville_depart" / "ville_arrivee" : Chaîne ou null.
    - "prix_min" / "prix_max" : Nombres entiers.
    - "date_debut" / "date_fin" : Dates "YYYY-MM-DD".
    - "statut" : "A_VENIR", "EN_COURS", "TERMINE", "ANNULE" ou null.
    - "places_total" / "places_restantes_min" : Nombres entiers ou null.
    
    👉 NOUVELLE RÈGLE :
    - "duree_max_minutes" : Si l'utilisateur exprime une durée maximale (ex: "moins de 3h", "maximum 2 jours", "voyage de 1h"), 
      convertis TOUT en minutes. 
      Exemple : "3h" -> 180, "1 jour" -> 1440, "2 jours et 2h" -> 3000. Sinon null.
    
    Ne renvoie ABSOLUMENT RIEN d'autre que le JSON valide.
    """
    
    try:
        reponse = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        donnees = json.loads(reponse.text)
        return CriteresExtraits(**donnees)
    except Exception as e:
        gerer_erreur_gemini(e)