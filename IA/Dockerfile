FROM python:3.12-slim

# 1. Hugging Face exige un utilisateur non-root (ID 1000)
RUN useradd -m -u 1000 user
USER user

# 2. On définit les variables d'environnement pour le nouvel utilisateur
ENV PATH="/home/user/.local/bin:$PATH"
WORKDIR /home/user/app

# 3. On copie le requirements.txt en donnant les droits à "user"
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. On copie le reste du code
COPY --chown=user . .

# 5. Hugging Face écoute OBLIGATOIREMENT sur le port 7860
EXPOSE 7860

# 6. On lance uvicorn sur le port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]