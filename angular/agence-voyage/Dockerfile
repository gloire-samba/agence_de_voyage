# Étape 1 : Build avec Node 24
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build --configuration=production

# Étape 2 : Serveur Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf


COPY --from=build /app/dist/agence-voyage/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]