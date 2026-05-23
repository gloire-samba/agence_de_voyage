# On part d'une image Node.js légère
FROM node:20-alpine

# On définit le dossier de travail dans le conteneur
WORKDIR /app

# On copie d'abord les fichiers de dépendances pour optimiser le cache Docker
COPY package*.json ./

# On installe les dépendances
RUN npm install --legacy-peer-deps

# On copie le reste du code
COPY . .

# On expose le port de Vite
EXPOSE 5173

# On lance Vite avec l'argument --host (obligatoire dans Docker pour exposer le port vers ton PC)
CMD ["npm", "run", "dev", "--", "--host", "--force"]