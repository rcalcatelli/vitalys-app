# syntax=docker/dockerfile:1
#
# Build multi-stage del backend de Vitalys.
#
# El contexto de build es la RAÍZ del repositorio (ver docker-compose.yml:
# build.context: . / build.dockerfile: backend/Dockerfile), no backend/. Es necesario porque
# este Dockerfile copia también db/migration/ — las migraciones de Flyway viven ahí, fuera de
# backend/, y deben quedar embebidas en el jar final (ver backend/pom.xml, sección <resources>
# y docs/03-despliegue/entorno-local-docker.md). La etapa de runtime NO tiene acceso al
# repositorio: todo lo que necesita ya quedó empaquetado en el .jar por la etapa de build.

# ---------------------------------------------------------------------------
# Etapa 1: build (JDK 17 + Maven)
# ---------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# db/migration primero: son las migraciones versionadas que backend/pom.xml copia al
# classpath durante el build (../db/migration relativo a backend/).
COPY db/migration ./db/migration
COPY backend ./backend

WORKDIR /workspace/backend
RUN mvn -B -q clean package -DskipTests

# ---------------------------------------------------------------------------
# Etapa 2: runtime (solo JRE 17, sin Maven ni código fuente ni repo)
# ---------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS runtime

# Usuario no root: el proceso de la app nunca corre como root dentro del contenedor.
RUN addgroup -S vitalys && adduser -S vitalys -G vitalys
WORKDIR /app

COPY --from=build /workspace/backend/target/vitalys-backend-*.jar /app/app.jar
RUN chown -R vitalys:vitalys /app

USER vitalys
EXPOSE 8080

# /api/health no depende de la base de datos (ver HealthController): sirve como liveness
# check aunque Flyway todavía esté migrando o la DB esté momentáneamente caída.
HEALTHCHECK --interval=10s --timeout=5s --start-period=25s --retries=6 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Sin secretos horneados en la imagen: DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, etc.
# llegan como variables de entorno en tiempo de ejecución (ver docker-compose.yml y
# .env.example).
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
