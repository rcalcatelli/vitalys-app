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
│   │   └── vitalys_ddl.sql       → Esquema inicial HISTÓRICO (= V1). No es el esquema vigente
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
| `configuracion_gym`          | Parámetros del gimnasio (cupo por franja, tolerancia de morosidad) |
| `pagos`                      | Cuotas de gym y sesiones de consultorio                         |
| `excepciones_morosidad`      | Excepciones al bloqueo por deuda en gym, autorizadas por el ADMIN |
| `feriados`                   | Días en que el gimnasio no abre; sincronizados con el dataset oficial del Ministerio del Interior |
| `notificaciones`             | Log de emails enviados                                          |

El esquema se gestiona con **migraciones versionadas de Flyway**, en [`db/migration/`](db/migration). `V1` contiene el esquema inicial aprobado en la 2.ª entrega; los cambios posteriores (reglas de gimnasio, excepciones de morosidad, etc.) llegan como `V2`, `V3`… sin modificar las anteriores. El archivo [`db/ddl/vitalys_ddl.sql`](db/ddl/vitalys_ddl.sql) se conserva como **registro histórico** del esquema aprobado el 21/09 —su contenido es el de `V1__esquema_inicial.sql`— y **no debe ejecutarse contra ninguna base**: está incompleto respecto del esquema actual, y pegarlo a mano dejaría a Flyway sin su tabla de historial frente a tablas que él no creó (ver el [runbook de despliegue](docs/03-despliegue/runbook-deploy.md)).

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

| Servicio | URL | Estado |
| -------- | --- | ------ |
| Frontend | [vitalys-app-ayk2.vercel.app](https://vitalys-app-ayk2.vercel.app) | ✅ |
| Backend  | [vitalys-backend-039u.onrender.com](https://vitalys-backend-039u.onrender.com) | ✅ |
| Swagger UI | [/swagger-ui/index.html](https://vitalys-backend-039u.onrender.com/swagger-ui/index.html) | ✅ |

Guía paso a paso (Supabase + Render + Vercel): [`docs/03-despliegue/runbook-deploy.md`](docs/03-despliegue/runbook-deploy.md).

> ⏱️ **Cold start (plan free de Render):** el backend se "duerme" tras un período sin tráfico.
> La primera request después de eso puede tardar **~50 segundos** en responder mientras el
> contenedor arranca de nuevo. Esto es un comportamiento esperado del plan free, **no es un bug**.

---

## 📅 Hoja de ruta

- [x] Conformación del equipo y elección de tutora
- [x] **1.ª entrega** — Propuesta y repositorio (30/08)
- [ ] **2.ª entrega** — Esquema de BD y módulos (27/09): **las 12 observaciones de la devolución están resueltas** (ver detalle abajo). Pendiente de confirmación de la tutora.
- [ ] **Entrega final** — Informe, video y despliegue (14/11)
- [ ] Defensa oral

### Devolución de la 2.ª entrega — estado de las 12 observaciones

| # | Observación | Resuelto en |
|---|-------------|-------------|
| 1 | Tabla `excepciones_morosidad` ausente del esquema | `db/migration/V3__excepciones_morosidad.sql`, más el diccionario de datos y el diagrama ER |
| 2 | El script de datos de prueba no se podía ejecutar | `db/dml/seed.sql`: cuatro errores de SQL, tres turnos en días en que el profesional no atiende y el hash que no correspondía a la contraseña documentada |
| 3 | Relevamiento sin hacer | `docs/01-propuesta/relevamiento/perfiles-usuario.json` y la sección de relevamiento del RFC-0001 |
| 4 | Estados de sprints incorrectos | `docs/metodologia/plan-sprints.md`, con el estado real por tarea. Las fechas no cambian |
| 5 | Turno de gimnasio sin definir | `db/migration/V2__reglas_gimnasio.sql`, RN-14 a RN-19, RF-33 a RF-35 y la Decisión de dominio 11 |
| 6 | Sin fecha de inicio de membresía y cálculo de mora incorrecto | `db/migration/V4__fecha_inicio_membresia.sql` y RN-01 reescrita |
| 7 | RF-01 permitía elegir el rol en el registro público | RF-01, CA-01-4 y CA-01-7; RF-31 para el vínculo por email; Decisión de dominio 10 |
| 8 | La restricción de solapamiento no cubría ausentes ni completados | `db/migration/V5__ensanchar_excl_turnos_overlap.sql` y RN-03 |
| 9 | Nombres de columna desunificados | `cancelado_por_usuario` unificado en todos los documentos y en el seed. La unificación alcanzaba a los **nombres de columna**, no a los de restricciones y triggers: esos se corrigieron después, contrastando cada identificador citado en la documentación contra el catálogo real de PostgreSQL |
| 10 | `modulos.md` y README desactualizados | Ambos archivos |
| 11 | Seis inconsistencias en el RFC-0001 y los documentos de diseño | RFC-0001, `diagramas.md` y `wireframes.md` |
| 12 | Riesgo de los tipos enumerados fuera de la matriz | RG-13 en la matriz de riesgos, con la solución ya implementada y verificada (`@JdbcTypeCode(SqlTypes.NAMED_ENUM)`) |

Las desviaciones deliberadas respecto del mockup de diseño están documentadas, con el requerimiento que las motiva, en [`docs/02-diseno/design-system/README.md`](docs/02-diseno/design-system/README.md).

**Avance real (no altera las fechas de arriba):**

- **Sprint 2 completo.** Backend con autenticación JWT (registro con rol forzado, login por DNI o email, `/api/auth/me`), frontend con las pantallas de login y registro siguiendo el sistema de diseño, y documentación de la API con Swagger. CI en verde: 25 tests unitarios y 18 de integración en el backend con 95,5 % de cobertura, y 83 tests en el frontend con 97,4 %. Ambos con un gate del 90 % que rompe el build.
- **Sprint 1 parcial.** Falta crear el proyecto en Supabase, ejecutar las migraciones contra esa base y los despliegues de backend (Render) y frontend (Vercel). Dependen de las cuentas del equipo, todavía no disponibles. El paso a paso está en [`docs/03-despliegue/runbook-deploy.md`](docs/03-despliegue/runbook-deploy.md).
