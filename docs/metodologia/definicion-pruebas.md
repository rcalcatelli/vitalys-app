# Definición de Pruebas — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

---

## Estrategia general

El plan de pruebas cubre tres niveles: unitario (lógica de negocio aislada), integración (API + BD) y smoke/aceptación (flujos completos en producción). El objetivo es garantizar que las reglas de negocio críticas —solapamiento de turnos, morosidad y ciclo de vida de estados— no puedan romperse sin que una prueba lo detecte.

---

## Nivel 1 — Pruebas unitarias (JUnit 5 + Mockito)

Validan la lógica de negocio en la capa de servicio, sin base de datos real.

### PagoServiceTest

El servicio devuelve **la cantidad de períodos mensuales impagos acumulados** desde `personas.fecha_inicio_membresia` (columna agregada en `V4__fecha_inicio_membresia.sql`), recorriendo mes a mes: cuenta como impago todo período `P` con `NOW() > (P + 1 mes + 10 días)` sin cuota registrada, aunque existan pagos de meses posteriores. El bloqueo **no** se dispara con el primer impago: se compara el total contra `configuracion_gym.meses_tolerancia_morosidad` (`V6__tolerancia_morosidad.sql`, 6 por defecto) y se rechaza la reserva solo cuando lo **alcanza o supera** (RN-01). Los casos asumen ese umbral salvo que se indique otro.

| ID    | Caso de prueba                                                                 | Entrada                                              | Resultado esperado                          |
|-------|--------------------------------------------------------------------------------|------------------------------------------------------|---------------------------------------------|
| PU-01 | Todos los períodos pagados desde el alta de la membresía                      | fecha_inicio_membresia = 2026-07-01, pagos en 07/08/09, hoy = 2026-09-25 | impagos = 0, bloqueado = false |
| PU-02 | Período vencido hace exactamente 10 días → todavía no cuenta                  | fecha_inicio_membresia = 2026-06-01, pagos en 06 y 08 (saltea 07), hoy = 2026-08-11 | impagos = 0, bloqueado = false |
| PU-03 | Mes salteado con meses posteriores pagados → suma deuda pero NO bloquea       | fecha_inicio_membresia = 2026-06-01, pagos en 06 y 08 (saltea 07), hoy = 2026-08-12 | impagos = 1 (el pago de agosto no compensa julio), bloqueado = **false** — 1 < 6 |
| PU-04 | Sin ningún pago registrado desde el alta de la membresía                      | fecha_inicio_membresia = 2026-01-01, sin filas en pagos, hoy = 2026-09-25 | impagos = 8 (01 a 08; 09 aún en gracia), bloqueado = true |
| PU-05 | Persona sin membresía gym (es_socio_gym = false) → sin bloqueo               | es_socio_gym = false                                 | bloqueado = false sin consultar pagos       |
| PU-06 | Login con cuenta deshabilitada (RF-32)                                        | activo = false, contraseña correcta                  | CredencialesInvalidasException, no se emite token |
| PU-07 | Contrato UserDetails de `Usuario`                                             | usuario con rol SOCIO_PACIENTE / ADMIN               | getUsername = email, autoridad `ROLE_<rol>`, isEnabled sigue a `activo` |
| PU-08 | Mes salteado en medio del historial, con meses posteriores pagados            | fecha_inicio_membresia = 2026-05-01, pagos en 05, 07, 08 (saltea 06), hoy = 2026-08-20 | impagos = 1 (período 06), bloqueado = false |
| PU-09 | Socio nuevo: alta este mes, sin pagos → no se bloquea desde el primer día    | fecha_inicio_membresia = 2026-09-01, sin pagos, hoy = 2026-09-05 | impagos = 0 (el período 09 vence recién el 2026-10-11), bloqueado = false. **Ningún período computable no es lo mismo que un período impago**: un cálculo que genere una fila vacía y la cuente devuelve 1 y bloquea justo al socio que la regla protege |
| PU-10 | Borde inferior: un período por debajo del umbral                              | impagos = 5, umbral = 6                              | bloqueado = false                           |
| PU-11 | Borde exacto: la cantidad de impagos iguala el umbral                         | impagos = 6, umbral = 6                              | bloqueado = true — la condición es "alcanza o supera", no "supera" |
| PU-12 | El umbral se lee de la configuración, no está fijo en el código               | impagos = 2, `meses_tolerancia_morosidad` = 2        | bloqueado = true con el mismo historial que en PU-03 daría false con umbral 6 |

### Estado de cuenta (frontend, Vitest + Testing Library)

Los PU-13 a PU-30 son pruebas de la interfaz de pagos (Sprint 5); el cálculo de la regla vive en el backend y lo cubren PU-01 a PU-12 y PI-98 a PI-104.

| ID    | Caso de prueba | Resultado esperado | Archivo |
|-------|----------------|--------------------|---------|
| PU-13 | Estado de cuenta de un socio suspendido | Avisa el límite de períodos impagos | `EstadoCuentaView.test.tsx` |
| PU-14 | Excepción de morosidad vigente | Muestra hasta cuándo rige y el motivo | `EstadoCuentaView.test.tsx` |
| PU-15 | Socio al día | Períodos pagados con monto, medio y fecha; sin excepción | `EstadoCuentaView.test.tsx` |
| PU-16 | Persona que no es socia del gimnasio | Sin períodos; lista sus sesiones pagadas | `EstadoCuentaView.test.tsx` |
| PU-17 | `GET /api/pagos/mi-estado-cuenta` responde 422 (usuario sin ficha) | Explica que falta la ficha y no ofrece reintentar | `MiEstadoCuentaPage.test.tsx` |
| PU-18 | Error de red al cargar | Ofrece reintentar y se recupera | `MiEstadoCuentaPage.test.tsx` |
| PU-19 | Registrar cuota: selección de período | Sugiere el primer período impago, bloquea los pagados y ofrece adelantos | `RegistrarPagoDialog.test.tsx` |
| PU-20 | Enviar con monto o medio sin completar | Valida antes de enviar | `RegistrarPagoDialog.test.tsx` |
| PU-21 | Enviar una cuota | Payload con período, monto y medio | `RegistrarPagoDialog.test.tsx` |
| PU-22 | Registrar una sesión | Excluye turnos cancelados y de gimnasio, marca los ya pagados y envía el turno | `RegistrarPagoDialog.test.tsx` |
| PU-23 | Persona que no es socia del gimnasio | No ofrece cuota; arranca en "sesión" | `RegistrarPagoDialog.test.tsx` |
| PU-24 | Error del servidor al registrar | Muestra el error y bloquea el doble envío | `RegistrarPagoDialog.test.tsx` |
| PU-25 | Buscar persona por nombre o DNI | Lista resultados con la etiqueta de socio | `PagosPage.test.tsx` |
| PU-26 | Elegir a la persona | Muestra su estado de cuenta y permite cambiarla | `PagosPage.test.tsx` |
| PU-27 | Registro exitoso | Cierra el modal, avisa y refresca el estado | `PagosPage.test.tsx` |
| PU-28 | 409 del servidor (cuota duplicada) | Se muestra en el modal y no lo cierra | `PagosPage.test.tsx` |
| PU-29 | Doble clic en "Registrar" | Bloquea el envío mientras el pago está en curso | `PagosPage.test.tsx` |
| PU-30 | Sesión de consultorio de una persona | Carga los turnos de la persona y no ofrece cuota si no es socia | `PagosPage.test.tsx` |

### TurnoServiceTest

| ID    | Caso de prueba                                                                 | Entrada                                              | Resultado esperado                          |
|-------|--------------------------------------------------------------------------------|------------------------------------------------------|---------------------------------------------|
| TU-01 | Cancelación con exactamente 24 h de anticipación → EN_TIEMPO                 | inicio = T+24h00, ahora = T                          | estado = CANCELADO_EN_TIEMPO                |
| TU-02 | Cancelación con 23 h 59 min → TARDE                                          | inicio = T+23h59, ahora = T                          | estado = CANCELADO_TARDE                    |
| TU-03 | SOCIO_PACIENTE cancela turno de otra persona → AccesoDenegadoException       | turno.persona_id ≠ usuario.persona_id                | excepción 403                               |
| TU-04 | Cancelar turno ya COMPLETADO → EstadoInvalidoException                       | estado = COMPLETADO                                  | excepción 422                               |
| TU-05 | Reservar turno GYM estando suspendido → MorosidadException                   | es_socio_gym = true, impagos = 6, umbral = 6         | excepción 422                               |
| TU-06 | Reservar turno GYM suspendido pero con excepción vigente → permitido         | impagos ≥ umbral, excepcion.valida_hasta ≥ hoy       | turno creado                                |
| TU-07 | Reservar fuera de disponibilidad del profesional → DisponibilidadException   | horario no cubre la franja                           | excepción 422                               |
| TU-08 | Reservar turno GYM con deuda por debajo del umbral → permitido sin excepción | impagos = 2, umbral = 6, sin excepción registrada    | turno creado; no se consulta `excepciones_morosidad` |
| TU-09 | Reservar turno de CONSULTORIO con el socio suspendido → permitido            | impagos ≥ umbral, tipo_turno = CONSULTORIO           | turno creado; la morosidad de gimnasio no se evalúa (Decisión de dominio 1) |
| TU-10 | La reserva de gimnasio no consulta disponibilidad de profesional             | `POST /api/turnos/gym`, socio habilitado             | turno creado con `profesional_id = NULL`; no se invoca el repositorio de disponibilidad |

---

## Nivel 2 — Pruebas de integración (Spring Boot Test + Testcontainers)

Prueban el stack completo API + base de datos con un PostgreSQL real en contenedor.

### Auth

| ID    | Caso                                                      | Método y URL               | Body                                     | Respuesta esperada                            |
|-------|-----------------------------------------------------------|----------------------------|------------------------------------------|-----------------------------------------------|
| PI-01 | Registro exitoso                                          | POST /api/auth/registro    | email único, pass ≥8 chars              | 201, JWT en body, y `rol` del usuario creado = `SOCIO_PACIENTE` |
| PI-02 | Registro con email duplicado                              | POST /api/auth/registro    | email ya existente                       | 409 Conflict                                  |
| PI-03 | Login correcto                                            | POST /api/auth/login       | `identificador` (email) + pass correctos | 200, JWT válido                               |
| PI-04 | Login con contraseña incorrecta                           | POST /api/auth/login       | `identificador` (email) + pass incorrecta | 401                                          |
| PI-05 | Acceso sin token a endpoint protegido                     | GET /api/personas          | —                                        | 401                                           |
| PI-06 | Acceso con rol insuficiente a una ruta de administración   | POST /api/admin/feriados/sincronizar | JWT de SOCIO_PACIENTE          | 403                                           |
| PI-18 | Registro con `rol` explícito en el body                  | POST /api/auth/registro    | `{email, contraseña, rol: "ADMIN"}`      | 400, ningún `usuario` creado                  |
| PI-22 | JWT expirado contra endpoint protegido                    | GET /api/auth/me           | JWT firmado con la clave real de la app, `exp` en el pasado | 401                           |
| PI-23 | JWT malformado contra endpoint protegido                  | GET /api/auth/me           | Header `Bearer esto-no-es-un-jwt`        | 401                                           |
| PI-24 | JWT con firma inválida contra endpoint protegido          | GET /api/auth/me           | JWT bien formado pero firmado con una clave distinta a la de la app | 401                |
| PI-25 | Registro con contraseña de menos de 8 caracteres          | POST /api/auth/registro    | `contraseña` de 6 caracteres              | 400, `ErrorResponse` con `status=400` y `path`, ningún `usuario` creado |
| PI-26 | Registro con email con formato inválido                   | POST /api/auth/registro    | `email` sin arroba/dominio                | 400, `ErrorResponse` con `status=400`, ningún `usuario` creado |

> **Alcance de PI-06 respecto de RNF-03.** RNF-03 exige que el control de acceso por rol se
> verifique en la capa de servicio y no solo en la presentación. PI-06 ejercita la regla
> declarativa `/api/admin/**` → `hasRole("ADMIN")` de `SecurityConfig`, que es capa de
> presentación: ninguno de los endpoints implementados hasta ahora necesita autorización por
> rol en el servicio, porque el registro y el login son públicos y `GET /api/auth/me` lo puede
> invocar cualquier usuario autenticado. El primero que sí la va a requerir es
> `POST /api/personas/vincular` (RF-31, exclusivo de ADMIN), y con él corresponde agregar el
> caso que verifique el rechazo **desde el servicio**, no solo desde el filtro. Se deja
> asentado para que la cobertura de RNF-03 no se dé por probada antes de tiempo.
>
> La ruta del caso se cambió de `GET /api/admin/personas` —que no existe— a
> `POST /api/admin/feriados/sincronizar`, que sí está implementada y declarada (RF-38). Con una
> ruta inexistente el test pasaba igual, porque el filtro rechaza por prefijo antes de resolver
> el controller: **daba verde sin demostrar nada**. Ver las convenciones de ruta en
> [`modulos.md`](../02-diseno/modulos.md).


### CORS

| ID    | Caso                                                      | Método y URL               | Body                                     | Respuesta esperada                            |
|-------|-----------------------------------------------------------|----------------------------|------------------------------------------|-----------------------------------------------|
| PI-27 | Preflight CORS sobre ruta pública                          | OPTIONS /api/health        | Headers `Origin` + `Access-Control-Request-Method: GET` | 200, `Access-Control-Allow-Origin` refleja el origen y `Access-Control-Allow-Methods` incluye `GET` |
| PI-28 | Preflight CORS sobre ruta protegida                       | OPTIONS /api/auth/me       | Headers `Origin` + `Access-Control-Request-Method: GET`, sin `Authorization` | 200 (no 401): la cadena de seguridad resuelve el preflight antes de exigir autenticación |
| PI-29 | Login con cuenta deshabilitada                            | POST /api/auth/login       | usuario con `activo = false` y contraseña correcta | 401 con el mismo mensaje que contraseña incorrecta |
| PI-37 | Login con DNI válido (persona con ficha) y contraseña correcta (RF-36) | POST /api/auth/login | `identificador` = DNI cargado en `personas.dni`, pass correcta | 200, JWT válido |
| PI-38 | Login con DNI de un usuario sin ficha en `personas` (recién autorregistrado o profesional) | POST /api/auth/login | `identificador` = DNI que no está en `personas.dni` | 401, mismo mensaje que credenciales inválidas |
| PI-39 | Login con DNI inexistente en todo el sistema               | POST /api/auth/login       | `identificador` = DNI que no existe        | 401, indistinguible de PI-38                  |

### Personas — ABM y baja lógica (`PersonaIT`)

| ID    | Caso                                                         | Método y URL                       | Body / precondición                                  | Respuesta esperada |
|-------|--------------------------------------------------------------|------------------------------------|------------------------------------------------------|--------------------|
| PI-61 | Alta presencial (RF-05)                                      | POST /api/personas                 | JWT ADMIN, `{email, contrasena, datos}` con DNI nuevo | 201, persona `ACTIVO`; el usuario creado es `SOCIO_PACIENTE` y puede loguearse |
| PI-62 | Baja lógica y reactivación                                   | PATCH /api/personas/{id}/baja, /reactivar | persona activa                                 | 200 `INACTIVO` con `fechaBaja`; la fila sigue en la base; segunda baja → 409; reactivar → `ACTIVO` sin `fechaBaja` |
| PI-63 | Listado filtrado por estado (RF-06)                          | GET /api/personas?estado=&q=       | persona dada de baja                                 | aparece con `INACTIVO`, no con `ACTIVO` |
| PI-64 | DNI repetido por la API                                      | POST /api/personas                 | DNI de una persona existente                         | 409, y no queda creado el usuario del segundo intento |
| PI-65 | DNI repetido directo en la base                              | `INSERT` con JdbcTemplate          | DNI existente                                        | lo rechaza `personas.dni UNIQUE`: la unicidad no depende del servicio |
| PI-66 | Baja sin fecha directo en la base                            | `UPDATE` con JdbcTemplate          | `estado = 'INACTIVO'`, `fecha_baja = NULL`           | lo rechaza `chk_fecha_baja` |
| PI-67 | Socio de gimnasio sin fecha de inicio de membresía           | POST /api/personas                 | `esSocioGym = true`, `fechaInicioMembresia = null`   | 400 |
| PI-68 | Autorización en el servicio (RNF-03)                         | GET /api/personas, GET /api/personas/{id}, PATCH …/baja | JWT de SOCIO_PACIENTE con ficha propia | listar → 403; leer su propia ficha → 200; dar de baja → 403 |
| PI-69 | Persona inexistente                                          | GET /api/personas/999999           | JWT ADMIN                                            | 404 |
| PI-70 | Edición (RF-07) y unicidad al editar                         | PUT /api/personas/{id}             | datos nuevos; luego el DNI de otra persona           | 200 con los datos nuevos (dejar de ser socio limpia la fecha de membresía); DNI ajeno → 409 |

> PI-68 es el primer caso que verifica el rechazo por rol **desde el servicio** y no desde el
> filtro: `/api/personas` no está bajo `/api/admin/**`, así que el 403 lo produce
> `PersonaService`. Con él queda cubierto lo que la nota de PI-06 dejaba pendiente para RNF-03.

### Personas — Vínculo con usuario existente

| ID    | Caso                                                      | Método y URL                  | Body                                     | Respuesta esperada                            |
|-------|-------------------------------------------------------------|----------------------------|------------------------------------------|-----------------------------------------------|
| PI-19 | Vínculo con email sin usuario                             | POST /api/personas/vincular   | email inexistente                        | 404, ninguna `persona` creada                 |
| PI-20 | Vínculo con usuario ya vinculado                          | POST /api/personas/vincular   | email de usuario con `persona` existente | 409                                            |
| PI-21 | Vínculo con actor no-ADMIN                                | POST /api/personas/vincular   | JWT de `SOCIO_PACIENTE` + body con email inexistente | 403 (no 404): la autorización se verifica antes de resolver el email |

> **Implementación.** `PersonaVinculoIT` cubre PI-19 a PI-21 y además el camino feliz (la ficha
> queda con el mismo `usuario_id` y la persona puede loguearse con su DNI), el rechazo de un body
> con contraseña (400, CA-07-3) y el de un usuario que no es `SOCIO_PACIENTE` (422).

### Turnos

| ID    | Caso                                                            | Resultado esperado                              |
|-------|----------------------------------------------------------------|--------------------------------------------------|
| PI-07 | Reserva exitosa en slot disponible                             | 201, turno con estado RESERVADO                  |
| PI-08 | Reserva en slot solapado → rechazada por EXCLUDE GIST         | 409 (constraint de BD capturada por API)         |
| PI-09 | Dos reservas simultáneas al mismo slot (race condition test)  | Solo una de las dos en 201; la otra en 409       |
| PI-10 | Reserva GYM de un socio suspendido y sin excepción             | 422 con mensaje de suspensión por morosidad      |
| PI-11 | Cancelación en tiempo, antes del inicio → CANCELADO_EN_TIEMPO | 200; el slot queda libre: otra persona lo reserva y obtiene 201 |
| PI-12 | Cancelación tardía pero **antes del inicio** → CANCELADO_TARDE | 200; el slot **también** queda libre: otra persona obtiene 201. El estado tardío no bloquea (RN-02) |
| PI-13 | Cancelación con la franja **ya iniciada** (`cancelado_en >= inicio`) | 200; el slot sigue ocupado: otra reserva en ese horario da 409 |
| PI-14 | Cupo de gimnasio tras una cancelación previa al inicio         | La franja vuelve a admitir una reserva: 201      |
| PI-15 | Cupo de gimnasio tras una cancelación con la franja iniciada   | La franja sigue completa: 409 "Cupo completo"    |
| PI-90 | El DNI del paciente solo se expone en la agenda del profesional | `GET /api/turnos/mi-agenda` (PROFESIONAL) incluye `pacienteDni`; `GET /api/turnos/mis-turnos`, `GET /api/turnos/{id}` (socio y ADMIN), `GET /api/turnos` (ADMIN) y `GET /api/turnos/disponibles` no incluyen el DNI |

### Gimnasio

Casos contra las reglas de `db/migration/V2__reglas_gimnasio.sql` (grilla horaria, cupo por franja, un turno por persona y día).

| ID    | Caso                                                            | Resultado esperado                              |
|-------|------------------------------------------------------------------|--------------------------------------------------|
| PI-30 | Reserva GYM fuera de grilla (hora no en punto o duración ≠ 60 min) | 422 (`chk_turno_gym_grilla` capturado por API)  |
| PI-31 | Reserva GYM un domingo                                          | 422 (`chk_turno_gym_grilla`: el domingo no está en la grilla) |
| PI-32 | Reserva GYM un sábado fuera de 09:00–12:00                      | 422 (`chk_turno_gym_grilla`: el sábado solo abre 09:00–12:00) |
| PI-33 | Reserva GYM L-V en la última franja (20:00–21:00)               | 201: termina justo a la hora de cierre |
| PI-34 | Reserva GYM L-V empezando a las 21:00 (terminaría 22:00)        | 422: la franja excede la hora de cierre (RN-14) |
| PI-35 | Reserva GYM sábado en la última franja (11:00–12:00)            | 201 |
| PI-36 | Reserva GYM sábado empezando a las 12:00                        | 422: el sábado cierra a las 12:00 |
| PI-81 | Reserva GYM en un feriado `INAMOVIBLE`                          | 422 con el nombre del feriado en el mensaje |
| PI-82 | Reserva GYM en un feriado `TRASLADABLE` **en la fecha corrida**, no en la nominal | 422 en la fecha corrida; 201 en la fecha nominal si ese año no es feriado |
| PI-83 | Reserva GYM en un día `NO_LABORABLE`                            | 201: las festividades religiosas no cierran el gimnasio (`cierra_gimnasio = FALSE`) |
| PI-40 | Reserva GYM en un cierre cargado por el ADMIN (`origen = 'MANUAL'`) | 422: el trigger no distingue el origen, solo `cierra_gimnasio` |
| PI-41 | Pago `SESION_CONSULTORIO` asociado a un turno de gimnasio | 422 (`trg_pago_sesion`, RN-20 a) |
| PI-42 | Pago `SESION_CONSULTORIO` a nombre de una persona distinta a la del turno | 422 (`trg_pago_sesion`, RN-20 b) |
| PI-43 | El mismo pago a nombre del titular del turno | 201: el caso válido no quedó bloqueado |
| PI-44 | Turno de consultorio para una persona `INACTIVO` | 422 (`trg_turno_persona_activa`, RN-21) |
| PI-45 | Turno de gimnasio para una persona `INACTIVO` | 422: la regla vale para los dos tipos de turno |
| PI-46 | Cancelar un turno de una persona dada de baja después del alta | 200: dar de baja no congela los turnos existentes |
| PI-47 | Dos turnos de consultorio superpuestos para la misma persona, con distinto profesional | 409 (`excl_turnos_persona_overlap`, RN-22) |
| PI-48 | Turno de gimnasio superpuesto con un turno de consultorio de la misma persona | 409: la exclusión no distingue el tipo de turno |
| PI-49 | Turno superpuesto con uno cancelado **antes** de su inicio | 201: la cancelación previa al inicio libera la franja (RN-02) |
| PI-50 | Excepción de morosidad cuyo `turno_id` es de otra persona | 422 (`trg_excepcion_morosidad`, RN-23) |
| PI-51 | Alta de excepción sin `turno_id` | 201: es la forma normal de darla de alta — el turno todavía no existe |
| PI-52 | Excepción `un_solo_uso` ya consumida (`turno_id` completado) | No se considera vigente: la segunda reserva vuelve a dar 422 por morosidad |
| PI-53 | Consultar el impacto de quitar una franja con 3 turnos futuros reservados | 200 con los 3 turnos (persona, fecha y hora); **no** se modifica nada |
| PI-54 | Quitar esa franja sin `confirmar=true` | 409; la disponibilidad queda intacta y los turnos siguen en `RESERVADO` |
| PI-55 | Quitar esa franja con `confirmar=true` | 200; los 3 turnos quedan en `CANCELADO_POR_PROFESIONAL` con motivo y `cancelado_por_usuario` cargados |
| PI-56 | Un turno **ya transcurrido** dentro de la franja quitada | No se toca: conserva su estado original (RN-24) |
| PI-57 | Reservar en el horario liberado por una cancelación en cascada | 201: `fn_turno_ocupa_lugar` liberó la franja sin modificarse |
| PI-58 | Notificaciones tras la cascada | Una fila `AVISO_CANCELACION` por cada paciente afectado (RF-27) |
| PI-59 | Falla el proveedor de email durante la cascada (reinterpretado, ver nota) | La cascada **queda confirmada**: disponibilidad reducida, turnos en `CANCELADO_POR_PROFESIONAL` y filas de notificación creadas. El email sale recién después del commit; si falla se reintenta una vez a los 10 s y, si vuelve a fallar, la notificación queda con `intentos = 2` y `exitoso = false` y aparece en la alerta del ADMIN. No se hace rollback de la cascada |
| PI-60 | **Ampliar** la disponibilidad (no reducirla) | 200 sin confirmación: no hay turnos que puedan quedar afuera |
| PI-84 | Reserva GYM de una persona con `es_socio_gym = false`          | 422 (trigger `fn_check_turno_gym`: no es socia activa del gimnasio) |
| PI-85 | Segunda reserva GYM de la misma persona el mismo día           | 409 (`uq_turno_gym_persona_dia`)                |
| PI-86 | Reserva GYM sobre una franja con el cupo completo              | 422 (trigger `fn_check_turno_gym`: cupo completo) |
| PI-87 | Cancelar un turno GYM libera el cupo de la franja               | 200 al cancelar; una reserva nueva sobre la misma franja responde 201 |
| PI-88 | Estado de gimnasio (`GET /api/turnos/gym/estado`) de un socio al día, uno suspendido y uno suspendido con excepción; matriz de roles | Al día: `suspendido = false`. Suspendido: `suspendido = true` con `periodosImpagos >= umbral`. Con excepción de un solo uso: `suspendido = false`, `excepcionVigente = true`, y vuelve a `suspendido = true` cuando la reserva la agota. El veredicto coincide con el de la reserva. Roles: socio propio → 200, socio ajeno → 403, ADMIN con `personaId` → 200, ADMIN sin `personaId` → 400, ADMIN con persona inexistente → 404, PROFESIONAL → 403, socio sin ficha → 422 |
| PI-89 | Persona con `es_socio_gym = false`: estado y reserva | El estado responde `esSocioGym = false` (y `umbral = 0`); la reserva da 422 con "no tiene membresía de gimnasio" (la rechaza el motor, ver PI-84) |

> **PI-59, reinterpretación aceptada.** El enunciado original ("o queda todo, o no queda nada") mezclaba dos cosas. La **cascada es atómica sobre los datos**: disponibilidad, cancelaciones y filas de notificación se guardan juntas o no se guarda nada (lo cubre `siElCambioDeDisponibilidadFalla_laCascadaSeRevierteCompleta`). El **email, en cambio, es un efecto externo** que no puede participar de la transacción: se despacha después del commit y su falla no deshace una cancelación ya decidida —sería peor dejar turnos de terceros vivos en un horario que el profesional ya no atiende—. Por eso la falla se resuelve con reintento y alerta, no con rollback.

| ID    | Caso | Resultado esperado | Cubierto por |
|-------|------|--------------------|--------------|
| PI-71 | Franja que se solapa con otra del mismo profesional y día (parcial, contenida, mismo inicio, o por modificación); también dentro de un reemplazo total | 409 y no se aplica ningún cambio; las contiguas se aceptan (RN-11) | `DisponibilidadIT` (`solapamientoConLasFranjasDelSeed_devuelve409YNoModificaNada`, `solapamientoParcialYContenido_enValentinaYFlorencia_devuelve409`, `batch_conSolapamientoInterno_devuelve409YNoDejaCambiosParciales`, `franjaContigua_seAcepta`); en la base, `MigracionV13IT.solapamiento_lanzaExclusionViolation` |
| PI-72 | Reintento y alerta de notificaciones: el primer fallo agenda un reintento; el segundo la deja `DEFINITIVA`; las `DEFINITIVA` y `HUERFANA` se listan | `intentos = 2`, `exitoso = false`; `GET /api/admin/notificaciones?fallidas=true` solo para ADMIN (socio → 403, sin token → 401) | `CascadaEmailFallidoIT.siElProveedorDeEmailFalla_laCascadaQuedaConfirmadaYLaNotificacionFallida`, `NotificacionIT.lista_definitivasYHuerfanas_peroNoExitosasNiEnCursoRecientes`, `NotificacionIT.eventoDeUnaTransaccionRevertida_noEnviaNada`; unitarios en `DespachadorNotificacionesTest` |
| PI-73 | Baja de profesional en dos pasos (RN-25): consultar el impacto y recién después confirmar | `GET .../baja/impacto` no modifica nada; `DELETE` sin `confirmar=true` y con turnos futuros → 409 con el impacto; con `confirmar=true` cancela en cascada, borra las franjas y deshabilita el usuario; sin turnos futuros se aplica directo | `CascadaDisponibilidadIT.bajaEnDosPasos_primeroElImpacto_despuesLaConfirmacion`, `CascadaDisponibilidadIT.bajaSinTurnosFuturos_noPideConfirmacion`, `ProfesionalIT.baja_conTurnoFuturoReservado_devuelve409YNoTocaNada`, `ProfesionalIT.baja_sinTurnosFuturos_desactivaProfesionalYUsuarioYBorraFranjas`, `CascadaDisponibilidadIT.siLaBajaConfirmadaFallaAMitad_seRevierteCompleta` |
| PI-74 | JWT todavía vigente de un usuario deshabilitado (`usuarios.activo = false`), por ejemplo un profesional dado de baja | 401: el token no autentica aunque no haya vencido | `ProfesionalIT.tokenVigenteDeUsuarioDeshabilitado_devuelve401`; unitario en `JwtAuthenticationFilterTest.usuarioDeshabilitado_noAutenticaYLaCadenaSigue` |
| PI-75 | Reactivar un profesional dado de baja | `PATCH /api/profesionales/{id}/reactivar` (ADMIN) deja `activo = true` en `profesionales` y `usuarios`, el login vuelve a funcionar y no reaparecen las franjas borradas en la baja; reactivar de nuevo → 409; no ADMIN → 403; inexistente → 404 | `ProfesionalIT` (`reactivar_trasLaBaja_devuelveAlProfesionalSinFranjasYPuedeLoguearse`, `reactivar_comoNoAdmin_devuelve403_einexistente_devuelve404`); unitarios en `ProfesionalServiceTest` y `ProfesionalTest` |

> **Implementación (Sprint 3, Profesionales).** PI-53 a PI-60 los ejercita `CascadaDisponibilidadIT`
> (PI-59 en su variante de email, `CascadaEmailFallidoIT`), con fechas calculadas relativas a "ahora"
> para que el escenario no caduque. Estos ITs corren solo contra Postgres real (Testcontainers) en CI.

> **Implementación (Sprint 4, consultorio y frontend).** `TurnoConsultorioIT` cubre PI-09
> (`pi09_dosReservasSimultaneasDelMismoSlot_unaGanaYLaOtraDa409`: dos hilos piden el mismo slot a
> la vez; uno recibe 201 y el otro 409, decide la base) y PI-12
> (`pi12_cancelacionTardiaAntesDelInicio_quedaCanceladoTardeYElSlotSeReserva`: cancelar con menos
> de 24 h da `CANCELADO_TARDE` y otra persona reserva el mismo slot con 201). PI-90 es
> `elDniDelPacienteSoloSeExponeEnLaAgendaDelProfesional`. `TurnoGymIT` cubre PI-88
> (`estadoGym_alDiaSuspendidoYConExcepcion_coincideConLaReserva` y `estadoGym_matrizDeRoles`) y
> PI-89 (`personaSinMembresiaDeGimnasio_estadoSinMembresiaYLaReservaLaRechazaElMotor`).
> PI-13 y PI-15 (cancelación con la franja ya iniciada) los cubre `TurnoFranjaIniciadaIT`: como
> la API no deja reservar un horario que ya empezó, el turno iniciado y el competidor se insertan
> directo en la base, y la cancelación pasa por la API. Se verifica que el motor siga contando el
> lugar como ocupado (`excl_turnos_overlap` en consultorio, "Cupo completo" en gimnasio).

> **Implementación (Sprint 4, gimnasio).** `TurnoServiceTest` cubre TU-03 a TU-06, TU-08 y
> TU-10; TU-01/TU-02 están en `TurnoTest` (la regla vive en la entidad) y TU-07/TU-09, con la
> reserva de consultorio, también en `TurnoServiceTest` y de punta a punta en
> `TurnoConsultorioIT` (que cubre además PI-07 y PI-08 en consultorio). `MorosidadServiceTest` cubre PU-01
> a PU-05 y PU-08 a PU-12. `TurnoGymIT` ejercita PI-07, PI-10, PI-11, PI-14, PI-30, PI-34,
> PI-45, PI-51, PI-52 y PI-85 a PI-87 contra Postgres real.

### Pagos

`PagoControllerIT` (Postgres real, Testcontainers) cubre PI-76 a PI-80 y PI-91 a PI-104. El nombre de cada método empieza con su ID (`pi76_…`, `pi91_…`) para que la trazabilidad doc ↔ test sea directa; un mismo PI puede tener más de una variante.

| ID    | Caso                                                      | Resultado esperado                              |
|-------|-----------------------------------------------------------|-------------------------------------------------|
| PI-76 | Registrar cuota mensual (período actual o futuro) y sesión de consultorio | 201; el pago devuelve `medio` y `fechaPago` y el medio queda guardado en la base |
| PI-77 | Registrar segunda cuota del mismo mes                     | 409 (`uq_cuota_mensual`)                        |
| PI-78 | Registrar pago de sesión sin `turnoId`                    | 422 (`chk_concepto_datos`)                      |
| PI-79 | Registrar segundo pago al mismo turno                     | 409 (`uq_pago_por_turno`)                       |
| PI-80 | Periodo con día distinto de 1 → rechazado                 | 422 (`chk_concepto_datos`: la regla del día 1 está dentro de esa restricción, no en una aparte; la base rechaza, no normaliza) |
| PI-91 | `medio` ausente o fuera del enum                          | 400                                             |
| PI-92 | Monto cero o negativo                                     | 400                                             |
| PI-93 | Pago de sesión de un turno de gimnasio, o de un turno de otra persona | 422 (`trg_pago_sesion`, RN-20)      |
| PI-94 | Cuota de una persona con `es_socio_gym = false`           | 422                                             |
| PI-95 | Cuota de un período anterior a `fecha_inicio_membresia`   | 422                                             |
| PI-96 | Pago de sesión de un turno cancelado                      | 422: la cancelación tardía se registra para la sanción, no genera cobro (RN-02) |
| PI-97 | SOCIO_PACIENTE o PROFESIONAL intenta registrar un pago    | 403: solo el ADMIN registra                     |
| PI-98 | Estado de cuenta: el socio ve el propio pero no el ajeno; el profesional y la persona inexistente | 200 propio; 403 ajeno y profesional; 404 inexistente (`/mi-estado-cuenta` incluido) |
| PI-99 | `GET /api/pagos/mi-estado-cuenta` de un usuario sin ficha | 422 ("ficha")                                  |
| PI-100 | Mezcla de períodos pagado / impago / pendiente           | `PAGADO` con su pago y medio; el último período `PENDIENTE`; `periodosImpagos` coincide con los `IMPAGO`; sin suspensión ni excepción |
| PI-101 | Sesión pagada de una persona que no es socia             | Aparece en `sesiones` (con medio y fecha del turno), suma en `totales` y no hay períodos |
| PI-102 | Pago de sesión con un `turnoId` inexistente              | 422 por la clave foránea ("el turno indicado no existe") |
| PI-103 | Estado de cuenta y `GET /api/turnos/gym/estado`          | Coinciden en `suspendido`, `periodosImpagos` y `umbral`, con y sin excepción vigente: es la misma regla (`MorosidadService`) |
| PI-104 | Registrar la cuota de una persona dada de baja (`INACTIVO`) | 201: sigue siendo cobrable                   |

Además, `personaInexistente_da404` verifica que registrar un pago para una persona que no existe responde 404.

> **Gracia de 10 días.** El límite de cada período es `periodo + 1 mes + 10 días`: hasta ese día inclusive figura `PENDIENTE`; desde el día siguiente, `IMPAGO` (RN-01 prevalece sobre el viejo CA-06-2). Los bordes los cubre `MorosidadServiceTest` (PU-02, PU-03, PU-09).

> **Mercado Pago** queda fuera del alcance (RFC-001): los pagos se cargan a mano. `medio_pago` está diseñado para sumar `MERCADO_PAGO` más adelante con su propia migración.

---

## Nivel 3 — Smoke test en producción (manual, previo a cada entrega)

Checklist de verificación manual sobre el entorno de Render + Vercel + Supabase:

```
□ Render responde GET /api/health en < 60 s (incluye arranque en frío)
□ Supabase activo (no pausado); tablas visibles en el dashboard
□ Login con cada rol (admin, profesional, socio_paciente)
□ Admin puede crear una persona con DNI único
□ Socio puede ver slots disponibles de Valentina Méndez
□ Socio puede reservar un turno → recibe email de confirmación
□ Profesional ve el turno en su agenda → puede marcarlo COMPLETADO
□ Admin registra cuota mensual para el socio → estado de cuenta actualizado
□ Cancelación antes del inicio libera el slot (en tiempo o tarde); con el turno ya iniciado lo mantiene bloqueado (RN-02)
□ Socio suspendido (Juan García) reserva gym gracias a su excepción vigente; el admin la revisa en su historial
□ Socio suspendido sin excepción vigente intenta reservar gym → recibe 422 por morosidad
```

**Frecuencia:** antes de cada entrega de cátedra y de la defensa oral.

---

## Cobertura mínima esperada

| Componente                  | Cobertura objetivo (líneas) |
|-----------------------------|----------------------------|
| PagoService                 | 90 %                       |
| TurnoService                | 90 %                       |
| AuthService                 | 90 %                       |
| Constraints de BD (via PI)  | 100 % de los casos críticos|
| Controladores REST          | 90 % (happy path + errores)|

Las métricas de cobertura se verifican con JaCoCo en el build de CI (GitHub Actions —
`.github/workflows/backend-ci.yml`, job `backend`): el gate está configurado como
`BUNDLE`/`LINE`/`COVEREDRATIO` con mínimo `0.90`, y el build de `mvn verify` **falla** si la
cobertura no lo alcanza (no es un reporte informativo).
