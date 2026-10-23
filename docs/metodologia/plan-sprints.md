# Plan de Sprints — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia  
> Metodología: Modelo Incremental con marco Scrum (sprints de 2 semanas)

---

## Resumen del plan

| Sprint   | Período            | Módulo/s                                     | Resp. primario          | Estado  |
|----------|--------------------|----------------------------------------------|-------------------------|---------|
| Sprint 1 | 31/08 – 13/09/2026 | Infraestructura + DDL + Setup inicial         | R. Calcatelli           | ✅ Completado |
| Sprint 2 | 14/09 – 27/09/2026 | Autenticación y roles (JWT)                  | P. Basualdo Arcati      | ✅ Completado |
| Sprint 3 | 28/09 – 11/10/2026 | Módulo Personas + Módulo Profesionales       | Ambos                   | ✅ Completado (T3-11 cerrada en el Sprint 5) |
| Sprint 4 | 12/10 – 25/10/2026 | Módulo Turnos                                | Ambos                   | ✅ Completado |
| Sprint 5 | 26/10 – 08/11/2026 | Módulo Pagos + Módulo Notificaciones         | Ambos                   | ✅ Completado (Pagos, avisos de turnos y avisos de deuda) |
| Cierre   | 09/11 – 14/11/2026 | Estabilización · Informe · Video · Defensa   | Ambos                   | ⏳ Pendiente |

> **Estado verificado el 22/10/2026** contra `main` (PR #24) y el CI en verde. Las fechas de los
> sprints no cambian; la columna Estado y las tablas "Estado real" de cada sprint reflejan lo que
> efectivamente está mergeado. El detalle por tarea está debajo de cada sprint.

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

**Estado real (verificado 22/10/2026):** completado. La cadena que quedaba pendiente al 27/09 (T1-4, T1-8 y T1-9) se cerró con el despliegue: el proyecto de Supabase existe y el backend aplica las migraciones con Flyway al arrancar (V1 a V13), así que "ejecutar el DDL" dejó de ser un paso manual. El seed se verifica en el CI con `SeedIT`, que lo carga en una base recién migrada.

| ID | Estado | Evidencia |
|----|--------|-----------|
| T1-1 a T1-3 | ✅ | Repositorio, `backend/` y `frontend/` |
| T1-4 | ✅ | Proyecto Supabase en uso por el backend de Render |
| T1-5 | ✅ | Conexión por variables de entorno (`render.yaml`, `application-prod.properties`) |
| T1-6, T1-7 | ✅ | `render.yaml`, `frontend/vercel.json`, sección "Cold start" del README |
| T1-8 | ✅ | Migraciones `db/migration/V1` a `V14`, aplicadas por Flyway |
| T1-9 | ✅ | `db/dml/seed.sql` con fechas relativas a la carga; `SeedIT` verifica cada caso de prueba |

**Entregable:** URL pública del frontend y del backend respondiendo el health-check, con la base de datos en Supabase.

**Criterio de cierre del sprint:** `GET /api/health` devuelve `200 OK` desde la URL de Render. Cumplido.

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

**Estado real (verificado 22/10/2026):**

| ID | Estado | Evidencia |
|----|--------|-----------|
| T3-1 a T3-4 | ✅ | `Persona`, `PersonaService`, `PersonaController` y pantalla W-05 (PR #17) |
| T3-5 a T3-8 | ✅ | `Profesional`, `DisponibilidadProfesional`, `ProfesionalService`, `DisponibilidadService`, `CascadaDisponibilidadService` (RN-24, RN-25) y migración V13 (PR #20) |
| T3-9 | ✅ | Pantallas de Profesionales y Disponibilidad (PR #20) |
| T3-10 | ✅ | `PersonaIT` (PI-61 a PI-70), `DisponibilidadIT`, `ProfesionalIT`, `CascadaDisponibilidadIT`, `CascadaEmailFallidoIT`, `MigracionV13IT` |
| T3-11 | ✅ | `POST /api/personas/vincular` (RF-31) y opción "Vincular usuario existente" en W-05; `PersonaVinculoIT` (PI-19 a PI-21). Quedó sin hacer en el Sprint 3 y se cerró en el Sprint 5 (issue #26) |

Además del alcance original se incorporó el envío de emails por Brevo (API HTTP) con un reintento y alerta al ADMIN, que el plan ubicaba en T5-6/T5-9: la cancelación en cascada de RN-24 necesita avisar a los pacientes y no podía esperar al Sprint 5. El proveedor es Brevo y no Resend/SendGrid (ver `docs/02-diseno/modulos.md`, Módulo 6).

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
| T4-13 | GET /api/turnos/gym/cupo con cupo restante por franja de gym (ocupados / `cupo_por_franja`) | R. Calcatelli | 2 h |
| T4-14 | PATCH /api/turnos/{id}/completado — el ADMIN marca el check-in del turno de gimnasio | R. Calcatelli | 2 h |
| T4-15 | Job de pasaje automático a `AUSENTE` al cerrar la franja de gym, con mitigación de cold-start de Render (ver RG-14) | R. Calcatelli | 3 h |
| T4-16 | Tests de gimnasio: grilla, cupo, un turno por día, check-in, liberación de cupo al cancelar (PI-30 a PI-36 y PI-84 a PI-87) | Ambos | 3 h |

**Estado real (verificado 22/10/2026):** completado.

| ID | Estado | Evidencia |
|----|--------|-----------|
| T4-1 a T4-7 | ✅ | `Turno`, `ExcepcionMorosidad`, `MorosidadService`, `TurnoService`, `TurnoController`, `ExcepcionMorosidadController` (PR #18 gimnasio, PR #21 consultorio). La reserva de consultorio toma el lock de fila del profesional, el mismo que la cascada de RN-24 |
| T4-8 | ✅ | Reserva en dos pantallas: gimnasio (`/socio/reservar-gimnasio`, W-08), que consulta antes `GET /api/turnos/gym/estado`, y consultorio (`/socio/reservar-consultorio`, W-02) (PR #24) |
| T4-9 | ✅ | Agenda del profesional (`/profesional/agenda`, W-03), de hoy a siete días, con nombre y DNI del paciente (PR #24) |
| T4-10 | ✅ | Mis turnos (`/socio/turnos`) con cancelación y motivo obligatorio (PR #24) |
| T4-11 | ✅ | `TurnoServiceTest`, `TurnoTest`, `MorosidadServiceTest`, `TurnoGymIT`, `TurnoConsultorioIT` (PI-07 a PI-12, PI-88 a PI-90) y `TurnoFranjaIniciadaIT` (PI-13 y PI-15) |
| T4-12 a T4-16 | ✅ | Reserva y cupo de gimnasio, check-in del ADMIN y `JobAusentesGym` (PI-30 a PI-36 y PI-84 a PI-87) |

**Criterio de cierre:** la BD rechaza solapamientos por EXCLUDE; el servicio aplica la regla de 24 h; AUSENTE y COMPLETADO solo los puede marcar el profesional (consultorio) o el ADMIN vía check-in (gimnasio); la reserva de gym respeta grilla y cupo por franja, y cancelar libera el cupo.

---

## Sprint 5 — Pagos y Notificaciones (26/10 – 08/11)

**Objetivo:** registro de pagos, estado de cuenta y envío de emails automáticos.

| ID   | Tarea                                                                      | Responsable        | Estimación |
|------|----------------------------------------------------------------------------|--------------------|------------|
| T5-1 | Entidad JPA: Pago, ConceptoPago (ENUM), validación concepto excluyente    | P. Basualdo Arcati | 3 h |
| T5-2 | PagoService.registrar (CUOTA_MENSUAL y SESION_CONSULTORIO)               | P. Basualdo Arcati | 4 h |
| T5-3 | MorosidadService: cálculo de RN-01 compartido con el estado de cuenta     | P. Basualdo Arcati | 3 h |
| T5-4 | PagoController: POST registrar pago, GET estado de cuenta (admin y propio) | P. Basualdo Arcati | 3 h |
| T5-5 | Pantallas de pagos: estado de cuenta del socio (W-04) y Pagos / Registrar pago del ADMIN | P. Basualdo Arcati | 5 h |
| T5-6 | Integración proveedor email (tier gratuito; se eligió Brevo)             | R. Calcatelli      | 3 h |
| T5-7 | NotificacionService (confirmación reserva, aviso cancelación)            | R. Calcatelli      | 3 h |
| T5-8 | Tarea programada @Scheduled: recordatorio 24 h antes de cada turno       | R. Calcatelli      | 3 h |
| T5-9 | Entidad Notificacion + log de envíos (historial para ADMIN)              | R. Calcatelli      | 2 h |
| T5-10 | Tests: unicidad de cuota, pago por turno, medio de pago y estado de cuenta (el disparo de emails queda diferido) | Ambos              | 3 h |

**Criterio de cierre:** ADMIN registra cuota y sesión; el sistema detecta morosidad; se envían emails de confirmación y cancelación.

**Estado real (verificado 22/10/2026):** el sprint no empezó formalmente, pero el Módulo de Pagos ya está implementado y parte de las notificaciones se adelantó en los sprints 3 y 4. Mercado Pago queda fuera del alcance (RFC-001): los cobros se cargan a mano con su medio, y `medio_pago` admite sumar `MERCADO_PAGO` con una migración propia.

| ID | Estado | Evidencia |
|----|--------|-----------|
| T5-1, T5-2, T5-4 | ✅ | `Pago`, `ConceptoPago`, `MedioPago` (V14), `PagoService.registrar` y `PagoController` (`POST /api/pagos`, `GET /api/pagos/persona/{id}/estado-cuenta`, `GET /api/pagos/mi-estado-cuenta`). Los listados `GET /api/pagos` y `GET /api/pagos/{id}` quedan diferidos |
| T5-5 | ✅ | Estado de cuenta del socio (`/socio/estado-cuenta`) y Pagos del ADMIN con el modal de registro (`/admin/pagos`); PU-13 a PU-30 |
| T5-3 | ✅ | El cálculo de RN-01 vive en `MorosidadService` (PU-01 a PU-12) y lo comparten la reserva de gimnasio y el estado de cuenta (PI-103), con 10 días de gracia |
| T5-6 | ✅ | Brevo por API HTTP detrás de `NotificadorEmail` (PR #20) |
| T5-7 | ✅ | `AvisosTurnoService`: confirmación al reservar (gimnasio y consultorio) y aviso al cancelar, además del aviso de la cascada (RN-24) |
| T5-8 | ✅ | `JobRecordatorios`, cada hora: un recordatorio por turno, marcado por la fila de `notificaciones` para no duplicar |
| T5-9 | ✅ | Entidad `Notificacion`, reintento y alertas en "Hoy en el centro" (PR #20) |
| Panel ADMIN | ✅ | Fuera del plan original, pedido en la devolución del 22/10: "Hoy en el centro" pasa a ser la pantalla de inicio del ADMIN, con `GET /api/admin/resumen-hoy` (indicadores, ocupación del gimnasio, socios con impagos; PI-108) |
| T5-10 | ✅ | `PagoControllerIT` (PI-76 a PI-80 y PI-91 a PI-104) cubre unicidad de cuota, pago por turno, medio de pago y estado de cuenta; `AvisosTurnoIT` (PI-105 a PI-107) y `AvisosDeudaIT` (PI-109 a PI-111), con sus unitarios, cubren el disparo de los avisos |
| RF-37 | ✅ | Avisos de deuda y de suspensión: `AvisosDeudaService` y `JobAvisosDeuda` (diario), un aviso por período impago marcado en `notificaciones.periodo` (V15) |

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
