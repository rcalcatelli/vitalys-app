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

> **Swagger / OpenAPI:** este documento describe el diseño completo de los seis módulos, incluyendo endpoints todavía no implementados. La documentación interactiva de Swagger UI (`/swagger-ui/index.html`, ver README) solo cubre los endpoints que **ya existen como controller** en el código — hoy, únicamente los del Módulo 1 (`/api/auth/registro`, `/api/auth/login`, `/api/auth/me`) más `/api/health`. Una cosa complementa a la otra, no la reemplaza.

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
| POST | `/api/auth/login` | Login; body `{identificador, contrasena}`. `identificador` acepta email o DNI (RF-36) — DNI solo resuelve si la persona ya tiene ficha en `personas`; retorna token JWT | Público |
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
- **Sin solapamientos:** un profesional no puede tener dos turnos activos en el mismo horario. La restricción se garantiza con un `EXCLUDE USING GIST` en la base de datos, y bloquea contra todo turno de ese profesional que **ocupe su lugar** según `fn_turno_ocupa_lugar`: `RESERVADO`, `AUSENTE`, `COMPLETADO`, y cualquier cancelación registrada a partir del inicio de la franja.
- **Cancelación en tiempo:** aviso con ≥ 24 horas antes del inicio → estado `CANCELADO_EN_TIEMPO`.
- **Cancelación tarde:** aviso con < 24 horas → estado `CANCELADO_TARDE`.
- **Liberación del slot:** la decide el momento de la cancelación, no el estado. Si `cancelado_en < inicio`, el slot queda libre y otra persona puede tomarlo — también cuando la cancelación fue tardía. Si la cancelación llega a partir del inicio (`cancelado_en >= inicio`), el slot permanece bloqueado, igual que con `AUSENTE` (RN-02, RN-03, RN-08).
- **Completado / Ausente:** los marca el **PROFESIONAL** asignado al turno (o un ADMIN), a mano, desde su agenda.

### Turnos de GYM

**Descripción:** el socio reserva una franja horaria del gimnasio en sí, no con un profesional puntual. Las reglas de grilla y cupo están implementadas a nivel de motor (`db/migration/V2__reglas_gimnasio.sql`), no solo en la capa de servicio:

- **Grilla horaria:** franjas de 60 minutos en punto, dentro del horario de apertura y terminando a más tardar a la hora de cierre. Lunes a viernes de 07:00 a 21:00 — última franja **20:00–21:00**, 14 en total. Sábados de 09:00 a 12:00 — última franja **11:00–12:00**, 3 en total. Domingos y **feriados** el gimnasio no abre: no se ofrece ninguna franja.
- **Feriados:** se validan en el trigger `trg_turno_gym` contra la tabla `feriados`, no en el `CHECK` de la grilla — un `CHECK` no puede consultar otra tabla. El calendario **no se escribe a mano**: lo sincroniza un importador contra el dataset oficial del Ministerio del Interior publicado en `datos.gob.ar` (RF-38), porque los feriados trasladables se corren cada año y pueden declararse feriados por decreto. La reserva lee la tabla, nunca la API: una caída del servicio externo no puede impedir vender turnos. Los de tipo `NO_LABORABLE` (festividades religiosas de quien las profesa) **no** cierran el gimnasio. El ADMIN puede corregir filas o cargar cierres propios del centro con `origen = 'MANUAL'`. Declarar un feriado no cancela los turnos ya reservados para ese día.
- **Cupo por franja:** cada franja tiene un máximo de personas configurable (tabla `configuracion_gym`, columna `cupo_por_franja`); una reserva que superaría el cupo es rechazada.
- **Un turno por persona por día:** un socio no puede tener más de un turno de gym activo el mismo día (índice único parcial sobre `turnos`).
- **Solo socios de gym activos:** reserva quien tiene `es_socio_gym = TRUE` y `estado = 'ACTIVO'` en `personas`.
- **Cancelación:** aviso con ≥ 2 horas antes del inicio → `CANCELADO_EN_TIEMPO` (contra las 24 horas de consultorio); con menos anticipación → `CANCELADO_TARDE`. En ambos casos **el cupo se libera** si la cancelación llegó antes del inicio de la franja; solo queda bloqueado si se canceló con la franja ya empezada (RN-02).

**Reglas de negocio comunes a ambos tipos:**
- **Deuda en gym:** la deuda se calcula como la cantidad de períodos mensuales impagos acumulados desde `personas.fecha_inicio_membresia`, sin que un pago posterior compense un mes salteado (RN-01). Tener deuda **no bloquea por sí solo**: mientras el socio acumule menos períodos impagos que `configuracion_gym.meses_tolerancia_morosidad` (6 por defecto) conserva el acceso y solo se lo notifica. Al alcanzar el umbral queda **suspendido** y no puede reservar turnos de gym. Los turnos de consultorio no se ven afectados en ningún caso. El ADMIN puede levantar la suspensión puntualmente con una excepción de morosidad (ver más abajo).
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

**Regla de negocio clave:** la excepción se registra en `excepciones_morosidad` con el socio beneficiado, quién la autorizó, el motivo y una fecha de vencimiento (`valida_hasta`). Puede ser **de un solo uso** (`un_solo_uso = TRUE`: habilita una sola reserva y se agota al usarse) o **por período** (vale para cualquier turno de gym hasta `valida_hasta`).

**`turno_id` no se carga al dar de alta la excepción (RN-23).** La excepción sirve para *poder* reservar, así que cuando se la necesita el turno todavía no existe. La columna registra qué turno **consumió** la excepción y la completa el servicio después de crear el turno; la base impide que apunte al turno de otra persona (`trg_excepcion_morosidad`). Una excepción está vigente cuando:

```sql
valida_hasta >= CURRENT_DATE AND (NOT un_solo_uso OR turno_id IS NULL)
```

El cálculo de RN-01 y la evaluación de vigencia se resuelven en la capa de servicio —dependen de `NOW()`—; la pertenencia del turno, en el motor.

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
- **Un pago de sesión tiene que corresponderse con su turno (RN-20):** el turno debe ser de tipo `CONSULTORIO` —un turno de gimnasio no genera honorarios, del gimnasio se cobra la cuota— y el pago debe estar a nombre de la persona de ese turno. Lo hace cumplir el motor (`trg_pago_sesion`), no el servicio: son invariantes que no dependen de `NOW()` ni del actor, y una regla así validada solo en la API se rompe con cualquier carga por fuera de ella.
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
| Nuevo período mensual impago, por debajo del umbral | `AVISO_DEUDA` | Socio de gym |
| Se alcanza el umbral de tolerancia y el socio queda suspendido | `AVISO_SUSPENSION` | Socio de gym |

Los dos últimos cubren RF-37 y son los únicos que **no** se asocian a un turno (`turno_id` queda en `NULL`): notifican estado de cuenta, no un evento de agenda. Su disparador es el cálculo de RN-01, no una acción del usuario.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/notificaciones/persona/{id}` | Historial de notificaciones de una persona | ADMIN |

> **Nota:** El envío es asíncrono (tarea programada o evento interno). El módulo expone únicamente el historial de logs.

**Entidades involucradas:** `notificaciones`, `personas`, `turnos`, `pagos` (para el cálculo de RN-01 que dispara `AVISO_DEUDA` y `AVISO_SUSPENSION`)

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
