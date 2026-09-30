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
| RF-37 | Notificaciones | El sistema notifica por email al socio de gimnasio que acumula al menos un período mensual impago, informando cuántos adeuda y cuántos le restan para quedar suspendido (RN-01, estado "con deuda"). El aviso se repite al registrarse cada nuevo período impago, y el último —al alcanzar el umbral— comunica la suspensión efectiva. Cierra el hueco detectado para el perfil SP-02 del relevamiento: RF-26 a RF-28 cubren notificaciones de turnos, no de estado de cuenta, y sin este aviso la suspensión llegaría sin preaviso. El relevamiento de campo confirma que la notificación progresiva precede al bloqueo (ver AS-IS del RFC-001). Cada envío se registra en `notificaciones` (RF-29). |
| RF-38 | Turnos | El sistema sincroniza el calendario de feriados desde el dataset **Feriados Nacionales** del catálogo de datos abiertos del Estado (`datos.gob.ar`, publicado por el Ministerio del Interior): `https://www.argentina.gob.ar/sites/default/files/holidays-{año}-es.json`, JSON-LD con `mainEntity.itemListElement[].item` (`startDate`, `name`, `additionalProperty.value` = tipo). El importador escribe en `feriados` marcando `origen = 'OFICIAL'` y `cierra_gimnasio = TRUE` salvo para el tipo `no_laborable`, que son festividades religiosas de quien las profesa y no un cierre del establecimiento. Cuando la fuente lista varias festividades en la misma fecha conserva la de mayor peso (`fecha` es clave primaria). **La reserva nunca consulta la API**: lee la tabla, para que una caída del servicio externo no impida vender turnos. El ADMIN puede corregir cualquier fila o agregar cierres propios del centro con `origen = 'MANUAL'`. La sincronización corre **todos los días a las 03:00 de Argentina** (`vitalys.feriados.cron`) sobre el año en curso y el siguiente: los trasladables se corren cada año y pueden declararse feriados por decreto en cualquier momento — en 2026, el 09/11 por la visita papal —, así que una carga única queda desactualizada sin que nadie se entere. Un año que falle no impide sincronizar los demás, y ante un error el calendario de ese año queda como estaba: nunca se interpreta "no pude leer la fuente" como "no hay feriados". El ADMIN puede forzarla con `POST /api/admin/feriados/sincronizar`, que devuelve **207** si algún año no se pudo leer. |

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
| RN-01 | **Morosidad en gym:** la deuda de un socio de gimnasio (`es_socio_gym = TRUE`) se calcula recorriendo, mes a mes, todos los períodos entre `personas.fecha_inicio_membresia` (inclusive) y el mes actual. Cada período `P` vence el 1° del mes siguiente y se cuenta como **impago** si `NOW() > (P + 1 mes + 10 días)` y no existe una cuota `CUOTA_MENSUAL` registrada para ese `P`. **Un mes salteado cuenta como impago aunque se hayan pagado meses posteriores:** el pago de un período no compensa la falta de otro, y la deuda se acumula sin prescribir. Un socio cuyo primer período todavía no llegó a esos 10 días de vencido no tiene deuda — no se bloquea desde el primer día. Sobre ese cálculo se definen **dos estados**, y solo el segundo bloquea: **(a) Con deuda** — al menos un período impago y menos que el umbral: el socio **conserva el acceso completo** y el sistema le notifica la deuda pendiente. **(b) Suspendido** — la cantidad de períodos impagos acumulados alcanza o supera `configuracion_gym.meses_tolerancia_morosidad` (por defecto 6): **se rechaza la reserva de turnos GYM** hasta que regularice o el ADMIN autorice una excepción (RN-09). **Los turnos de consultorio nunca se ven afectados, en ninguno de los dos estados** (Decisión de dominio 1). Regla dependiente de `NOW()`: se valida en el backend, no en la base. _Umbral de tolerancia y estado intermedio incorporados a partir del relevamiento de campo — ver hallazgo 7 del RFC-001._ |
| RN-02 | **Cancelación con anticipación:** el umbral para que la cancelación quede `CANCELADO_EN_TIEMPO` depende del tipo de turno: en `CONSULTORIO` es ≥ 24 h antes del inicio; en `GYM` es ≥ 2 h antes. Por debajo del umbral el estado es `CANCELADO_TARDE`. **El estado registra la anticipación del aviso; no decide si el lugar se libera.** Lo que libera el lugar es que la cancelación llegue **antes del inicio del turno**: `cancelado_en < inicio` libera, y a partir del inicio (`cancelado_en >= inicio`) el lugar queda bloqueado. Vale igual para los dos tipos de turno — un turno de las 14:00 cancelado a las 14:01 no libera nada, sea de consultorio o de gimnasio. Es el mismo principio que RN-08 para `AUSENTE`: una vez que la franja empezó, el lugar se consumió. La distinción en tiempo/tarde se conserva como registro para poder sancionar la cancelación tardía reiterada (ver RN-03 para el efecto sobre la ocupación). En ambos tipos se registran `cancelado_en`, `cancelado_por_usuario` y `motivo_cancelacion`. El cálculo del estado depende de `NOW()` y se valida en el backend; la ocupación del lugar la hace cumplir la base (`fn_turno_ocupa_lugar`, `V8__ocupacion_por_inicio_del_turno.sql`). _Regla alineada con el relevamiento de campo: ver [`entrevista-jerarquicos.md`](../01-propuesta/relevamiento/entrevista-jerarquicos.md)._ |
| RN-03 | **Ocupación del lugar y solapamiento:** un turno ocupa su lugar cuando su estado es `RESERVADO`, `COMPLETADO` o `AUSENTE`, **o** cuando fue cancelado a partir del inicio de la franja (`cancelado_en >= inicio`). Una cancelación registrada antes del inicio libera el lugar, sea `CANCELADO_EN_TIEMPO` o `CANCELADO_TARDE` (RN-02). Esta única definición gobierna los tres controles del motor y está centralizada en `fn_turno_ocupa_lugar(estado, inicio, cancelado_en)` para que no puedan divergir: **(a)** un profesional no puede tener dos turnos superpuestos — `EXCLUDE USING GIST` sobre `turnos`; **(b)** el cupo por franja de gimnasio — `trg_turno_gym` contra `configuracion_gym.cupo_por_franja`; **(c)** un solo turno de gimnasio por persona y por día — índice único parcial. |
| RN-04 | **Baja lógica:** las personas nunca se eliminan físicamente. La baja se registra con `estado = INACTIVO` y `fecha_baja`. El historial de turnos y pagos se preserva. |
| RN-05 | **Unicidad de cuota:** una persona puede tener a lo sumo una cuota mensual registrada por mes (`UNIQUE (persona_id, periodo)` parcial). |
| RN-06 | **Unicidad de pago por turno:** un turno puede tener a lo sumo un pago de tipo `SESION_CONSULTORIO` asociado (`UNIQUE (turno_id)` parcial). |
| RN-07 | **Concepto de pago excluyente:** `CUOTA_MENSUAL` requiere `periodo` (primer día del mes) y `turno_id = NULL`. `SESION_CONSULTORIO` requiere `turno_id` y `periodo = NULL`. |
| RN-08 | **Ausencia:** si el paciente no se presenta al turno, el profesional o el admin registra el estado `AUSENTE`. El slot se considera ocupado (no se libera). |
| RN-09 | **Excepción por morosidad:** el ADMIN puede autorizar una excepción a RN-01 para un socio **suspendido** (estado (b) de RN-01). Un socio en estado "con deuda" no necesita excepción: no está bloqueado. La excepción queda registrada en `excepciones_morosidad` con motivo, autorizador y fecha de vencimiento, y puede ser de **un solo uso** o válida por período — ver RN-23 para el consumo y la vigencia. |
| RN-10 | **Alta de personas:** el registro de usuario es público (RF-01) y siempre asigna `SOCIO_PACIENTE`. El alta en `personas` tiene dos caminos, ambos exclusivos del ADMIN: (1) alta presencial (RF-05) — crea `usuario` + `persona` juntos con credenciales nuevas; (2) vínculo (RF-31) — busca un `usuario` existente por email y crea `persona` con ese `usuario_id`. El alta de `profesionales` (RF-11) solo tiene camino de alta presencial; no existe vínculo. |
| RN-11 | **Disponibilidad del profesional:** las franjas horarias de un mismo profesional en el mismo día no pueden solaparse. El motor lo garantiza mediante un trigger (`trg_disponibilidad_no_overlap`). |
| RN-12 | **Franja de disponibilidad:** un turno solo puede reservarse dentro de la franja de disponibilidad activa del profesional. La validación se realiza en la capa de servicio. |
| RN-13 | **Resolución de `usuario_id` antes del INSERT:** en los dos caminos de alta de `personas` (alta presencial, RF-05, y vínculo, RF-31) y en el camino único de alta de `profesionales` (RF-11), el sistema resuelve completamente el `usuario_id` — confirmando que existe y que no está ya vinculado a otra fila — antes de ejecutar el INSERT correspondiente. Así las restricciones `NOT NULL UNIQUE` del DDL nunca se violan en tiempo de ejecución. |
| RN-14 | **Grilla horaria de gimnasio:** los turnos GYM duran 60 minutos exactos y comienzan en hora en punto. El horario declarado es **de apertura a cierre**, y toda franja tiene que terminar a más tardar en la hora de cierre: lunes a viernes el gimnasio abre a las 07:00 y cierra a las 21:00, por lo que el **último inicio posible es a las 20:00** (14 franjas); los sábados abre a las 09:00 y cierra a las 12:00, último inicio a las 11:00 (3 franjas). **Domingos y feriados el gimnasio no abre.** La grilla (duración, hora en punto, día y horario) se garantiza con un `CHECK` sobre la franja; los feriados se validan en el trigger `trg_turno_gym` contra la tabla `feriados`, porque un `CHECK` no puede consultar otra tabla. El calendario de feriados lo carga el ADMIN: declarar un feriado **no** cancela los turnos ya reservados para esa fecha, que deben cancelarse explícitamente. |
| RN-15 | **Cupo por franja de gimnasio:** cada franja horaria de GYM tiene un cupo máximo de personas, único para todo el gimnasio y configurable en `configuracion_gym.cupo_por_franja` (valor actual: 20). El cupo se garantiza en la base de datos mediante un trigger que cuenta los turnos activos de esa franja antes de aceptar una nueva reserva. |
| RN-16 | **Un turno de gimnasio por persona por día:** una persona no puede tener más de un turno GYM activo el mismo día. Cuentan para el límite los turnos que ocupan su lugar según RN-03: no cuentan los cancelados **antes** del inicio de la franja, y sí cuenta un turno cancelado una vez empezado (el turno del día ya se consumió). Se garantiza con un índice único parcial en la base de datos. |
| RN-17 | **Socio habilitado para reservar gimnasio:** solo puede reservar un turno GYM la persona con `es_socio_gym = TRUE` y `estado = 'ACTIVO'`. Se valida en la base de datos mediante un trigger; además está sujeta a RN-01 (morosidad). |
| RN-18 | **Anticipación para reservar turno de gimnasio:** un turno GYM se puede reservar hasta 7 días antes de su franja y, como mínimo, con 1 hora de anticipación al inicio. Regla dependiente de `NOW()`: se valida en el backend, no en la base. |
| RN-19 | **Cierre de turnos de gimnasio:** un turno GYM no tiene profesional asignado (`profesional_id` es siempre `NULL`), por lo que RN-08 y RF-22 no le aplican. El ADMIN marca el turno como `COMPLETADO` en el momento del check-in de la persona en el gimnasio (RF-34). Si la franja finaliza sin que se haya registrado el check-in, el turno pasa automáticamente a `AUSENTE` (RF-35). Regla dependiente de `NOW()` (cierre de franja): se valida en el backend. |
| RN-20 | **Pago de sesión de consultorio:** un pago con concepto `SESION_CONSULTORIO` solo puede asociarse a un turno de tipo `CONSULTORIO` —un turno de gimnasio no genera honorarios: no hay profesional que atienda, y lo que se cobra del gimnasio es la cuota mensual— y debe registrarse **a nombre de la persona del turno**. Un pago a nombre de un tercero descuadra los dos estados de cuenta: a uno le figura un pago que no le corresponde y al otro le sigue faltando el suyo. Se valida en la **base de datos** (`trg_pago_sesion`): son invariantes de integridad que no dependen de `NOW()` ni del actor, y cruzan `pagos` con `turnos`, así que un `CHECK` no alcanza. |
| RN-21 | **Persona habilitada para reservar:** no se pueden reservar turnos, de ningún tipo, para una persona con `estado = 'INACTIVO'`. Dar de baja a una persona **no invalida los turnos que ya tenía**: son hechos históricos. Cancelar sus turnos futuros es responsabilidad del caso de uso de baja (RF-08), no de esta regla. Se valida en la **base de datos** (`trg_turno_persona_activa`), para los dos tipos de turno. Complementa a RN-17, que exige además la membresía de gimnasio para los turnos GYM. |
| RN-22 | **Una persona, un turno a la vez:** una persona no puede tener dos turnos superpuestos, **ni siquiera de tipos distintos** — nadie puede estar entrenando en el gimnasio y sentado en un consultorio al mismo tiempo. Es el espejo de RN-03, que impide la superposición del lado del profesional. Se valida en la **base de datos** con un `EXCLUDE USING GIST` sobre `persona_id`, usando la misma definición de ocupación que RN-03 (`fn_turno_ocupa_lugar`): una cancelación previa al inicio libera la franja y permite reservar otra cosa. |
| RN-23 | **Consumo de una excepción de morosidad:** `excepciones_morosidad.turno_id` **no es un dato de alta**. Una excepción sirve para poder reservar, así que en el momento en que se la necesita el turno todavía no existe. La columna registra **qué turno consumió** la excepción y la completa el servicio después de crear el turno; ese turno debe pertenecer a la persona beneficiada. Sobre esa base se define lo *puntual*: con `un_solo_uso = TRUE` la excepción habilita **una sola reserva** y se agota al usarse; con `FALSE` vale para cualquier turno de gimnasio hasta `valida_hasta`. Una excepción está vigente cuando `valida_hasta >= CURRENT_DATE AND (NOT un_solo_uso OR turno_id IS NULL)`. La pertenencia se valida en la **base de datos** (`trg_excepcion_morosidad`); la vigencia y el consumo, en el **servicio**, porque dependen de `NOW()`. |
| RN-24 | **Reducción de disponibilidad con turnos ya reservados:** al quitar o recortar una franja de `disponibilidad_profesional`, los turnos de CONSULTORIO en estado `RESERVADO` que queden fuera de la nueva disponibilidad y **cuyo inicio sea futuro** se cancelan en cascada con estado `CANCELADO_POR_PROFESIONAL`, y se notifica a cada paciente (RF-27). Los turnos ya transcurridos no se tocan: son hechos históricos. La cancelación registra `motivo_cancelacion` y `cancelado_por_usuario` con quien hizo el cambio, y **no computa como cancelación del paciente** — por eso no se reutilizan `CANCELADO_EN_TIEMPO` ni `CANCELADO_TARDE`, que describen la anticipación con la que avisó el paciente. Como es una acción destructiva sobre turnos de terceros, el sistema **muestra primero el impacto** (qué turnos se cancelarían, de quién y cuándo) y exige confirmación explícita antes de aplicarla. Se resuelve en el **servicio**, en una única transacción: o se guarda la disponibilidad junto con sus cancelaciones y notificaciones, o no se guarda nada. La base **no** cascadea sola: necesita saber quién es el actor y disparar notificaciones, y una cancelación automática e invisible en el motor sería justamente lo que se quiere evitar. _Cierra el hallazgo 5 del RFC-001._ |

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

- CA-02-1: El sistema muestra únicamente slots dentro de la franja de disponibilidad del profesional y sin ningún turno que ocupe ese horario según RN-03 (`RESERVADO`, `AUSENTE`, `COMPLETADO`, o una cancelación registrada a partir del inicio).
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

- CA-08-1: El sistema solo ofrece franjas válidas según la grilla horaria del gimnasio: lunes a viernes de 07:00 a 21:00 (última franja 20:00–21:00) y sábados de 09:00 a 12:00 (última franja 11:00–12:00). Domingos y feriados no se ofrece ninguna franja (RN-14).
- CA-08-2: Antes de reservar, la persona puede consultar el cupo disponible de la franja elegida (RF-33).
- CA-08-3: Solo puede reservar quien es socio de gimnasio activo (`es_socio_gym = TRUE`, `estado = 'ACTIVO'`) y no está suspendido por morosidad — es decir, acumula menos períodos impagos que `configuracion_gym.meses_tolerancia_morosidad` (RN-01, RN-17). Tener deuda por debajo del umbral **no** impide reservar.
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
