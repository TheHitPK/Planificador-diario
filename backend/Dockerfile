# --- Compilación ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Primero solo lo necesario para descargar dependencias (se cachea entre builds).
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -q package -DskipTests && cp target/*.jar app.jar

# --- Ejecución ---
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --uid 1001 spring
USER spring

COPY --from=build /app/app.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k"

# Render y otros inyectan PORT; application.yml ya lo usa (8080 por defecto).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
