# --- ÉTAPE 1 : Build de l'application ---
FROM node:22-alpine AS build

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances (on conserve ton flag de sécurité)
RUN npm install --legacy-peer-deps

# Copie du reste du code source
COPY . .

# Compilation de production (génère le dossier /app/dist)
RUN npm run build

# --- ÉTAPE 2 : Serveur de production ---
FROM nginx:alpine

# Copie des fichiers statiques compilés depuis l'étape précédente vers le dossier Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copie de notre configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposition du port standard de Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]