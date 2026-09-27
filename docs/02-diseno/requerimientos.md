# Catálogo de Requerimientos — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

---

## 1. Requerimientos Funcionales (RF)

| ID | Módulo | Descripción |
|----|--------|-------------|
| RF-01 | Auth | El sistema permite registrar un nuevo usuario con email y contraseña. El rol se asigna siempre a `SOCIO_PACIENTE`; no es un input del cliente. Si el body incluye `rol`, el servicio responde 400 antes de crear el usuario (RNF-03). |
| RF-02 | Auth | El sistema autentica usuarios mediante contraseña y un identificador (email o DNI, ver RF-36), y devuelve un token JWT. |
| RF-03 | Auth | El sistema permite cerrar sesión (invalidación del lado del cliente; el token expira por TTL). |
| RF-04 | Auth | El sistema expone un endpoint protegido que devuelve los datos del usuario autenticado. |
| RF-05 | Personas | El ADMIN puede dar de alta de forma presencial una nueva persona: crea un `usuario` (rol `SOCIO_PACIENTE`) y una `persona` en una sola operación, con email y contraseña nuevos. Camino alternativo al vínculo (RF-31) cuando la persona no tiene cuenta previa. |
| RF-06 | Personas | El ADMIN puede listar personas con filtros por nombre, DNI y estado. |
| RF-07 | Personas | El ADMIN puede actualizar los datos de una persona. |
| RF-08 | Personas | El ADMIN puede dar de baja lógica a una persona (estado → INACTIVO, requiere fecha_baja). |
| RF-09 | Personas | El ADMIN puede reactivar una persona inactiva (estado → ACTIVO, fecha_baja → NULL). |
| RF-10 | Personas | Un SOCIO_PACIENTE puede consultar y editar sus propios datos de perfil. |
| RF-11 | Profesionales | El ADMIN puede registrar un nuevo profesional: crea un `usuario` (rol `PROFESIONAL`) y un `profesional` (especialidad, duración de turno) en una sola operación. No existe endpoint de vínculo para profesionales: la Decisión de dominio 8 del RFC-0001 fija un único rol por usuario y el registro público fuerza siempre `SOCIO_PACIENTE` (RF-01); un usuario autorregistrado es por definición `SOCIO_PACIENTE`, y vincularlo como profesional exigiría promover su rol, contradiciendo la Decisión 8. |
| RF-12 | Profesionales | El ADMIN puede listar y consultar profesionales activos. |
| RF-13 | Profesionales | El ADMIN puede modificar datos de un profesional y dar de baja lógica. |
| RF-14 | Profesionales | El ADMIN y el propio PROFESIONAL pueden gestionar las franjas horarias de disponibilidad. |
| RF-15 | Turnos | Un usuario autenticado puede consultar los slots disponibles de un profesional por fecha. |
| RF-16 | Turnos | Un SOCIO_PACIENTE o ADMIN puede reservar un turno de consultorio para una persona. |
| RF-17 | Turnos | Un SOCIO_PACIENTE o ADMIN puede reservar un turno de gimnasio para un socio, sujeto a la grilla horaria, el cupo por franja, el límite de un turno por día y la anticipación permitida (RN-14 a RN-18). |
| RF-18 | Turnos | El sistema aplica la regla de morosidad al reservar un turno GYM (ver RN-01). |
| RF-19 | Turnos | Un SOCIO_PACIENTE puede cancelar sus propios turnos con registro de motivo. |
| RF-20 | Turnos | El sistema aplica automáticamente la regla de anticipación al cancelar, según el tipo de turno (24 h en consultorio, 2 h en gimnasio — ver RN-02). |
| RF-21 | Turnos | Un ADMIN puede cancelar cualquier turno y marcar ausencias. |
| RF-22 | Turnos | El PROFESIONAL puede ver su agenda y marcar turnos de CONSULTORIO como completados o como ausencia. Los turnos de GYM no tienen profesional asignado; su cierre lo gestiona el ADMIN en el check-in (RF-34, RF-35). |
| RF-23 | Pagos | El ADMIN puede registrar un pago de cuota mensual para un socio. |
| RF-24 | Pagos | El ADMIN puede registrar un pago de sesión de consultorio asociado a un turno. |
| RF-25 | Pagos | El ADMIN y el propio SOCIO_PACIENTE pueden consultar el historial de pagos y el estado de cuenta. |
| RF-26 | Notificaciones | El sistema envía un email de confirmación al reservar un turno. |
| RF-27 | Notificaciones | El sistema envía un email de aviso al cancelar un turno. |
| RF-28 | Notificaciones | El sistema envía un email de recordatorio 24 h antes de cada turno reservado. |
| RF-29 | Notificaciones | El ADMIN puede consultar el historial de notificaciones de una persona. |
| RF-30 | Morosidad | El ADMIN puede registrar una excepción puntual a la regla de morosidad para un socio. |
| RF-31 | Personas | El ADMIN puede vincular una `persona` nueva a un `usuario` que ya existe, buscándolo por email (`POST /api/personas/vincular`, ADMIN-only). Body `{email, nombre, apellido, dni}`, sin contraseña. El servicio verifica primero que el actor sea ADMIN — 403 en caso contrario (RNF-03), antes de resolver el email, para no exponer qué direcciones están registradas. Luego: 404 (no existe usuario con ese email) y 409 (usuario ya vinculado a otra persona). |
| RF-32 | Auth | El sistema rechaza el login de un usuario con `activo = FALSE` (cuenta deshabilitada). Devuelve 401 con el mismo mensaje que una contraseña incorrecta: un error distinto permitiría deducir qué emails existen y cuáles están dados de baja. Un token emitido antes de la baja sigue siendo válido hasta su TTL (limitación documentada, Decisión de dominio 9). |
| RF-33 | Turnos | El sistema permite a cualquier usuario autenticado consultar el cupo disponible de una franja horaria de gimnasio para una fecha dada (cupo total, ocupados y disponibles), antes de reservar. Cierra el hueco detectado para el perfil SP-01 del relevamiento (`docs/01-propuesta/relevamiento/perfiles-usuario.json`). También satisface, sin crear un rol nuevo, la necesidad del perfil PR-04 (profesional de sala, sin agenda individual) de ver la ocupación por franja para organizar la sala. |
| RF-34 | Turnos | El ADMIN marca un turno de gimnasio como `COMPLETADO` en el momento del check-in de la persona en el gimnasio. Los turnos GYM no tienen profesional asignado, por lo que esta acción no la ejecuta un PROFESIONAL como en RF-22 (que aplica solo a turnos de CONSULTORIO). |
| RF-35 | Turnos | El sistema marca automáticamente como `AUSENTE` todo turno de gimnasio que sigue en estado `RESERVADO` una vez finalizada su franja horaria, sin que se haya registrado el check-in (RF-34). |
| RF-36 | Auth | El sistema permite iniciar sesión con email o con DNI (`identificador` en el body de `POST /api/auth/login`, junto a `contrasena`). El login por DNI busca la persona en `personas.dni` y resuelve el `usuario` asociado por `usuario_id`; solo funciona para quien ya tiene ficha cargada ahí. Un usuario recién autorregistrado no tiene esa ficha todavía (queda pendiente de que el ADMIN la complete, CA-01-6) y un PROFESIONAL no tiene DNI en el esquema (solo `personas` lo tiene): ambos perfiles solo pueden ingresar con email. El 401 es el mismo, con el mismo mensaje, para identificador (email o DNI) inexistente, contraseña incorrecta y cuenta deshabilitada (RF-32) — ningún caso es distinguible de otro. |

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
| RN-01 | **Morosidad en gym:** Un socio con membresía de gimnasio (`es_socio_gym = TRUE`) no puede reservar turnos GYM si tiene al menos un mes impago desde el inicio de su membresía (`personas.fecha_inicio_membresia`). La deuda se calcula recorriendo, mes a mes, todos los períodos entre `fecha_inicio_membresia` (inclusive) y el mes actual: cada período `P` vence el 1° del mes siguiente y se considera impago si, además, `NOW() > (P + 1 mes + 10 días)` y no existe una cuota `CUOTA_MENSUAL` registrada para ese `P`. Un mes salteado cuenta como impago aunque se hayan pagado meses posteriores: el pago de un período no compensa la falta de otro. El socio es moroso si existe al menos un período en esa condición. Un socio cuyo primer período (el de `fecha_inicio_membresia`) todavía no llegó a esos 10 días de vencido no es moroso — no se bloquea desde el primer día. Los turnos de consultorio no se ven afectados. Regla dependiente de `NOW()`: se valida en el backend, no en la base. |
| RN-02 | **Cancelación con anticipación:** el umbral de anticipación para que la cancelación quede `CANCELADO_EN_TIEMPO` depende del tipo de turno: en `CONSULTORIO` es ≥ 24 h antes del inicio; en `GYM` es ≥ 2 h antes del inicio. Por debajo del umbral que corresponda, el estado es `CANCELADO_TARDE` (el slot permanece bloqueado — RN-03). En ambos tipos de turno se registran `cancelado_en`, `cancelado_por_usuario` y `motivo_cancelacion`. Regla dependiente de `NOW()`: se valida en el backend, no en la base. |
| RN-03 | **Solapamiento de turnos:** Un profesional no puede tener dos turnos activos en el mismo horario. Los estados que bloquean el horario son `RESERVADO`, `AUSENTE`, `COMPLETADO` y `CANCELADO_TARDE`; solo `CANCELADO_EN_TIEMPO` libera el horario (coherente con RN-08: un turno `AUSENTE` sigue ocupando el slot). La restricción se garantiza con un `EXCLUDE USING GIST` en la base de datos. |
| RN-04 | **Baja lógica:** las personas nunca se eliminan físicamente. La baja se registra con `estado = INACTIVO` y `fecha_baja`. El historial de turnos y pagos se preserva. |
| RN-05 | **Unicidad de cuota:** una persona puede tener a lo sumo una cuota mensual registrada por mes (`UNIQUE (persona_id, periodo)` parcial). |
| RN-06 | **Unicidad de pago por turno:** un turno puede tener a lo sumo un pago de tipo `SESION_CONSULTORIO` asociado (`UNIQUE (turno_id)` parcial). |
| RN-07 | **Concepto de pago excluyente:** `CUOTA_MENSUAL` requiere `periodo` (primer día del mes) y `turno_id = NULL`. `SESION_CONSULTORIO` requiere `turno_id` y `periodo = NULL`. |
| RN-08 | **Ausencia:** si el paciente no se presenta al turno, el profesional o el admin registra el estado `AUSENTE`. El slot se considera ocupado (no se libera). |
| RN-09 | **Excepción por morosidad:** el ADMIN puede autorizar una excepción puntual a RN-01 para un socio moroso. La excepción queda registrada en `excepciones_morosidad` con motivo, autorizador y fecha de vencimiento. |
| RN-10 | **Alta de personas:** el registro de usuario es público (RF-01) y siempre asigna `SOCIO_PACIENTE`. El alta en `personas` tiene dos caminos, ambos exclusivos del ADMIN: (1) alta presencial (RF-05) — crea `usuario` + `persona` juntos con credenciales nuevas; (2) vínculo (RF-31) — busca un `usuario` existente por email y crea `persona` con ese `usuario_id`. El alta de `profesionales` (RF-11) solo tiene camino de alta presencial; no existe vínculo. |
| RN-11 | **Disponibilidad del profesional:** las franjas horarias de un mismo profesional en el mismo día no pueden solaparse. El motor lo garantiza mediante un trigger (`trg_disponibilidad_no_overlap`). |
| RN-12 | **Franja de disponibilidad:** un turno solo puede reservarse dentro de la franja de disponibilidad activa del profesional. La validación se realiza en la capa de servicio. |
| RN-13 | **Resolución de `usuario_id` antes del INSERT:** en los dos caminos de alta de `personas` (alta presencial, RF-05, y vínculo, RF-31) y en el camino único de alta de `profesionales` (RF-11), el sistema resuelve completamente el `usuario_id` — confirmando que existe y que no está ya vinculado a otra fila — antes de ejecutar el INSERT correspondiente. Así las restricciones `NOT NULL UNIQUE` del DDL nunca se violan en tiempo de ejecución. |
| RN-14 | **Grilla horaria de gimnasio:** los turnos GYM duran 60 minutos exactos y comienzan en hora en punto. Lunes a viernes se reservan entre las 07:00 y las 21:00 (inicio); sábados entre las 09:00 y las 12:00 (inicio); domingo el gimnasio permanece cerrado. La validación se garantiza en la base de datos (`CHECK` sobre la franja). |
| RN-15 | **Cupo por franja de gimnasio:** cada franja horaria de GYM tiene un cupo máximo de personas, único para todo el gimnasio y configurable en `configuracion_gym.cupo_por_franja` (valor actual: 20). El cupo se garantiza en la base de datos mediante un trigger que cuenta los turnos activos de esa franja antes de aceptar una nueva reserva. |
| RN-16 | **Un turno de gimnasio por persona por día:** una persona no puede tener más de un turno GYM activo el mismo día. Los turnos en estado `CANCELADO_EN_TIEMPO` o `CANCELADO_TARDE` no cuentan para este límite. Se garantiza con un índice único parcial en la base de datos. |
| RN-17 | **Socio habilitado para reservar gimnasio:** solo puede reservar un turno GYM la persona con `es_socio_gym = TRUE` y `estado = 'ACTIVO'`. Se valida en la base de datos mediante un trigger; además está sujeta a RN-01 (morosidad). |
| RN-18 | **Anticipación para reservar turno de gimnasio:** un turno GYM se puede reservar hasta 7 días antes de su franja y, como mínimo, con 1 hora de anticipación al inicio. Regla dependiente de `NOW()`: se valida en el backend, no en la base. |
| RN-19 | **Cierre de turnos de gimnasio:** un turno GYM no tiene profesional asignado (`profesional_id` es siempre `NULL`), por lo que RN-08 y RF-22 no le aplican. El ADMIN marca el turno como `COMPLETADO` en el momento del check-in de la persona en el gimnasio (RF-34). Si la franja finaliza sin que se haya registrado el check-in, el turno pasa automáticamente a `AUSENTE` (RF-35). Regla dependiente de `NOW()` (cierre de franja): se valida en el backend. |

> **Nota de alcance — perfil PR-04 (profesional de sala):** el modelo de `PROFESIONAL` asume agenda individual (especialidad, franjas de disponibilidad, turnos propios) y no encaja con un rol de instrucción en sala sin turnos individuales. RF-33 cubre la necesidad funcional expresada por ese perfil (ver ocupación por franja) sin crear un rol nuevo. Definir un tipo de cuenta de solo consulta para personal sin agenda propia queda fuera de alcance del MVP; si el centro necesitara que este perfil acceda al sistema, hoy debería usar una cuenta ADMIN existente, lo cual excede el principio de mínimo privilegio y se documenta como limitación conocida.

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
- CA-01-4: El rol asignado es siempre `SOCIO_PACIENTE`.
- CA-01-5: Tras el registro exitoso, el sistema devuelve un token JWT listo para usar.
- CA-01-6: La ficha de persona queda pendiente de completar por el ADMIN (el usuario existe pero `personas` no tiene fila aún).
- CA-01-7: Si el body incluye la clave `rol` (cualquier valor), el sistema responde 400 antes de crear el usuario; el campo no se ignora en silencio.

---

### HU-02 — Reservar un turno de consultorio

**Como** socio/paciente autenticado,  
**quiero** reservar un turno con un profesional en un horario disponible,  
**para** asegurar mi atención sin tener que llamar por teléfono.

**Criterios de aceptación:**

- CA-02-1: El sistema muestra únicamente slots dentro de la franja de disponibilidad del profesional y sin turno activo (`RESERVADO`, `AUSENTE`, `COMPLETADO` o `CANCELADO_TARDE`) en ese horario (RN-03).
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
- CA-03-2: El sistema calcula automáticamente si el aviso llega a tiempo o tarde, según el umbral de anticipación que corresponde al tipo de turno: 24 h en consultorio, 2 h en gimnasio (RN-02).
- CA-03-3: Se registran `cancelado_en`, `cancelado_por_usuario` y `motivo_cancelacion` (los tres obligatorios).
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

---

### HU-07 — Vincular una ficha de persona con un usuario existente

**Como** administrador,  
**quiero** buscar por email un usuario que ya se registró solo y vincularlo a una ficha de persona nueva,  
**para** completar su alta sin pedirle que cree una segunda cuenta.

**Criterios de aceptación:**

- CA-07-1: El ADMIN busca por email; si no hay `usuario` con ese email, el sistema responde 404.
- CA-07-2: Si el `usuario` encontrado ya tiene una `persona` vinculada, el sistema responde 409.
- CA-07-3: El body de vínculo no acepta contraseña — el `usuario` ya tiene la suya.
- CA-07-4: Un actor no-ADMIN recibe 403, verificado en la capa de servicio (RNF-03).
- CA-07-5: Tras el vínculo exitoso, la `persona` creada tiene el mismo `usuario_id` que el usuario encontrado (no se crea un `usuario` nuevo).

---

### HU-08 — Reservar un turno de gimnasio

**Como** socio de gimnasio autenticado,  
**quiero** reservar un turno de gimnasio en una franja horaria con lugar disponible,  
**para** asegurarme un lugar sin ir a probar suerte.

**Criterios de aceptación:**

- CA-08-1: El sistema solo ofrece franjas válidas según la grilla horaria del gimnasio (lunes a viernes 07:00-21:00, sábados 09:00-12:00, domingo cerrado — RN-14).
- CA-08-2: Antes de reservar, la persona puede consultar el cupo disponible de la franja elegida (RF-33).
- CA-08-3: Solo puede reservar quien es socio de gimnasio activo (`es_socio_gym = TRUE`, `estado = 'ACTIVO'`) y no tiene meses impagos (RN-01, RN-17).
- CA-08-4: La reserva se rechaza si la persona ya tiene otro turno GYM activo ese mismo día (RN-16).
- CA-08-5: La reserva se rechaza si la franja ya alcanzó su cupo máximo (RN-15) o si no respeta la anticipación permitida — hasta 7 días antes, mínimo 1 hora antes (RN-18).
- CA-08-6: Un turno de gimnasio nunca tiene profesional asignado.
- CA-08-7: Un ADMIN puede reservar en nombre de cualquier socio; un SOCIO_PACIENTE solo para sí mismo.

---

### HU-09 — Registrar el check-in de un turno de gimnasio

**Como** administrador,  
**quiero** marcar la llegada de un socio a su turno de gimnasio,  
**para** dejar constancia de la asistencia sin depender de un profesional asignado.

**Criterios de aceptación:**

- CA-09-1: El ADMIN marca `COMPLETADO` un turno GYM en estado `RESERVADO` en el momento del check-in (RF-34).
- CA-09-2: Si la franja finaliza sin check-in, el turno pasa automáticamente a `AUSENTE` (RF-35).
- CA-09-3: Un turno GYM ya `CANCELADO_EN_TIEMPO` o `CANCELADO_TARDE` no admite check-in.
- CA-09-4: El PROFESIONAL no participa de este flujo: RF-22 aplica solo a turnos de consultorio.
