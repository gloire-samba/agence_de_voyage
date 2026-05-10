import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import google.generativeai as genai
import datetime

from dotenv import load_dotenv # 👈 NOUVEAU

   # Charge le fichier .env
load_dotenv() # 👈 NOUVEAU

# 👈 NOUVEAU : On récupère la clé proprement, sans la coder en dur
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
    statut: Optional[str] = None  # 👈 C'EST CETTE LIGNE QUI MANQUAIT !
    # 👉 NOUVEAU : On apprend à l'IA à chercher ces données
    places_total: Optional[int] = None
    places_restantes_min: Optional[int] = None

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
    """
    Envoie l'audio à Gemini pour transcription exacte en français.
    """
    contenu_audio = await fichier.read()
    
    # On sauvegarde temporairement l'audio pour l'envoyer proprement à Google
    with tempfile.NamedTemporaryFile(delete=False, suffix=".flac") as tmp:
        tmp.write(contenu_audio)
        chemin_temporaire = tmp.name

    audio_upload = None
    try:
        # 1. Envoi du fichier sur les serveurs Google
        audio_upload = genai.upload_file(chemin_temporaire)
        
        # 2. Demande de transcription
        prompt = "Transcris exactement ce qui est dit dans cet audio en français. Ne rajoute aucun commentaire, ne réponds pas aux questions, donne juste le texte."
        reponse = model.generate_content([audio_upload, prompt])
        
        return {"texte": reponse.text.strip()}
    
    except Exception as e:
        gerer_erreur_gemini(e)
        
    finally:
        # 3. Nettoyage méticuleux (PC local ET Cloud Google)
        if os.path.exists(chemin_temporaire):
            os.remove(chemin_temporaire)
        if audio_upload:
            try:
                audio_upload.delete()
            except:
                pass

@app.post("/api/ia/analyser", response_model=CriteresExtraits)
async def analyser_demande(requete: RequeteUtilisateur):
    """
    Demande à Gemini d'extraire les villes, le prix et la date depuis le texte.
    """
    # On récupère l'année en cours sur le serveur (ex: 2026)
    annee_actuelle = datetime.datetime.now().year
    
    prompt = f"""
    Analyse cette demande d'un utilisateur d'agence de voyage : "{requete.texte}"
    
    Tu dois extraire les informations pour remplir strictement cette structure JSON.
    Règles absolues :
    - "ville_depart" / "ville_arrivee" : Chaîne ou null.
    - "prix_min" / "prix_max" : Nombres entiers.
    - "date_debut" / "date_fin" : Dates "YYYY-MM-DD" (année {annee_actuelle}).
    - "escales_min" / "escales_max" : Nombres entiers.
    - "statut" : "A_VENIR", "EN_COURS", "TERMINE", "ANNULE" ou null.
    - "places_total" : Si l'utilisateur demande un avion/voyage d'une taille précise (ex: "un avion de 40 places"), mets ce nombre entier. Sinon null.
    - "places_restantes_min" : Si l'utilisateur demande des places libres (ex: "pour 4 personnes", "au moins 2 places", "je veux réserver 3 places"), mets ce nombre entier. Sinon null.
    
    Ne renvoie ABSOLUMENT RIEN d'autre que le JSON valide.
    """
    
    try:
        # On force Gemini à répondre au format JSON
        reponse = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        donnees = json.loads(reponse.text)
        return CriteresExtraits(**donnees)
        
    except Exception as e:
        gerer_erreur_gemini(e)