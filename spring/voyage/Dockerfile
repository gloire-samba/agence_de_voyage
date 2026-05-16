# Étape 1 : Build de l'application
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
# On télécharge les dépendances (permet de mettre en cache cette étape)
RUN ./mvnw dependency:go-offline

COPY src src
RUN ./mvnw package -DskipTests

# Étape 2 : Création de l'image finale allégée
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]