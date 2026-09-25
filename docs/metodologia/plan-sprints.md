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
| Sprint 3 | 28/09 – 11/10/2026 | Módulo Personas + Módulo Profesionales       | Ambos                   | 🔄 En curso |
| Sprint 4 | 12/10 – 25/10/2026 | Módulo Turnos                                | R. Calcatelli           | ⏳ Pendiente |
| Sprint 5 | 26/10 – 08/11/2026 | Módulo Pagos + Módulo Notificaciones         | P. Basualdo Arcati      | ⏳ Pendiente |
| Cierre   | 09/11 – 14/11/2026 | Estabilización · Informe · Video · Defensa   | Ambos                   | ⏳ Pendiente |

---

## Sprint 1 — Infraestructura y base de datos (31/08 – 13/09)

**Objetivo:** dejar el entorno de desarrollo y la base de datos funcionales y desplegados.

**Tareas:**

| ID  | Tarea                                                       | Responsable    | Estimación |
|-----|-------------------------------------------------------------|----------------|------------|
| T1-1 | Crear repositorio GitHub, configurar ramas (main, dev, feat/*) | R. Calcatelli | 2 h |
| T1-2 | Inicializar proyecto Spring Boot (Java 17, Spring Data JPA, Security) | R. Calcatelli | 3 h |
| T1-3 | Inicializar proyecto React + TypeScript + Vite             | P. Basualdo Arcati | 2 h |
| T1-4 | Crear proyecto Supabase y ejecutar DDL v1                  | R. Calcatelli  | 2 h |
| T1-5 | Configurar conexión JDBC hacia Supabase (application.properties) | R. Calcatelli | 1 h |
| T1-6 | Desplegar backend vacío en Render y frontend en Vercel     | P. Basualdo Arcati | 3 h |
| T1-7 | Documentar arranque en frío de Render en README            | P. Basualdo Arcati | 1 h |
| T1-8 | Ejecutar DDL v2 (con todas las correcciones de la 2.ª entrega) | R. Calcatelli | 1 h |
| T1-9 | Ejecutar seed.sql y verificar constraints                  | Ambos          | 2 h |

**Entregable:** URL pública del frontend y backend respondiendo health-check. Base de datos con esquema y datos de prueba.

**Criterio de cierre del sprint:** `GET /api/health` devuelve `200 OK` desde la URL de Render.

---

## Sprint 2 — Autenticación y roles (14/09 – 27/09)

**Objetivo:** registro, login y JWT funcionando; endpoints protegidos por rol.  
**Entrega de cátedra:** 27/09 — esquema de BD y listado de módulos (✅ presentado).

| ID   | Tarea                                                               | Responsable        | Estimación |
|------|---------------------------------------------------------------------|--------------------|------------|
| T2-1 | Entidad Usuario + UserDetailsService (Spring Security)              | P. Basualdo Arcati | 4 h |
| T2-2 | Endpoint POST /api/auth/register (hash bcrypt)                     | P. Basualdo Arcati | 3 h |
| T2-3 | Endpoint POST /api/auth/login → JWT                                | P. Basualdo Arcati | 3 h |
| T2-4 | Filtro JWT + SecurityFilterChain con roles                         | P. Basualdo Arcati | 4 h |
| T2-5 | Endpoint GET /api/auth/me (datos del usuario autenticado)          | P. Basualdo Arcati | 1 h |
| T2-6 | Pantalla Login (React, W-01)                                       | R. Calcatelli      | 4 h |
| T2-7 | Contexto de auth en frontend (token en localStorage, guard por rol)| R. Calcatelli      | 3 h |
| T2-8 | Tests de integración: registro, login, acceso sin token, CORS      | Ambos              | 3 h |

**Criterio de cierre:** login devuelve JWT, rutas sin token devuelven 401, rutas con rol incorrecto devuelven 403.

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

**Criterio de cierre:** ADMIN puede crear, editar y dar de baja personas; el trigger rechaza disponibilidades superpuestas.

---

## Sprint 4 — Agenda de Turnos (12/10 – 25/10)

**Objetivo:** reserva, cancelación y ciclo de vida completo de turnos.

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

**Criterio de cierre:** la BD rechaza solapamientos por EXCLUDE; el servicio aplica la regla de 24 h; AUSENTE y COMPLETADO solo los puede marcar el profesional.

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
