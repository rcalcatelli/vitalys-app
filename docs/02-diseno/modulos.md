# Módulos del Sistema — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati  
> Tutora: Sofía Raia

---

## Resumen de módulos

| # | Módulo | Descripción breve |
|---|--------|-------------------|
| 1 | Autenticación y Roles | Registro, login y control de acceso por rol |
| 2 | Gestión de Personas | Alta, baja lógica, modificación y consulta de socios/pacientes |
| 3 | Gestión de Profesionales | ABM de profesionales y su disponibilidad horaria |
| 4 | Agenda de Turnos | Reserva, consulta y cancelación de turnos de consultorio y de gimnasio, con reglas de negocio propias de cada uno |
| 4b | Excepciones de Morosidad | El ADMIN autoriza excepciones puntuales al bloqueo por deuda en gym |
| 5 | Registro de Pagos | Carga de cuotas de gym y sesiones de consultorio |
| 6 | Notificaciones | Envío de confirmaciones y recordatorios por email |

---

## Módulo 1 — Autenticación y Roles

**Descripción:** Gestiona el acceso seguro al sistema mediante JWT. Define tres roles con permisos diferenciados.

**Roles del sistema:**

| Rol | Descripción |
|-----|-------------|
| `SOCIO_PACIENTE` | Accede a su perfil, reserva/cancela sus propios turnos, consulta su estado de cuenta |
| `PROFESIONAL` | Visualiza su propia agenda y datos de contacto de sus pacientes; gestiona su disponibilidad |
| `ADMIN` | Acceso completo: gestiona personas, profesionales, turnos y pagos en nombre de terceros |

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/auth/registro` | Registro de nuevo usuario. El rol se fuerza siempre a `SOCIO_PACIENTE`; no es un input del cliente. Si el body incluye `rol`, responde 400 antes de crear el usuario (RF-01) | Público |
| POST | `/api/auth/login` | Login; retorna token JWT | Público |
| POST | `/api/auth/logout` | Invalida sesión | Autenticado |
| GET  | `/api/auth/me` | Datos del usuario autenticado | Autenticado |

**Entidades involucradas:** `usuarios`

> **Nota:** `GET /api/health` no pertenece a este módulo de negocio — es un endpoint técnico de infraestructura (usado por el `HEALTHCHECK` de Docker, ver `docs/03-despliegue/entorno-local-docker.md`) que no depende de la base de datos ni requiere autenticación.

---

## Módulo 2 — Gestión de Personas

**Descripción:** Mantenimiento del registro unificado de socios y pacientes. Una sola identidad por persona real, independientemente de si usa el gym, los consultorios, o ambos.

**Regla de negocio clave:** Las bajas son lógicas (`estado = INACTIVO`); nunca se elimina físicamente un registro para preservar el historial de turnos y pagos.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/personas` | Listar personas (filtros: estado, nombre, DNI) | ADMIN |
| POST   | `/api/personas` | Crear nueva persona (alta presencial: usuario + persona en una operación, RF-05) | ADMIN |
| POST   | `/api/personas/vincular` | Vincular una persona nueva a un `usuario` existente, buscándolo por email; sin contraseña (RF-31) | ADMIN |
| GET    | `/api/personas/{id}` | Obtener datos de una persona | ADMIN, propia persona |
| PUT    | `/api/personas/{id}` | Actualizar datos | ADMIN |
| PATCH  | `/api/personas/{id}/baja` | Baja lógica (estado → INACTIVO) | ADMIN |
| PATCH  | `/api/personas/{id}/reactivar` | Reactivar persona inactiva | ADMIN |

**Entidades involucradas:** `personas`, `usuarios`

---

## Módulo 3 — Gestión de Profesionales

**Descripción:** ABM de los profesionales del centro y administración de sus franjas horarias de atención.

**Regla de negocio clave:** La duración del turno se inicializa por especialidad (Nutrición: 30 min, Psicología: 50 min, Kinesiología: 45 min) y puede ajustarse por profesional. La disponibilidad puede ser modificada por el propio profesional o por un administrador.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/profesionales` | Listar profesionales activos | Autenticado |
| POST   | `/api/profesionales` | Registrar nuevo profesional: crea `usuario` (rol `PROFESIONAL`) y `profesional` en una sola operación. No existe endpoint de vínculo para profesionales (Decisión de dominio 8, RFC-0001) | ADMIN |
| GET    | `/api/profesionales/{id}` | Datos de un profesional | Autenticado |
| PUT    | `/api/profesionales/{id}` | Modificar datos | ADMIN |
| PATCH  | `/api/profesionales/{id}/desactivar` | Baja lógica | ADMIN |
| GET    | `/api/profesionales/{id}/disponibilidad` | Ver franjas horarias | Autenticado |
| POST   | `/api/profesionales/{id}/disponibilidad` | Agregar franja | ADMIN, PROFESIONAL (propio) |
| PUT    | `/api/profesionales/{id}/disponibilidad/{dId}` | Modificar franja | ADMIN, PROFESIONAL (propio) |
| DELETE | `/api/profesionales/{id}/disponibilidad/{dId}` | Eliminar franja | ADMIN, PROFESIONAL (propio) |

**Entidades involucradas:** `profesionales`, `usuarios`, `disponibilidad_profesional`

---

## Módulo 4 — Agenda de Turnos

**Descripción:** Gestión completa del ciclo de vida de un turno. El módulo cubre dos tipos de turno con reglas propias, distinguidos por `tipo_turno`:

- **CONSULTORIO:** turno con un profesional asignado (Nutrición, Psicología, Kinesiología), dentro de su franja de disponibilidad.
- **GYM:** turno de gimnasio, sin profesional asignado, dentro de una grilla horaria fija y con cupo por franja.

### Turnos de CONSULTORIO

**Reglas de negocio clave:**
- **Sin solapamientos:** un profesional no puede tener dos turnos activos en el mismo horario. La restricción se garantiza con un `EXCLUDE USING GIST` en la base de datos, y bloquea contra cualquier turno `RESERVADO`, `CANCELADO_TARDE`, `AUSENTE` o `COMPLETADO` de ese profesional (el único estado que libera el slot es `CANCELADO_EN_TIEMPO`).
- **Cancelación en tiempo:** aviso con ≥ 24 horas antes del inicio → estado `CANCELADO_EN_TIEMPO`, el slot queda libre.
- **Cancelación tarde:** aviso con < 24 horas → estado `CANCELADO_TARDE`, el slot no se libera.
- **Completado / Ausente:** los marca el **PROFESIONAL** asignado al turno (o un ADMIN), a mano, desde su agenda.

### Turnos de GYM

**Descripción:** el socio reserva una franja horaria del gimnasio en sí, no con un profesional puntual. Las reglas de grilla y cupo están implementadas a nivel de motor (`db/migration/V2__reglas_gimnasio.sql`), no solo en la capa de servicio:

- **Grilla horaria:** franjas de 60 minutos en punto. Lunes a viernes de 07:00 a 21:00, sábados de 09:00 a 12:00. Domingo cerrado (no se puede reservar).
- **Cupo por franja:** cada franja tiene un máximo de personas configurable (tabla `configuracion_gym`, columna `cupo_por_franja`); una reserva que superaría el cupo es rechazada.
- **Un turno por persona por día:** un socio no puede tener más de un turno de gym activo el mismo día (índice único parcial sobre `turnos`).
- **Solo socios de gym activos:** reserva quien tiene `es_socio_gym = TRUE` y `estado = 'ACTIVO'` en `personas`.
- **Cancelación:** aviso con ≥ 2 horas antes del inicio → `CANCELADO_EN_TIEMPO` (contra las 24 horas de consultorio); con menos anticipación → `CANCELADO_TARDE`.

**Reglas de negocio comunes a ambos tipos:**
- **Deuda en gym:** un socio con cuota mensual vencida hace más de 10 días no puede reservar turnos de gym (RN-01). Los turnos de consultorio no se ven afectados. El ADMIN puede levantar esta restricción puntualmente con una excepción de morosidad (ver más abajo).
- **Trazabilidad:** todo turno cancelado registra `cancelado_en`, `cancelado_por_usuario` y `motivo_cancelacion`.

**Completado y ausente — asimetría entre CONSULTORIO y GYM (RF-22, RF-34, RF-35):**

En CONSULTORIO el turno tiene un profesional a cargo, y es quien lo marca `COMPLETADO` o `AUSENTE` desde su agenda (o un ADMIN, en su nombre). Un turno de GYM **no tiene profesional asignado**, así que ese circuito no aplica: no hay quién lo cierre "desde la agenda de un profesional". En su lugar:

- El **ADMIN** marca el turno como `COMPLETADO` en el momento del check-in de la persona en el gimnasio.
- Si la franja termina y no hubo check-in, el sistema marca el turno como `AUSENTE` automáticamente (sin intervención humana).

Esta diferencia no es un accidente de implementación: es consecuencia directa de que GYM no tiene profesional, y por eso se documenta acá en vez de forzar el mismo flujo para los dos tipos de turno.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/turnos/disponibles` | Slots libres de consultorio por profesional y fecha | Autenticado |
| GET    | `/api/turnos/gym/cupo` | Cupo disponible de gimnasio por franja y fecha (total, ocupados, disponibles) | Autenticado |
| GET    | `/api/turnos` | Listar turnos (filtros: persona, profesional, tipo, estado, fecha) | ADMIN |
| GET    | `/api/turnos/mis-turnos` | Turnos propios del usuario autenticado (consultorio y gym) | SOCIO_PACIENTE |
| GET    | `/api/turnos/mi-agenda` | Agenda del profesional autenticado (solo turnos de CONSULTORIO) | PROFESIONAL |
| POST   | `/api/turnos` | Reservar turno de consultorio | SOCIO_PACIENTE, ADMIN |
| POST   | `/api/turnos/gym` | Reservar turno de gimnasio | SOCIO_PACIENTE, ADMIN |
| PATCH  | `/api/turnos/{id}/cancelar` | Cancelar turno (24h en consultorio, 2h en gym) | SOCIO_PACIENTE, ADMIN |
| PATCH  | `/api/turnos/{id}/completado` | Marcar turno como completado (consultorio: PROFESIONAL propio; gym: check-in por ADMIN) | PROFESIONAL (propio, consultorio), ADMIN |
| PATCH  | `/api/turnos/{id}/ausente` | Marcar turno como ausente | PROFESIONAL (propio, consultorio), ADMIN |
| GET    | `/api/turnos/{id}` | Detalle de un turno | ADMIN, partes involucradas |

**Entidades involucradas:** `turnos`, `personas`, `profesionales`, `disponibilidad_profesional`, `configuracion_gym`, `pagos` (consulta de deuda), `excepciones_morosidad`

---

## Módulo 4b — Excepciones de Morosidad

**Descripción:** Permite al ADMIN levantar puntualmente el bloqueo por morosidad (RN-01) para un socio determinado, sin desactivar la regla en general. Cubre RF-30 y RN-09.

**Regla de negocio clave:** la excepción se registra en `excepciones_morosidad` con el socio beneficiado, quién la autorizó, el motivo y una fecha de vencimiento (`valida_hasta`). Puede ser puntual (asociada a un `turno_id` concreto) o por período (válida para cualquier turno de gym hasta `valida_hasta`, si `turno_id` es `NULL`). La validación de RN-01 y la consulta de excepción vigente se resuelven en la capa de servicio, no en el motor de base de datos.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST   | `/api/excepciones-morosidad` | Registrar una excepción para un socio moroso | ADMIN |
| GET    | `/api/excepciones-morosidad/persona/{id}` | Listar excepciones (vigentes e históricas) de una persona | ADMIN |

**Entidades involucradas:** `excepciones_morosidad`, `personas`, `usuarios`, `turnos`

---

## Módulo 5 — Registro de Pagos

**Descripción:** Registro y consulta de pagos. Maneja dos conceptos diferenciados: cuotas mensuales de gimnasio y sesiones de consultorio.

**Reglas de negocio clave:**
- Pago único y completo por operación (sin parciales en MVP).
- Cada pago tiene trazabilidad completa: persona, concepto, monto, fecha y operador (si lo cargó un admin).
- Para cuotas de gym: se asocia al mes (`periodo`). Para sesiones: se asocia al turno (`turno_id`).
- El sistema expone el estado de cuenta de una persona: cuotas pagas/vencidas, sesiones abonadas.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST   | `/api/pagos` | Registrar pago (cuota o sesión) | ADMIN |
| GET    | `/api/pagos` | Listar pagos (filtros: persona, concepto, fechas) | ADMIN |
| GET    | `/api/pagos/persona/{id}` | Historial de pagos de una persona | ADMIN, propia persona |
| GET    | `/api/pagos/persona/{id}/estado-cuenta` | Resumen: cuotas al día, sesiones pagas | ADMIN, propia persona |
| GET    | `/api/pagos/{id}` | Detalle de un pago | ADMIN |

**Entidades involucradas:** `pagos`, `personas`, `turnos`, `usuarios`

---

## Módulo 6 — Notificaciones

**Descripción:** Envío automático de emails ante eventos clave del sistema. Los envíos quedan registrados para auditoría.

**Eventos que generan notificación:**

| Evento | Tipo | Destinatario |
|--------|------|-------------|
| Turno reservado | `CONFIRMACION_TURNO` | Persona |
| Turno cancelado (por cualquier actor) | `AVISO_CANCELACION` | Persona |
| Recordatorio previo al turno (24h antes) | `RECORDATORIO` | Persona |

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/notificaciones/persona/{id}` | Historial de notificaciones de una persona | ADMIN |

> **Nota:** El envío es asíncrono (tarea programada o evento interno). El módulo expone únicamente el historial de logs.

**Entidades involucradas:** `notificaciones`, `personas`, `turnos`

---

## Dependencias entre módulos

```
Módulo 1 (Auth)
    └── es prerrequisito de todos los demás

Módulo 2 (Personas)
    └── prerrequisito de Módulos 4, 5 y 6

Módulo 3 (Profesionales)
    └── prerrequisito de Módulo 4

Módulo 4 (Turnos)
    ├── depende de Módulos 2, 3
    ├── depende de Módulo 4b para levantar el bloqueo por morosidad en gym
    └── alimenta a Módulos 5 y 6

Módulo 4b (Excepciones de Morosidad)
    ├── depende de Módulo 2 (persona beneficiada)
    └── condiciona la regla de morosidad del Módulo 4 (RN-01) sin desactivarla

Módulo 5 (Pagos)
    ├── depende de Módulos 2, 4
    └── condiciona lógica de reserva en Módulo 4

Módulo 6 (Notificaciones)
    └── depende de Módulos 2, 4
```
