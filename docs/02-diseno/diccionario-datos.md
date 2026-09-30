# Diccionario de Datos — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

---

## Tipos enumerados

| Tipo | Valores |
|------|---------|
| `rol_usuario` | `SOCIO_PACIENTE` · `PROFESIONAL` · `ADMIN` |
| `estado_persona` | `ACTIVO` · `INACTIVO` |
| `especialidad` | `NUTRICION` · `PSICOLOGIA` · `KINESIOLOGIA` |
| `tipo_turno` | `CONSULTORIO` · `GYM` |
| `estado_turno` | `RESERVADO` · `COMPLETADO` · `AUSENTE` · `CANCELADO_EN_TIEMPO` · `CANCELADO_TARDE` · `CANCELADO_POR_PROFESIONAL` |
| `concepto_pago` | `CUOTA_MENSUAL` · `SESION_CONSULTORIO` |
| `tipo_feriado` | `INAMOVIBLE` · `TRASLADABLE` · `TURISTICO` · `NO_LABORABLE` |
| `origen_feriado` | `OFICIAL` · `MANUAL` |
| `tipo_notificacion` | `CONFIRMACION_TURNO` · `AVISO_CANCELACION` · `RECORDATORIO` · `AVISO_DEUDA` · `AVISO_SUSPENSION` |

---

## Tabla: `usuarios`

Credenciales de acceso al sistema. Toda persona o profesional tiene exactamente un usuario asociado.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `email` | `VARCHAR(255)` | NO | UNIQUE | Dirección de email; usada como nombre de usuario |
| `password_hash` | `VARCHAR(255)` | NO | — | Hash bcrypt de la contraseña |
| `rol` | `rol_usuario` | NO | ENUM | Rol único del usuario en el sistema |
| `activo` | `BOOLEAN` | NO | DEFAULT TRUE | FALSE = cuenta deshabilitada; no implica baja de persona |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación del registro |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Limitación MVP documentada:** un usuario tiene exactamente un rol. Un profesional que también es socio del gimnasio necesita dos cuentas con dos emails distintos.

---

## Tabla: `personas`

Identidad única de cada socio o paciente del centro. Una sola fila por persona real, independientemente de si usa el gimnasio, los consultorios o ambos.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `usuario_id` | `BIGINT` | NO | FK usuarios · UNIQUE | Cuenta de acceso asociada (1:1) |
| `nombre` | `VARCHAR(100)` | NO | — | Nombre/s de la persona |
| `apellido` | `VARCHAR(100)` | NO | — | Apellido/s de la persona |
| `dni` | `VARCHAR(20)` | NO | UNIQUE | Documento Nacional de Identidad; unicidad garantizada por motor |
| `telefono` | `VARCHAR(30)` | SÍ | — | Teléfono de contacto; opcional |
| `fecha_nacimiento` | `DATE` | SÍ | — | Fecha de nacimiento; opcional |
| `estado` | `estado_persona` | NO | ENUM · DEFAULT 'ACTIVO' | ACTIVO / INACTIVO (baja lógica) |
| `es_socio_gym` | `BOOLEAN` | NO | DEFAULT FALSE | TRUE si tiene membresía de gimnasio activa |
| `fecha_inicio_membresia` | `DATE` | SÍ | CHECK ligado a `es_socio_gym` | Mes/día desde el que se deben cuotas de gimnasio; NOT NULL si y solo si `es_socio_gym = TRUE` |
| `fecha_alta` | `DATE` | NO | DEFAULT CURRENT_DATE | Fecha de registro en el centro |
| `fecha_baja` | `DATE` | SÍ | ≥ fecha_alta | Obligatoria si estado = INACTIVO; nula si estado = ACTIVO |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Restricciones cruzadas:**

- `chk_fecha_baja`: `(estado = 'INACTIVO' AND fecha_baja IS NOT NULL AND fecha_baja >= fecha_alta) OR (estado = 'ACTIVO' AND fecha_baja IS NULL)`

  Una sola restricción cubre **las dos** condiciones de la baja lógica: que el estado y la fecha sean coherentes entre sí, y que la baja no sea anterior al alta. No existe una `chk_baja_logica` aparte — están juntas porque describen el mismo hecho y separarlas permitiría una fila que satisface una y viola la otra.

- `chk_fecha_inicio_membresia`: `(es_socio_gym = TRUE AND fecha_inicio_membresia IS NOT NULL) OR (es_socio_gym = FALSE AND fecha_inicio_membresia IS NULL)`. Evita que un socio nuevo aparezca moroso desde el día 1 y que el cálculo por "último período pagado" salte meses sin pagar.

**Triggers:** `trg_personas_updated` mantiene `actualizado_en`. El efecto de la baja lógica sobre los turnos no se controla desde esta tabla sino desde `turnos`, con `trg_turno_persona_activa` (RN-21).

**Normalización:** los datos de personas se mantienen separados de `usuarios` para reflejar la diferencia conceptual entre identidad (persona real) y credencial de acceso. Una persona podría existir sin acceso digital si el centro la crea internamente, aunque en el MVP toda persona requiere usuario.

---

## Tabla: `profesionales`

Datos específicos de los profesionales del centro. Complementa al usuario con información de especialidad y disponibilidad.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `usuario_id` | `BIGINT` | NO | FK usuarios · UNIQUE | Cuenta de acceso asociada (1:1) |
| `nombre` | `VARCHAR(100)` | NO | — | Nombre/s del profesional |
| `apellido` | `VARCHAR(100)` | NO | — | Apellido/s del profesional |
| `especialidad` | `especialidad` | NO | ENUM | NUTRICION · PSICOLOGIA · KINESIOLOGIA |
| `duracion_turno_minutos` | `INT` | NO | > 0 | Duración estándar del turno; valores iniciales: 30/50/45 min |
| `activo` | `BOOLEAN` | NO | DEFAULT TRUE | FALSE = baja lógica del profesional |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

---

## Tabla: `disponibilidad_profesional`

Franjas horarias recurrentes en las que cada profesional está disponible para atender turnos. Se utiliza para calcular los slots disponibles.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `profesional_id` | `BIGINT` | NO | FK profesionales | Profesional al que pertenece la franja |
| `dia_semana` | `SMALLINT` | NO | BETWEEN 1 AND 7 | Día: 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo (Java DayOfWeek) |
| `hora_inicio` | `TIME` | NO | < hora_fin | Inicio de la franja de atención |
| `hora_fin` | `TIME` | NO | > hora_inicio | Fin de la franja de atención |
| `activo` | `BOOLEAN` | NO | DEFAULT TRUE | FALSE = franja temporalmente inactiva |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Anti-solapamiento:** el trigger `trg_disponibilidad_overlap` —que ejecuta `fn_check_disponibilidad_overlap()`— impide insertar una franja que se superponga con otra franja **activa** del mismo profesional en el mismo día (RN-11).

**Reducir una franja con turnos reservados** no es un problema de esta tabla sino del servicio: cancela en cascada los turnos futuros que quedan afuera, previa confirmación (RN-24).

---

## Tabla: `turnos`

Reservas de slots entre una persona y un profesional (consultorio) o del gimnasio (gym). Registra el ciclo de vida completo de la reserva.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `persona_id` | `BIGINT` | NO | FK personas | Persona que reserva el turno |
| `profesional_id` | `BIGINT` | SÍ | FK profesionales | NULL solo si tipo_turno = 'GYM' |
| `tipo_turno` | `tipo_turno` | NO | ENUM · DEFAULT 'CONSULTORIO' | CONSULTORIO (requiere profesional) · GYM (sin profesional) |
| `inicio` | `TIMESTAMPTZ` | NO | < fin | Inicio del turno (fecha y hora con zona horaria) |
| `fin` | `TIMESTAMPTZ` | NO | > inicio | Fin estimado del turno |
| `estado` | `estado_turno` | NO | ENUM · DEFAULT 'RESERVADO' | Ver ciclo de vida abajo |
| `reservado_por_usuario_id` | `BIGINT` | NO | FK usuarios | Usuario que creó la reserva (la propia persona o un ADMIN) |
| `cancelado_en` | `TIMESTAMPTZ` | SÍ | Obligatorio si cancelado | Fecha y hora de la cancelación |
| `cancelado_por_usuario` | `BIGINT` | SÍ | FK usuarios · Obligatorio si cancelado | Siempre registrado: puede ser socio, profesional o admin |
| `motivo_cancelacion` | `TEXT` | SÍ | Obligatorio si cancelado | Razón de la cancelación |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Ciclo de vida del estado:**

```
RESERVADO ──► COMPLETADO          (profesional o admin, al finalizar la atención)
          ──► AUSENTE             (profesional o admin, cuando el paciente no se presenta)
          ──► CANCELADO_EN_TIEMPO (aviso con ≥ 24 h en consultorio / ≥ 2 h en gym)
          ──► CANCELADO_TARDE     (aviso con menos anticipación que el umbral)
          ──► CANCELADO_POR_PROFESIONAL
                                  (el profesional redujo su disponibilidad, RN-24)
```

Los dos primeros estados de cancelación registran **la anticipación con la que avisó el paciente**; `CANCELADO_POR_PROFESIONAL` marca una cancelación que el paciente no decidió y que por lo tanto no le computa (RN-24). Que el lugar se libere o no lo decide un dato distinto del estado: si `cancelado_en` es anterior al `inicio` del turno, el lugar se libera — incluso siendo `CANCELADO_TARDE`.

**Ocupación del lugar (`fn_turno_ocupa_lugar`):** un turno ocupa su lugar si su estado es `RESERVADO`, `COMPLETADO` o `AUSENTE`, **o** si fue cancelado a partir del inicio de la franja (`cancelado_en >= inicio`). Una cancelación registrada antes del inicio libera el lugar, sea en tiempo o tarde: el estado registra la anticipación del aviso, no decide la ocupación (RN-02, RN-03). Es el mismo criterio que ya regía para `AUSENTE` — una vez que la franja empezó, el lugar se consumió (RN-08).

La función está declarada `IMMUTABLE` en `V8__ocupacion_por_inicio_del_turno.sql` y la usan los **tres** controles del motor, para que no puedan divergir entre sí:

- `excl_turnos_overlap` — `EXCLUDE USING GIST (profesional_id WITH =, tstzrange(inicio, fin, '[)') WITH &&) WHERE (profesional_id IS NOT NULL AND fn_turno_ocupa_lugar(estado, inicio, cancelado_en))`. Los turnos GYM no lo verifican: no tienen profesional asignado.
- `excl_turnos_persona_overlap` — el espejo del anterior, sobre `persona_id` y **sin filtrar por tipo**: una persona no puede tener dos turnos superpuestos, ni siquiera uno de gimnasio y otro de consultorio (RN-22). Nadie puede estar entrenando y sentado en un consultorio al mismo tiempo.
- `trg_turno_persona_activa` — no se reservan turnos para una persona `INACTIVO`, en ningún tipo de turno (RN-21). Dar de baja no invalida los turnos ya existentes; el trigger solo actúa al insertar o modificar.
- `trg_turno_gym` — cuenta la ocupación de la franja contra `configuracion_gym.cupo_por_franja`.
- `uq_turno_gym_persona_dia` — índice único parcial: un solo turno de gimnasio por persona y día.

> Como la función aparece en el predicado de un `EXCLUDE` y de dos índices parciales, cambiar su semántica exige recrear esos tres objetos en la misma migración: PostgreSQL no reconstruye un índice porque se haya redefinido una función.

**Regla de morosidad (RN-01):** si `tipo_turno = 'GYM'` y `personas.es_socio_gym = TRUE`, la API cuenta los períodos mensuales impagos acumulados desde `personas.fecha_inicio_membresia`. Un período `P` se cuenta como impago cuando `NOW() > (P + 1 mes + 10 días)` y no existe una cuota `CUOTA_MENSUAL` registrada para ese `P`; un mes salteado sigue contando aunque se hayan pagado meses posteriores. La reserva se rechaza solo cuando ese total **alcanza o supera** `configuracion_gym.meses_tolerancia_morosidad` (6 por defecto): por debajo del umbral el socio tiene deuda pero conserva el acceso. La validación ocurre en la capa de servicio Java, no en el motor, porque depende de `NOW()` y de la existencia de una excepción vigente (RN-09).

---

## Tabla: `configuracion_gym`

Parámetros operativos del gimnasio. Tabla de fila única (`id = 1`) que centraliza las políticas configurables del establecimiento: el cupo máximo por franja horaria y la tolerancia de morosidad.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `SMALLINT` | NO | PK · DEFAULT 1 | Fila única de configuración |
| `cupo_por_franja` | `INT` | NO | > 0 | Máximo de personas con turno de gym activo en una misma franja horaria |
| `meses_tolerancia_morosidad` | `SMALLINT` | NO | > 0 · DEFAULT 6 | Períodos mensuales impagos acumulados que se toleran antes de suspender al socio de la actividad del gimnasio (RN-01) |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Restricciones:**
- `chk_configuracion_gym_fila_unica`: `id = 1`
- `chk_cupo_positivo`: `cupo_por_franja > 0`
- `chk_tolerancia_morosidad_positiva`: `meses_tolerancia_morosidad > 0`

**Uso:** el trigger `trg_turno_gym` sobre `turnos` lee `cupo_por_franja` para rechazar una reserva de gimnasio si la franja ya alcanzó el cupo máximo. `meses_tolerancia_morosidad`, en cambio, **no lo lee ningún trigger**: lo consulta la capa de servicio al evaluar RN-01, porque esa regla depende de `NOW()` y de la vigencia de una excepción. No tiene claves foráneas: son parámetros globales del sistema, no entidades relacionadas con personas ni turnos puntuales.

**Por qué son parámetros y no literales:** tanto el cupo como el umbral de tolerancia son políticas comerciales del establecimiento, no invariantes del dominio. El valor por defecto de `meses_tolerancia_morosidad` (6) proviene del relevamiento de campo en el Centro Deportivo Jerárquicos (28/09/2026).

---

## Tabla: `feriados`

Calendario de días no laborables en los que el gimnasio no abre (RN-14). Se crea **vacía**: la puebla el importador contra la fuente oficial (RF-38), y el ADMIN puede corregir filas o agregar cierres propios del centro.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `fecha` | `DATE` | NO | PK | Fecha del feriado en hora de Argentina; una fila por fecha |
| `descripcion` | `VARCHAR(200)` | NO | no vacía | Nombre del feriado, para que el aviso al socio diga por qué no hay franjas |
| `tipo` | `tipo_feriado` | NO | ENUM | `INAMOVIBLE` · `TRASLADABLE` · `TURISTICO` · `NO_LABORABLE`, según la clasificación de la fuente oficial |
| `cierra_gimnasio` | `BOOLEAN` | NO | — | Si el gimnasio no abre ese día |
| `origen` | `origen_feriado` | NO | ENUM · DEFAULT 'OFICIAL' | `OFICIAL` (importado) · `MANUAL` (cargado por el ADMIN) |
| `sincronizado_en` | `TIMESTAMPTZ` | SÍ | ligado a `origen` | Última sincronización; `NULL` en las filas manuales |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de carga |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Restricciones:**
- `chk_feriado_descripcion_no_vacia`: `btrim(descripcion) <> ''`
- `chk_feriado_origen_sincronizado`: `(origen = 'OFICIAL' AND sincronizado_en IS NOT NULL) OR (origen = 'MANUAL' AND sincronizado_en IS NULL)`

**Por qué el calendario no se escribe a mano:** no es deducible. En 2026 el trasladable del 17/06 (Güemes) cayó el 15/06, el del 20/11 cayó el 23/11, y el 09/11 fue feriado **por decreto** (visita papal). Ninguna lista fija puede anticipar un feriado creado por decreto ni el corrimiento anual de los trasladables, así que se sincroniza desde el dataset del Estado (RF-38).

**Por qué `cierra_gimnasio` es una columna y no se deriva del tipo:** los `NO_LABORABLE` son festividades religiosas que rigen para quien las profesa, no un cierre del establecimiento — el gimnasio abre. Tenerlo explícito permite además que el ADMIN cargue un cierre propio (mantenimiento, feriado provincial) sin pelear con la clasificación oficial.

**Dónde se valida:** en el trigger `trg_turno_gym`, **no** en `chk_turno_gym_grilla`. Un `CHECK` no puede consultar otra tabla —PostgreSQL lo prohíbe porque la restricción no se reevaluaría al cambiar esa tabla—, y por eso `fn_franja_gym_valida` es `IMMUTABLE` y solo mira el timestamp que recibe. El trigger es plpgsql, corre en cada `INSERT`/`UPDATE` y ya consulta `personas` y `configuracion_gym`.

**La reserva nunca consulta la API:** lee esta tabla. Si el servicio externo se cae, el gimnasio tiene que poder seguir vendiendo turnos.

**Limitación conocida:** declarar un feriado **no** cancela los turnos ya reservados para esa fecha. El trigger valida al insertar o modificar, no retroactivamente. Quien carga un feriado con turnos tomados tiene que cancelarlos.

**Alcance:** aplica a los turnos de gimnasio. Los de consultorio dependen de la disponibilidad que carga cada profesional (RF-14), que es quien decide si atiende un feriado.

---

## Tabla: `excepciones_morosidad`

Excepciones a la regla de morosidad (RN-01), autorizadas explícitamente por administración. Levantan la **suspensión** de un socio; un socio con deuda por debajo del umbral no está bloqueado y no necesita excepción.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `persona_id` | `BIGINT` | NO | FK personas | Persona beneficiaria de la excepción |
| `autorizado_por` | `BIGINT` | NO | FK usuarios (rol ADMIN) | Administrador que autorizó |
| `turno_id` | `BIGINT` | SÍ | FK turnos · misma persona | **Turno que consumió** la excepción; `NULL` mientras no se usó. No es un dato de alta |
| `un_solo_uso` | `BOOLEAN` | NO | DEFAULT FALSE | `TRUE`: habilita una sola reserva y se agota al usarse. `FALSE`: vale para cualquier turno hasta `valida_hasta` |
| `motivo` | `TEXT` | NO | — | Justificación de la excepción |
| `valida_hasta` | `DATE` | NO | — | La excepción expira en esta fecha |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |

**Por qué `turno_id` no se carga al dar de alta la excepción (RN-23):** una excepción sirve para **poder reservar**, así que en el momento en que se la necesita el turno todavía no existe. Pedirlo como dato de entrada lo vuelve imposible de completar. La columna se invirtió: registra qué turno **consumió** la excepción, y la escribe el servicio después de crear el turno. Eso además le da un significado preciso a lo *puntual* — `un_solo_uso = TRUE` más `turno_id IS NULL` es exactamente "todavía le queda el uso".

**Vigencia**, tal como la consulta el servicio:

```sql
valida_hasta >= CURRENT_DATE AND (NOT un_solo_uso OR turno_id IS NULL)
```

**Validación de pertenencia:** el trigger `trg_excepcion_morosidad` impide que `turno_id` apunte al turno de otra persona. Es una regla de integridad que cruza dos tablas, así que no puede expresarse con un `CHECK`.

---

## Tabla: `pagos`

Registro de pagos realizados. Maneja dos conceptos diferenciados: cuotas mensuales de gimnasio y sesiones de consultorio.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `persona_id` | `BIGINT` | NO | FK personas | Persona que realiza el pago |
| `concepto` | `concepto_pago` | NO | ENUM | CUOTA_MENSUAL · SESION_CONSULTORIO |
| `monto` | `NUMERIC(10,2)` | NO | > 0 | Importe abonado |
| `periodo` | `DATE` | SÍ | Día 1 del mes · Solo si CUOTA_MENSUAL | Mes al que corresponde la cuota (p.ej. 2026-09-01) |
| `turno_id` | `BIGINT` | SÍ | FK turnos · UNIQUE · Solo si SESION | Turno abonado; garantiza un único pago por turno |
| `registrado_por_usuario` | `BIGINT` | NO | FK usuarios | Admin que registró el pago (siempre requerido en MVP) |
| `fecha_pago` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Momento en que se registró el pago |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |

**Restricciones:**
- `chk_concepto_datos`: `(concepto = 'CUOTA_MENSUAL' AND periodo IS NOT NULL AND turno_id IS NULL AND EXTRACT(DAY FROM periodo) = 1) OR (concepto = 'SESION_CONSULTORIO' AND turno_id IS NOT NULL AND periodo IS NULL)`

  El concepto es mutuamente excluyente, y **la regla del primer día del mes está dentro de esta misma restricción**: no existe una `chk_periodo_primer_dia` aparte. `periodo` identifica un mes, no un día — normalizarlo al día 1 es lo que hace que `uq_cuota_mensual` pueda detectar dos cuotas del mismo período.

- `uq_pago_por_turno`: índice único parcial sobre `turno_id WHERE turno_id IS NOT NULL`
- `uq_cuota_mensual`: índice único parcial sobre `(persona_id, periodo) WHERE periodo IS NOT NULL`

**Coherencia con el turno abonado (RN-20, `trg_pago_sesion`):** un pago `SESION_CONSULTORIO` tiene que apuntar a un turno de tipo `CONSULTORIO` y estar a nombre de la persona de ese turno.

`chk_concepto_datos` ya exigía que la sesión traiga `turno_id` y la cuota no — eso es todo lo que un `CHECK` alcanza a ver, porque solo puede mirar columnas de su propia fila. Lo que faltaba es **de qué tipo** es ese turno y **de quién** es, y para eso hace falta leer `turnos`. Por qué importa cada una:

- Un turno de gimnasio no genera honorarios de sesión: no hay profesional que atienda. Del gimnasio se cobra la cuota mensual.
- Un pago a nombre de un tercero descuadra los dos estados de cuenta: a uno le figura un pago que no le corresponde y al otro le sigue faltando el suyo.

---

## Tabla: `notificaciones`

Log de emails enviados al sistema. Registra todos los envíos para auditoría; no se eliminan registros.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `persona_id` | `BIGINT` | NO | FK personas | Persona destinataria |
| `turno_id` | `BIGINT` | SÍ | FK turnos | Turno relacionado; NULL para notificaciones administrativas |
| `tipo` | `tipo_notificacion` | NO | ENUM | CONFIRMACION_TURNO · AVISO_CANCELACION · RECORDATORIO · AVISO_DEUDA · AVISO_SUSPENSION. Los dos últimos (RF-37) notifican estado de cuenta y llevan `turno_id` en NULL |
| `enviado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Momento del intento de envío |
| `email_destino` | `VARCHAR(255)` | NO | — | Dirección de email usada en el envío (registro histórico) |
| `exitoso` | `BOOLEAN` | NO | DEFAULT TRUE | FALSE si el proveedor de email reportó error |
| `detalle_error` | `TEXT` | SÍ | — | Mensaje de error del proveedor; NULL si exitoso = TRUE |

---

## Justificación de la normalización

El modelo se encuentra en **3FN (Tercera Forma Normal)**:

- **1FN:** todos los atributos son atómicos; no hay grupos repetidos ni arrays en las tablas principales. La disponibilidad horaria, que en un modelo documental sería un array embebido, aquí es una tabla hija (`disponibilidad_profesional`), lo que permite filtros eficientes por día y franja.

- **2FN:** no existen dependencias parciales. Cada tabla tiene clave primaria simple (`BIGSERIAL`), por lo que toda dependencia es completa respecto a esa clave.

- **3FN:** no existen dependencias transitivas. Los atributos del profesional no dependen de la especialidad (aunque la especialidad determina la duración por defecto, esa duración puede variar por profesional, por lo que se almacena en `profesionales` y no se deduce de `especialidad`).

**Decisiones de diseño:**
- `personas` y `usuarios` son tablas separadas porque representan conceptos distintos: la identidad de la persona real vs. las credenciales de acceso al sistema.
- `profesionales` es una tabla separada de `personas` porque un profesional puede no ser socio/paciente, y sus atributos (especialidad, disponibilidad) no aplican a personas. Esto evita atributos nulos en una tabla de propósito general.
- `disponibilidad_profesional` es una tabla hija de `profesionales` porque un profesional puede tener múltiples franjas horarias por día, y las franjas cambian con frecuencia.
- `excepciones_morosidad` es una tabla independiente para mantener un registro auditable de decisiones administrativas, separado del estado de la persona.
- `configuracion_gym` es una tabla de fila única para no hardcodear el cupo por franja en la aplicación; permite cambiarlo sin deploy.
