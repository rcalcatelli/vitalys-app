# Catálogo de Requerimientos — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

---

## 1. Requerimientos Funcionales (RF)

| ID | Módulo | Descripción |
|----|--------|-------------|
| RF-01 | Auth | El sistema permite registrar un nuevo usuario con email, contraseña y rol. |
| RF-02 | Auth | El sistema autentica usuarios mediante email y contraseña, y devuelve un token JWT. |
| RF-03 | Auth | El sistema permite cerrar sesión (invalidación del lado del cliente; el token expira por TTL). |
| RF-04 | Auth | El sistema expone un endpoint protegido que devuelve los datos del usuario autenticado. |
| RF-05 | Personas | El ADMIN puede registrar una nueva persona con nombre, apellido, DNI, email y contraseña. |
| RF-06 | Personas | El ADMIN puede listar personas con filtros por nombre, DNI y estado. |
| RF-07 | Personas | El ADMIN puede actualizar los datos de una persona. |
| RF-08 | Personas | El ADMIN puede dar de baja lógica a una persona (estado → INACTIVO, requiere fecha_baja). |
| RF-09 | Personas | El ADMIN puede reactivar una persona inactiva (estado → ACTIVO, fecha_baja → NULL). |
| RF-10 | Personas | Un SOCIO_PACIENTE puede consultar y editar sus propios datos de perfil. |
| RF-11 | Profesionales | El ADMIN puede registrar un nuevo profesional con especialidad y duración de turno. |
| RF-12 | Profesionales | El ADMIN puede listar y consultar profesionales activos. |
| RF-13 | Profesionales | El ADMIN puede modificar datos de un profesional y dar de baja lógica. |
| RF-14 | Profesionales | El ADMIN y el propio PROFESIONAL pueden gestionar las franjas horarias de disponibilidad. |
| RF-15 | Turnos | Un usuario autenticado puede consultar los slots disponibles de un profesional por fecha. |
| RF-16 | Turnos | Un SOCIO_PACIENTE o ADMIN puede reservar un turno de consultorio para una persona. |
| RF-17 | Turnos | Un SOCIO_PACIENTE o ADMIN puede reservar un turno de gimnasio para un socio. |
| RF-18 | Turnos | El sistema aplica la regla de morosidad al reservar un turno GYM (ver RN-01). |
| RF-19 | Turnos | Un SOCIO_PACIENTE puede cancelar sus propios turnos con registro de motivo. |
| RF-20 | Turnos | El sistema aplica automáticamente la regla de 24 h al cancelar (ver RN-02). |
| RF-21 | Turnos | Un ADMIN puede cancelar cualquier turno y marcar ausencias. |
| RF-22 | Turnos | El PROFESIONAL puede ver su agenda y marcar turnos como completados o como ausencia. |
| RF-23 | Pagos | El ADMIN puede registrar un pago de cuota mensual para un socio. |
| RF-24 | Pagos | El ADMIN puede registrar un pago de sesión de consultorio asociado a un turno. |
| RF-25 | Pagos | El ADMIN y el propio SOCIO_PACIENTE pueden consultar el historial de pagos y el estado de cuenta. |
| RF-26 | Notificaciones | El sistema envía un email de confirmación al reservar un turno. |
| RF-27 | Notificaciones | El sistema envía un email de aviso al cancelar un turno. |
| RF-28 | Notificaciones | El sistema envía un email de recordatorio 24 h antes de cada turno reservado. |
| RF-29 | Notificaciones | El ADMIN puede consultar el historial de notificaciones de una persona. |
| RF-30 | Morosidad | El ADMIN puede registrar una excepción puntual a la regla de morosidad para un socio. |

---

## 2. Requerimientos No Funcionales (RNF)

| ID | Categoría | Descripción |
|----|-----------|-------------|
| RNF-01 | Seguridad | Todas las contraseñas se almacenan como hash bcrypt; nunca en texto plano. |
| RNF-02 | Seguridad | Todos los endpoints (excepto registro y login) requieren token JWT válido. |
| RNF-03 | Seguridad | El control de acceso por rol se verifica en la capa de servicio; no solo en la presentación. |
| RNF-04 | Disponibilidad | La aplicación estará disponible en la web; frontend en Vercel, backend en Render (tier gratuito). |
| RNF-05 | Compatibilidad | La interfaz debe funcionar en los navegadores modernos (Chrome, Firefox, Safari) y ser responsive para tablet y desktop. |
| RNF-06 | Mantenibilidad | El código del backend sigue la arquitectura en capas: Controller → Service → Repository. |
| RNF-07 | Mantenibilidad | El esquema de base de datos se gestiona con scripts DDL versionados en el repositorio. |
| RNF-08 | Trazabilidad | Toda operación crítica (reserva, cancelación, pago, excepción) registra quién la ejecutó y cuándo. |
| RNF-09 | Integridad | Las reglas de integridad referencial y de unicidad se garantizan a nivel de motor de base de datos (PostgreSQL constraints y EXCLUDE). |
| RNF-10 | JWT | El cierre de sesión es del lado del cliente (el token se descarta en el frontend). El servidor no mantiene lista negra de tokens en el MVP. El TTL del token limita la ventana de riesgo. |

---

## 3. Reglas de Negocio (RN)

| ID | Descripción |
|----|-------------|
| RN-01 | **Morosidad en gym:** Un socio con membresía de gimnasio (`es_socio_gym = TRUE`) no puede reservar turnos de tipo GYM si tiene una cuota mensual vencida hace más de 10 días. Una cuota del período `P` (ej. 2026-09-01) vence el 1° del mes siguiente (2026-10-01). Está vencida hace más de 10 días si `NOW() > (P + 1 mes + 10 días)`. Los turnos de consultorio no se ven afectados. |
| RN-02 | **Cancelación con anticipación:** si el aviso llega con ≥ 24 h antes del inicio → estado `CANCELADO_EN_TIEMPO` (el slot queda libre). Si llega con < 24 h → estado `CANCELADO_TARDE` (el slot permanece bloqueado). En ambos casos se registran `cancelado_en`, `cancelado_por_usuario_id` y `motivo_cancelacion`. |
| RN-03 | **Solapamiento de turnos:** Un profesional no puede tener dos turnos activos en el mismo horario. Los estados que bloquean el horario son `RESERVADO` y `CANCELADO_TARDE`. La restricción se garantiza con un `EXCLUDE USING GIST` en la base de datos. |
| RN-04 | **Baja lógica:** las personas nunca se eliminan físicamente. La baja se registra con `estado = INACTIVO` y `fecha_baja`. El historial de turnos y pagos se preserva. |
| RN-05 | **Unicidad de cuota:** una persona puede tener a lo sumo una cuota mensual registrada por mes (`UNIQUE (persona_id, periodo)` parcial). |
| RN-06 | **Unicidad de pago por turno:** un turno puede tener a lo sumo un pago de tipo `SESION_CONSULTORIO` asociado (`UNIQUE (turno_id)` parcial). |
| RN-07 | **Concepto de pago excluyente:** `CUOTA_MENSUAL` requiere `periodo` (primer día del mes) y `turno_id = NULL`. `SESION_CONSULTORIO` requiere `turno_id` y `periodo = NULL`. |
| RN-08 | **Ausencia:** si el paciente no se presenta al turno, el profesional o el admin registra el estado `AUSENTE`. El slot se considera ocupado (no se libera). |
| RN-09 | **Excepción por morosidad:** el ADMIN puede autorizar una excepción puntual a RN-01 para un socio moroso. La excepción queda registrada en `excepciones_morosidad` con motivo, autorizador y fecha de vencimiento. |
| RN-10 | **Alta de personas:** el registro de usuario es público (RF-01), pero el alta en `personas` es exclusiva del ADMIN (RF-05). Un socio puede crear su cuenta de usuario pero no completar su ficha sin intervención del administrador. |
| RN-11 | **Disponibilidad del profesional:** las franjas horarias de un mismo profesional en el mismo día no pueden solaparse. El motor lo garantiza mediante un trigger (`trg_disponibilidad_no_overlap`). |
| RN-12 | **Franja de disponibilidad:** un turno solo puede reservarse dentro de la franja de disponibilidad activa del profesional. La validación se realiza en la capa de servicio. |

---

## 4. Historias de Usuario (HU)

---

### HU-01 — Registrarse en el sistema

**Como** visitante,  
**quiero** crear una cuenta con mi email y contraseña,  
**para** poder acceder al sistema como socio o paciente.

**Criterios de aceptación:**

- CA-01-1: El sistema acepta email único y contraseña de al menos 8 caracteres.
- CA-01-2: Si el email ya existe, el sistema devuelve error 409 con mensaje descriptivo.
- CA-01-3: La contraseña se almacena como hash; nunca en texto plano.
- CA-01-4: El rol asignado por defecto es `SOCIO_PACIENTE`.
- CA-01-5: Tras el registro exitoso, el sistema devuelve un token JWT listo para usar.
- CA-01-6: La ficha de persona queda pendiente de completar por el ADMIN (el usuario existe pero `personas` no tiene fila aún).

---

### HU-02 — Reservar un turno de consultorio

**Como** socio/paciente autenticado,  
**quiero** reservar un turno con un profesional en un horario disponible,  
**para** asegurar mi atención sin tener que llamar por teléfono.

**Criterios de aceptación:**

- CA-02-1: El sistema muestra únicamente slots dentro de la franja de disponibilidad del profesional y sin turno activo (RESERVADO o CANCELADO_TARDE) en ese horario.
- CA-02-2: Tras la reserva exitosa, el turno queda en estado `RESERVADO` y se envía email de confirmación.
- CA-02-3: Si el horario ya fue tomado entre la consulta y la reserva, el sistema devuelve error 409.
- CA-02-4: El campo `reservado_por_usuario_id` registra quién hizo la reserva (la propia persona o un ADMIN).
- CA-02-5: Un ADMIN puede reservar en nombre de cualquier persona; un SOCIO_PACIENTE solo para sí mismo.

---

### HU-03 — Cancelar un turno

**Como** socio/paciente autenticado,  
**quiero** cancelar un turno que ya reservé,  
**para** liberar el horario si no puedo asistir.

**Criterios de aceptación:**

- CA-03-1: Solo se pueden cancelar turnos en estado `RESERVADO`.
- CA-03-2: El sistema calcula automáticamente si el aviso llega con ≥ 24 h (CANCELADO_EN_TIEMPO) o < 24 h (CANCELADO_TARDE).
- CA-03-3: Se registran `cancelado_en`, `cancelado_por_usuario_id` y `motivo_cancelacion` (los tres obligatorios).
- CA-03-4: Se envía email de aviso de cancelación a la persona.
- CA-03-5: Un socio solo puede cancelar sus propios turnos; un ADMIN puede cancelar cualquiera.
- CA-03-6: Si el turno ya está cancelado o completado, el sistema devuelve error 422.

---

### HU-04 — Registrar un pago

**Como** administrador,  
**quiero** registrar el pago de una cuota de gimnasio o de una sesión de consultorio,  
**para** mantener actualizado el estado de cuenta de cada persona.

**Criterios de aceptación:**

- CA-04-1: Para `CUOTA_MENSUAL` se requiere `periodo` (primer día del mes); `turno_id` debe ser NULL.
- CA-04-2: Para `SESION_CONSULTORIO` se requiere `turno_id`; `periodo` debe ser NULL.
- CA-04-3: No se puede registrar una segunda cuota del mismo mes para la misma persona (error 409).
- CA-04-4: No se puede registrar un segundo pago para el mismo turno (error 409).
- CA-04-5: El monto debe ser mayor a cero.
- CA-04-6: El campo `registrado_por_usuario` queda registrado con el usuario ADMIN que ejecutó la operación.

---

### HU-05 — Cargar disponibilidad de un profesional

**Como** administrador o profesional,  
**quiero** definir las franjas horarias en que el profesional atiende,  
**para** que el sistema pueda ofrecer slots válidos al reservar turnos.

**Criterios de aceptación:**

- CA-05-1: Se puede agregar una franja indicando día de la semana (1=Lunes…7=Domingo), hora de inicio y hora de fin.
- CA-05-2: Si la franja nueva se superpone con una existente del mismo profesional en el mismo día, el sistema la rechaza con error 409.
- CA-05-3: Un ADMIN puede gestionar la disponibilidad de cualquier profesional; un PROFESIONAL solo la propia.
- CA-05-4: Se puede marcar una franja como inactiva sin eliminarla.
- CA-05-5: Se puede eliminar una franja solo si no tiene turnos futuros activos dentro de ese rango.

---

### HU-06 — Consultar el estado de cuenta

**Como** socio/paciente autenticado,  
**quiero** ver mi historial de pagos y saber si tengo cuotas vencidas,  
**para** conocer mi situación antes de intentar reservar un turno de gym.

**Criterios de aceptación:**

- CA-06-1: El endpoint devuelve el listado de cuotas mensuales con estado (pagada / vencida) y el listado de sesiones abonadas.
- CA-06-2: Una cuota figura como vencida si `NOW() > (periodo + 1 mes)`.
- CA-06-3: Un SOCIO_PACIENTE solo puede ver su propio estado de cuenta; un ADMIN puede ver el de cualquier persona.
- CA-06-4: Si la persona tiene cuotas vencidas hace más de 10 días, el sistema indica explícitamente que no puede reservar turnos GYM.
