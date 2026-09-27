# Plan de Sprints — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia  
> Metodología: Modelo Incremental con marco Scrum (sprints de 2 semanas)

---

## Resumen del plan

| Sprint   | Período            | Módulo/s                                     | Resp. primario          | Estado  |
|----------|--------------------|----------------------------------------------|-------------------------|---------|
| Sprint 1 | 31/08 – 13/09/2026 | Infraestructura + DDL + Setup inicial         | R. Calcatelli           | 🟡 Parcial (6/9 tareas) |
| Sprint 2 | 14/09 – 27/09/2026 | Autenticación y roles (JWT)                  | P. Basualdo Arcati      | ✅ Completado |
| Sprint 3 | 28/09 – 11/10/2026 | Módulo Personas + Módulo Profesionales       | Ambos                   | 🔄 En curso |
| Sprint 4 | 12/10 – 25/10/2026 | Módulo Turnos                                | R. Calcatelli           | ⏳ Pendiente |
| Sprint 5 | 26/10 – 08/11/2026 | Módulo Pagos + Módulo Notificaciones         | P. Basualdo Arcati      | ⏳ Pendiente |
| Cierre   | 09/11 – 14/11/2026 | Estabilización · Informe · Video · Defensa   | Ambos                   | ⏳ Pendiente |

---

## Sprint 1 — Infraestructura y base de datos (31/08 – 13/09)

**Objetivo:** dejar el entorno de desarrollo y la base de datos funcionales y desplegados.

**Tareas:**

| ID  | Tarea                                                       | Responsable    | Estimación | Estado |
|-----|-------------------------------------------------------------|----------------|------------|--------|
| T1-1 | Crear repositorio GitHub, configurar ramas (main, dev, feat/*) | R. Calcatelli | 2 h | ✅ |
| T1-2 | Inicializar proyecto Spring Boot (Java 17, Spring Data JPA, Security) | R. Calcatelli | 3 h | ✅ |
| T1-3 | Inicializar proyecto React + TypeScript + Vite             | P. Basualdo Arcati | 2 h | ✅ |
| T1-4 | Crear proyecto Supabase y ejecutar DDL v1                  | R. Calcatelli  | 2 h | ⏳ Pendiente |
| T1-5 | Configurar conexión JDBC hacia Supabase (application.properties) | R. Calcatelli | 1 h | ✅ (configuración lista; falta un proyecto Supabase real donde apuntar, ver T1-4) |
| T1-6 | Desplegar backend vacío en Render y frontend en Vercel     | P. Basualdo Arcati | 3 h | ✅ (`render.yaml`, `frontend/vercel.json`) |
| T1-7 | Documentar arranque en frío de Render en README            | P. Basualdo Arcati | 1 h | ✅ (README, sección "Cold start"; runbook en `docs/03-despliegue/runbook-deploy.md`) |
| T1-8 | Ejecutar DDL v2 (con todas las correcciones de la 2.ª entrega) | R. Calcatelli | 1 h | ⏳ Pendiente — depende de T1-4 |
| T1-9 | Ejecutar seed.sql y verificar constraints                  | Ambos          | 2 h | ⏳ Pendiente — depende de T1-4/T1-8 |

**Estado real (verificado 27/09/2026 contra el repositorio):** parcial, 6 de 9 tareas completas. Lo pendiente (T1-4, T1-8, T1-9) es una sola cadena: crear el proyecto en Supabase, correr contra esa base las migraciones (`db/migration/V1__esquema_inicial.sql` a `V5__ensanchar_excl_turnos_overlap.sql`) y verificar `db/dml/seed.sql`. Ningún agente puede hacer esto por su cuenta porque requiere las credenciales de Supabase del equipo; lo demás (repo, ambos proyectos base, conexión JDBC configurada, despliegue y documentación de arranque en frío) está commiteado y es verificable en `backend/`, `frontend/`, `render.yaml`, `frontend/vercel.json` y el README.

**Entregable:** URL pública del frontend y backend respondiendo health-check. Base de datos con esquema y datos de prueba — **pendiente de un proyecto Supabase real** (T1-4/T1-8/T1-9).

**Criterio de cierre del sprint:** `GET /api/health` devuelve `200 OK` desde la URL de Render. *(Alcanzable con el backend actual; lo que falta para cerrar el sprint es la base de datos real en Supabase, no el código.)*

---

## Sprint 2 — Autenticación y roles (14/09 – 27/09)

**Objetivo:** registro, login y JWT funcionando; endpoints protegidos por rol.  
**Entrega de cátedra:** 27/09 — esquema de BD y listado de módulos (✅ presentado).

| ID   | Tarea                                                               | Responsable        | Estimación |
|------|---------------------------------------------------------------------|--------------------|------------|
| T2-1 | Entidad Usuario + UserDetailsService (Spring Security)              | P. Basualdo Arcati | 4 h |
| T2-2 | Endpoint POST /api/auth/registro (hash bcrypt, rol forzado a `SOCIO_PACIENTE`, 400 si el body incluye `rol`) | P. Basualdo Arcati | 3 h |
| T2-3 | Endpoint POST /api/auth/login → JWT                                | P. Basualdo Arcati | 3 h |
| T2-4 | Filtro JWT + SecurityFilterChain con roles                         | P. Basualdo Arcati | 4 h |
| T2-5 | Endpoint GET /api/auth/me (datos del usuario autenticado)          | P. Basualdo Arcati | 1 h |
| T2-6 | Pantalla Login (React, W-01)                                       | R. Calcatelli      | 4 h |
| T2-7 | Contexto de auth en frontend (token en localStorage, guard por rol)| R. Calcatelli      | 3 h |
| T2-8 | Tests de integración: registro, login, acceso sin token, CORS, y rechazo 400 de `rol` en el body de registro | Ambos              | 3 h |

**Criterio de cierre:** login devuelve JWT, rutas sin token devuelven 401, rutas con rol incorrecto devuelven 403.

**Estado real (verificado 27/09/2026 contra el repositorio y CI):** completado. Código en `backend/src/main/java/com/vitalys/` (entidad `Usuario`, `UsuarioDetailsServiceImpl`, `AuthController`, `JwtService`, `JwtAuthenticationFilter`, `SecurityConfig`) y `frontend/src/` (`LoginPage.tsx`, `AuthContext.tsx`, `RoleGuard.tsx`). CI en verde (`.github/workflows/backend-ci.yml`): 19 tests unitarios, 18 de integración (PI-01 a PI-06 y PI-18 a PI-29), cobertura JaCoCo `0.9553` contra un gate de `0.90` que rompe el build si no se alcanza.

---

## Sprint 3 — Personas y Profesionales (28/09 – 11/10)

**Objetivo:** ABM completo de personas y profesionales con sus disponibilidades.

| ID   | Tarea                                                                      | Responsable        | Estimación |
|------|----------------------------------------------------------------------------|--------------------|------------|
| T3-1 | Entidades JPA: Persona, EstadoPersona, baja lógica                        | R. Calcatelli      | 3 h |
| T3-2 | PersonaRepository + PersonaService (CRUD + baja lógica)                   | R. Calcatelli      | 4 h |
| T3-3 | PersonaController: GET /personas, POST, PUT /{id}, PATCH /{id}/baja       | R. Calcatelli      | 3 h |
| T3-4 | Pantalla ABM Personas ADMIN (W-05)                                        | R. Calcatelli      | 6 h |
| T3-5 | Entidades JPA: Profesional, Especialidad, DisponibilidadProfesional       | P. Basualdo Arcati | 3 h |
| T3-6 | ProfesionalRepository + ProfesionalService                                | P. Basualdo Arcati | 3 h |
| T3-7 | DisponibilidadService (carga, edición, control anti-solapamiento via trigger) | P. Basualdo Arcati | 4 h |
| T3-8 | ProfesionalController: endpoints CRUD + disponibilidad                    | P. Basualdo Arcati | 3 h |
| T3-9 | Pantalla gestión de disponibilidad (PROFESIONAL / ADMIN)                  | P. Basualdo Arcati | 5 h |
| T3-10 | Tests de baja lógica, unicidad de DNI, anti-solapamiento de disponibilidad | Ambos             | 3 h |
| T3-11 | Endpoint POST /api/personas/vincular (vínculo de persona con usuario existente por email, ADMIN-only, 404/409/403) | R. Calcatelli | 3 h |

**Criterio de cierre:** ADMIN puede crear, editar y dar de baja personas; el trigger rechaza disponibilidades superpuestas.

---

## Sprint 4 — Agenda de Turnos (12/10 – 25/10)

**Objetivo:** reserva, cancelación y ciclo de vida completo de turnos de consultorio y de gimnasio (grilla fija, cupo por franja, check-in).

| ID   | Tarea                                                                      | Responsable   | Estimación |
|------|----------------------------------------------------------------------------|---------------|------------|
| T4-1 | Entidades JPA: Turno, TipoTurno, EstadoTurno (ENUMs)                     | R. Calcatelli | 3 h |
| T4-2 | TurnoService.getSlotsDisponibles (cruce disponibilidad − turnos activos)  | R. Calcatelli | 5 h |
| T4-3 | TurnoService.reservar (validación morosidad + call DB con EXCLUDE GIST)   | R. Calcatelli | 5 h |
| T4-4 | TurnoService.cancelar (regla 24 h, CANCELADO_EN_TIEMPO / CANCELADO_TARDE) | R. Calcatelli | 4 h |
| T4-5 | TurnoService.completar / marcarAusencia (PROFESIONAL / ADMIN)             | R. Calcatelli | 2 h |
| T4-6 | TurnoController: todos los endpoints                                      | R. Calcatelli | 3 h |
| T4-7 | ExcepcionMorosidadService + endpoint (ADMIN)                              | R. Calcatelli | 2 h |
| T4-8 | Pantalla Reserva de turno (W-02, SOCIO_PACIENTE)                         | P. Basualdo Arcati | 6 h |
| T4-9 | Pantalla Agenda profesional (W-03, PROFESIONAL)                          | P. Basualdo Arcati | 5 h |
| T4-10 | Pantalla Mis turnos (lista + botón cancelar, SOCIO_PACIENTE)             | P. Basualdo Arcati | 4 h |
| T4-11 | Tests: solapamiento, 24 h, morosidad, permiso de cancelación             | Ambos         | 4 h |
| T4-12 | TurnoService.reservarGym (grilla fija 60 min, un turno por persona y día, cupo por franja — reglas de `db/migration/V2__reglas_gimnasio.sql`) | R. Calcatelli | 4 h |
| T4-13 | GET /api/turnos/disponibles con cupo restante por franja de gym (ocupados / `cupo_por_franja`) | R. Calcatelli | 2 h |
| T4-14 | PATCH /api/turnos/{id}/completado — el ADMIN marca el check-in del turno de gimnasio | R. Calcatelli | 2 h |
| T4-15 | Job de pasaje automático a `AUSENTE` al cerrar la franja de gym, con mitigación de cold-start de Render (ver RG-14) | R. Calcatelli | 3 h |
| T4-16 | Tests de gimnasio: grilla, cupo, un turno por día, check-in, liberación de cupo al cancelar (PI-30 a PI-36) | Ambos | 3 h |

**Criterio de cierre:** la BD rechaza solapamientos por EXCLUDE; el servicio aplica la regla de 24 h; AUSENTE y COMPLETADO solo los puede marcar el profesional (consultorio) o el ADMIN vía check-in (gimnasio); la reserva de gym respeta grilla y cupo por franja, y cancelar libera el cupo.

---

## Sprint 5 — Pagos y Notificaciones (26/10 – 08/11)

**Objetivo:** registro de pagos, estado de cuenta y envío de emails automáticos.

| ID   | Tarea                                                                      | Responsable        | Estimación |
|------|----------------------------------------------------------------------------|--------------------|------------|
| T5-1 | Entidad JPA: Pago, ConceptoPago (ENUM), validación concepto excluyente    | P. Basualdo Arcati | 3 h |
| T5-2 | PagoService.registrar (CUOTA_MENSUAL y SESION_CONSULTORIO)               | P. Basualdo Arcati | 4 h |
| T5-3 | PagoService.calcularMorosidad (RN-01)                                    | P. Basualdo Arcati | 3 h |
| T5-4 | PagoController: GET estado de cuenta, POST registrar pago                | P. Basualdo Arcati | 3 h |
| T5-5 | Pantalla Estado de cuenta (W-04, SOCIO_PACIENTE y ADMIN)                 | P. Basualdo Arcati | 5 h |
| T5-6 | Integración proveedor email (Resend o SendGrid, tier gratuito)           | R. Calcatelli      | 3 h |
| T5-7 | NotificacionService (confirmación reserva, aviso cancelación)            | R. Calcatelli      | 3 h |
| T5-8 | Tarea programada @Scheduled: recordatorio 24 h antes de cada turno       | R. Calcatelli      | 3 h |
| T5-9 | Entidad Notificacion + log de envíos (historial para ADMIN)              | R. Calcatelli      | 2 h |
| T5-10 | Tests: unicidad de cuota, pago por turno, disparo de emails              | Ambos              | 3 h |

**Criterio de cierre:** ADMIN registra cuota y sesión; el sistema detecta morosidad; se envían emails de confirmación y cancelación.

---

## Cierre (09/11 – 14/11)

| Tarea                                                                  | Responsable | Estimación |
|------------------------------------------------------------------------|-------------|------------|
| Smoke test completo en producción (todos los flujos por rol)           | Ambos       | 4 h |
| Revisión y compleción del informe final                                | Ambos       | 8 h |
| Grabación del video de presentación (demo de los 6 módulos)           | Ambos       | 3 h |
| Activación de Supabase y Render antes de la entrega                   | R. Calcatelli | 1 h |
| Preparación de la defensa oral (preguntas esperadas, distribución)    | Ambos       | 4 h |

**Entrega final:** 14/11/2026.
