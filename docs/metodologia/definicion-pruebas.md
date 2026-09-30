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
| PI-06 | Acceso con rol insuficiente (SOCIO_PACIENTE a /admin/)    | GET /api/admin/personas    | JWT de SOCIO_PACIENTE                    | 403                                           |
| PI-18 | Registro con `rol` explícito en el body                  | POST /api/auth/registro    | `{email, contraseña, rol: "ADMIN"}`      | 400, ningún `usuario` creado                  |
| PI-22 | JWT expirado contra endpoint protegido                    | GET /api/auth/me           | JWT firmado con la clave real de la app, `exp` en el pasado | 401                           |
| PI-23 | JWT malformado contra endpoint protegido                  | GET /api/auth/me           | Header `Bearer esto-no-es-un-jwt`        | 401                                           |
| PI-24 | JWT con firma inválida contra endpoint protegido          | GET /api/auth/me           | JWT bien formado pero firmado con una clave distinta a la de la app | 401                |
| PI-25 | Registro con contraseña de menos de 8 caracteres          | POST /api/auth/registro    | `contraseña` de 6 caracteres              | 400, `ErrorResponse` con `status=400` y `path`, ningún `usuario` creado |
| PI-26 | Registro con email con formato inválido                   | POST /api/auth/registro    | `email` sin arroba/dominio                | 400, `ErrorResponse` con `status=400`, ningún `usuario` creado |

> **Alcance de PI-06 respecto de RNF-03.** RNF-03 exige que el control de acceso por rol se
> verifique en la capa de servicio y no solo en la presentación. PI-06 ejercita hoy la regla
> declarativa `/api/admin/**` → `hasRole("ADMIN")` de `SecurityConfig`, que es capa de
> presentación: ninguno de los endpoints implementados hasta ahora necesita autorización por
> rol en el servicio, porque el registro y el login son públicos y `GET /api/auth/me` lo puede
> invocar cualquier usuario autenticado. El primero que sí la va a requerir es
> `POST /api/personas/vincular` (RF-31, exclusivo de ADMIN), y con él corresponde agregar el
> caso que verifique el rechazo **desde el servicio**, no solo desde el filtro. Se deja
> asentado para que la cobertura de RNF-03 no se dé por probada antes de tiempo.


### CORS

| ID    | Caso                                                      | Método y URL               | Body                                     | Respuesta esperada                            |
|-------|-----------------------------------------------------------|----------------------------|------------------------------------------|-----------------------------------------------|
| PI-27 | Preflight CORS sobre ruta pública                          | OPTIONS /api/health        | Headers `Origin` + `Access-Control-Request-Method: GET` | 200, `Access-Control-Allow-Origin` refleja el origen y `Access-Control-Allow-Methods` incluye `GET` |
| PI-28 | Preflight CORS sobre ruta protegida                       | OPTIONS /api/auth/me       | Headers `Origin` + `Access-Control-Request-Method: GET`, sin `Authorization` | 200 (no 401): la cadena de seguridad resuelve el preflight antes de exigir autenticación |
| PI-29 | Login con cuenta deshabilitada                            | POST /api/auth/login       | usuario con `activo = false` y contraseña correcta | 401 con el mismo mensaje que contraseña incorrecta |
| PI-37 | Login con DNI válido (persona con ficha) y contraseña correcta (RF-36) | POST /api/auth/login | `identificador` = DNI cargado en `personas.dni`, pass correcta | 200, JWT válido |
| PI-38 | Login con DNI de un usuario sin ficha en `personas` (recién autorregistrado o profesional) | POST /api/auth/login | `identificador` = DNI que no está en `personas.dni` | 401, mismo mensaje que credenciales inválidas |
| PI-39 | Login con DNI inexistente en todo el sistema               | POST /api/auth/login       | `identificador` = DNI que no existe        | 401, indistinguible de PI-38                  |

### Personas — Vínculo con usuario existente

| ID    | Caso                                                      | Método y URL                  | Body                                     | Respuesta esperada                            |
|-------|-------------------------------------------------------------|----------------------------|------------------------------------------|-----------------------------------------------|
| PI-19 | Vínculo con email sin usuario                             | POST /api/personas/vincular   | email inexistente                        | 404, ninguna `persona` creada                 |
| PI-20 | Vínculo con usuario ya vinculado                          | POST /api/personas/vincular   | email de usuario con `persona` existente | 409                                            |
| PI-21 | Vínculo con actor no-ADMIN                                | POST /api/personas/vincular   | JWT de `SOCIO_PACIENTE` + body con email inexistente | 403 (no 404): la autorización se verifica antes de resolver el email |

### Turnos

| ID    | Caso                                                            | Resultado esperado                              |
|-------|----------------------------------------------------------------|--------------------------------------------------|
| PI-07 | Reserva exitosa en slot disponible                             | 201, turno con estado RESERVADO                  |
| PI-08 | Reserva en slot solapado → rechazada por EXCLUDE GIST         | 409 (constraint de BD capturada por API)         |
| PI-09 | Dos reservas simultáneas al mismo slot (race condition test)  | Solo una de las dos en 201; la otra en 409       |
| PI-10 | Reserva GYM sin excepción por moroso                          | 422 con mensaje de morosidad                     |
| PI-11 | Cancelación en tiempo → estado CANCELADO_EN_TIEMPO            | 200, slot liberado (verificar EXCLUDE no bloquea)|
| PI-12 | Cancelación tardía → estado CANCELADO_TARDE                   | 200, slot sigue bloqueado (EXCLUDE activo)       |

### Gimnasio

Casos contra las reglas de `db/migration/V2__reglas_gimnasio.sql` (grilla horaria, cupo por franja, un turno por persona y día).

| ID    | Caso                                                            | Resultado esperado                              |
|-------|------------------------------------------------------------------|--------------------------------------------------|
| PI-30 | Reserva GYM fuera de grilla (hora no en punto o duración ≠ 60 min) | 422 (`chk_turno_gym_grilla` capturado por API)  |
| PI-31 | Reserva GYM un domingo                                          | 422 (`chk_turno_gym_grilla`: el domingo no está en la grilla) |
| PI-32 | Reserva GYM un sábado fuera de 09:00–12:00                      | 422 (`chk_turno_gym_grilla`: el sábado solo abre 09:00–12:00) |
| PI-33 | Reserva GYM de una persona con `es_socio_gym = false`          | 422 (trigger `fn_check_turno_gym`: no es socia activa del gimnasio) |
| PI-34 | Segunda reserva GYM de la misma persona el mismo día           | 409 (`uq_turno_gym_persona_dia`)                |
| PI-35 | Reserva GYM sobre una franja con el cupo completo              | 422 (trigger `fn_check_turno_gym`: cupo completo) |
| PI-36 | Cancelar un turno GYM libera el cupo de la franja               | 200 al cancelar; una reserva nueva sobre la misma franja responde 201 |

### Pagos

| ID    | Caso                                                      | Resultado esperado                              |
|-------|-----------------------------------------------------------|-------------------------------------------------|
| PI-13 | Registrar cuota mensual                                   | 201, pago creado                                |
| PI-14 | Registrar segunda cuota del mismo mes                     | 409 (uq_cuota_mensual)                         |
| PI-15 | Registrar pago de sesión para turno sin turno_id         | 422 (chk_concepto_datos)                       |
| PI-16 | Registrar segundo pago al mismo turno                     | 409 (uq_pago_por_turno)                        |
| PI-17 | Periodo con día distinto de 1 → rechazado                 | 422 (chk_periodo_primer_dia)                   |

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
□ Cancelación con >24 h libera el slot; con <24 h lo mantiene bloqueado
□ Socio moroso (Juan García) intenta reservar gym → recibe mensaje de bloqueo
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
