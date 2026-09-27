# 🏥 Vitalys App

Aplicación web para la gestión integral de un centro de salud híbrido que combina **gimnasio** y **consultorios profesionales** (Nutrición, Psicología y Kinesiología). Centraliza en una única plataforma la identidad de socios y pacientes, la agenda de turnos, el registro de pagos y las notificaciones.

> 🎓 **Trabajo Final Integrador** — Tecnicatura Universitaria en Programación (UTN)

---

## 👥 Integrantes

| Nombre                | Legajo   | GitHub                                                 |
| --------------------- | -------- | ------------------------------------------------------ |
| Renzo Calcatelli      | _100960_ | [@rcalcatelli](https://github.com/rcalcatelli)         |
| Pablo Basualdo Arcati | _100153_ | [@pbasualdoarcati](https://github.com/pbasualdoarcati) |

**Tutora:** Sofía Raia

---

## 🎯 Problema y alcance

Los centros de salud híbridos gestionan socios de gimnasio y pacientes de consultorios con sistemas separados (o planillas), lo que genera datos duplicados, superposición de turnos y cobros difíciles de rastrear. **Vitalys** unifica esa gestión en una sola aplicación web responsive.

### Módulos (MVP)

1. 🔐 **Autenticación y roles** — socio/paciente, profesional y administración
2. 👤 **Gestión de personas** — alta, baja lógica, modificación y consulta (identidad unificada socio/paciente)
3. 🩺 **Gestión de profesionales** — ABM y disponibilidad horaria por especialidad
4. 📅 **Agenda de turnos** — reserva y cancelación de turnos de consultorio y de gimnasio, cada uno con sus propias reglas (grilla y cupo por franja en gym, disponibilidad por profesional en consultorio, anticipación de 24 h o 2 h según el tipo, deuda gym con excepciones puntuales autorizadas por el ADMIN)
5. 💳 **Registro de pagos** — cuotas de gimnasio y sesiones de consultorio
6. 📧 **Notificaciones** — confirmaciones y recordatorios por email

### Fuera de alcance (versión futura)

- Ficha clínica digital
- Reserva de clases grupales con cupos
- Pasarela de pagos online
- Publicación en tiendas móviles (App Store / Play Store)

---

## 🛠️ Stack tecnológico

| Capa          | Tecnología                              |
| ------------- | --------------------------------------- |
| Backend       | Java 17 · Spring Boot · Spring Data JPA |
| Frontend      | React · TypeScript                      |
| Base de datos | PostgreSQL (Supabase)                   |
| Despliegue    | Vercel (frontend) · Render (backend)    |
| Versionado    | Git · GitHub                            |

---

## 📁 Estructura del repositorio

```
vitalys-app/
├── backend/               → API REST (Spring Boot + Spring Data JPA), Dockerfile incluido
├── frontend/              → Cliente web (Vite + React + TypeScript)
├── db/
│   ├── ddl/
│   │   └── vitalys_ddl.sql       → Script de esquema para el flujo manual de Supabase (ver runbook)
│   ├── dml/
│   │   └── seed.sql              → Datos de prueba
│   └── migration/                → Migraciones versionadas de Flyway (V1, V2, V3…)
├── docker-compose.yml     → Entorno local: Postgres + backend con un solo comando
├── .github/workflows/     → CI (build + tests + JaCoCo del backend, build del frontend)
└── docs/
    ├── 01-propuesta/
    │   ├── propuesta-proyecto-rfc.md   → Propuesta de proyecto (1.ª entrega)
    │   └── relevamiento/               → Relevamiento de usuarios (perfiles, necesidades detectadas)
    ├── 02-diseno/
    │   ├── diagrama-er.mermaid         → Diagrama entidad-relación (2.ª entrega)
    │   ├── diccionario-datos.md        → Diccionario de datos
    │   ├── requerimientos.md           → Catálogo de requerimientos funcionales y no funcionales
    │   └── modulos.md                  → Listado de módulos y endpoints (2.ª entrega)
    ├── 03-despliegue/
    │   ├── runbook-deploy.md               → Guía de despliegue (Supabase + Render + Vercel)
    │   ├── entorno-local-docker.md         → Cómo levantar el backend local con Docker y Flyway
    │   └── setup-wsl-testcontainers.md     → Tests de integración con Testcontainers en Windows/WSL
    └── metodologia/  → Planificación Scrum, riesgos y pruebas
```

---

## 🗄️ Base de datos

El esquema usa **PostgreSQL** con las siguientes tablas principales:

| Tabla                        | Descripción                                                     |
| ---------------------------- | ---------------------------------------------------------------- |
| `usuarios`                   | Credenciales y rol de acceso al sistema                         |
| `personas`                   | Identidad única socio/paciente (soft-delete)                    |
| `profesionales`              | Profesionales con especialidad y duración de turno              |
| `disponibilidad_profesional` | Franjas horarias semanales por profesional                     |
| `turnos`                     | Reservas de consultorio y de gimnasio, con ciclo de vida y auditoría de cancelación |
| `configuracion_gym`          | Parámetros del gimnasio (cupo por franja)                       |
| `pagos`                      | Cuotas de gym y sesiones de consultorio                         |
| `excepciones_morosidad`      | Excepciones puntuales al bloqueo por deuda en gym, autorizadas por el ADMIN |
| `notificaciones`             | Log de emails enviados                                          |

El esquema se gestiona con **migraciones versionadas de Flyway**, en [`db/migration/`](db/migration). `V1` contiene el esquema inicial aprobado en la 2.ª entrega; los cambios posteriores (reglas de gimnasio, excepciones de morosidad, etc.) llegan como `V2`, `V3`… sin modificar las anteriores. El archivo [`db/ddl/vitalys_ddl.sql`](db/ddl/vitalys_ddl.sql) se conserva únicamente para el flujo manual de carga del esquema en Supabase, documentado en el runbook de despliegue.

Ver diagrama ER: [`docs/02-diseno/diagrama-er.mermaid`](docs/02-diseno/diagrama-er.mermaid)

---

## 🚀 Instalación y ejecución

La forma más simple de levantar el backend en local es con Docker Compose:

```bash
cp .env.example .env
docker compose up -d
```

Esto levanta un Postgres propio y el backend con Flyway aplicando el esquema automáticamente, sin necesidad de instalar Java, Maven ni un Postgres a mano. Guía completa (variables de entorno, carga del seed, troubleshooting): [`docs/03-despliegue/entorno-local-docker.md`](docs/03-despliegue/entorno-local-docker.md).

Con el backend arriba, la documentación interactiva de la API (Swagger UI) queda disponible en [`http://localhost:8080/swagger-ui/index.html`](http://localhost:8080/swagger-ui/index.html) (JSON crudo en `/v3/api-docs`). No requiere token para verla; para probar un endpoint protegido, hacer login, copiar el JWT devuelto y pegarlo en el botón "Authorize" (sin el prefijo `Bearer `).

Para correr el frontend en desarrollo:

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Despliegue

| Servicio | URL         | Estado |
| -------- | ----------- | ------ |
| Frontend | _pendiente_ | 🔜     |
| Backend  | _pendiente_ | 🔜     |

Guía paso a paso (Supabase + Render + Vercel): [`docs/03-despliegue/runbook-deploy.md`](docs/03-despliegue/runbook-deploy.md).

> ⏱️ **Cold start (plan free de Render):** el backend se "duerme" tras un período sin tráfico.
> La primera request después de eso puede tardar **~50 segundos** en responder mientras el
> contenedor arranca de nuevo. Esto es un comportamiento esperado del plan free, **no es un bug**.

---

## 📅 Hoja de ruta

- [x] Conformación del equipo y elección de tutora
- [x] **1.ª entrega** — Propuesta y repositorio (30/08)
- [ ] **2.ª entrega** — Esquema de BD y módulos (27/09): la tutora todavía no la cerró. Devolución pendiente de resolver en su totalidad.
- [ ] **Entrega final** — Informe, video y despliegue (14/11)
- [ ] Defensa oral

**Avance real (no altera las fechas de arriba):**

- Sprint 2 completo: backend con autenticación JWT, frontend con login, CI en verde (37 tests, ~95,5% de cobertura de backend, por encima del umbral mínimo del 90% que exige el gate de JaCoCo en CI).
- Sprint 1 parcial: falta crear el proyecto en Supabase, ejecutar las migraciones contra esa base, y los despliegues de backend (Render) y frontend (Vercel). Estas tareas dependen de las cuentas del equipo, todavía no disponibles.
