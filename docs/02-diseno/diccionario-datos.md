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
| `estado_turno` | `RESERVADO` · `COMPLETADO` · `AUSENTE` · `CANCELADO_EN_TIEMPO` · `CANCELADO_TARDE` |
| `concepto_pago` | `CUOTA_MENSUAL` · `SESION_CONSULTORIO` |
| `tipo_notificacion` | `CONFIRMACION_TURNO` · `AVISO_CANCELACION` · `RECORDATORIO` |

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
| `fecha_alta` | `DATE` | NO | DEFAULT CURRENT_DATE | Fecha de registro en el centro |
| `fecha_baja` | `DATE` | SÍ | ≥ fecha_alta | Obligatoria si estado = INACTIVO; nula si estado = ACTIVO |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Restricciones cruzadas:**
- `chk_fecha_baja`: `fecha_baja IS NULL OR fecha_baja >= fecha_alta`
- `chk_baja_logica`: `(estado = 'INACTIVO' AND fecha_baja IS NOT NULL) OR (estado = 'ACTIVO' AND fecha_baja IS NULL)`

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

**Anti-solapamiento:** un trigger `trg_disponibilidad_no_overlap` previene que se inserten franjas que se superpongan con una franja activa del mismo profesional en el mismo día.

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
| `cancelado_por_usuario_id` | `BIGINT` | SÍ | FK usuarios · Obligatorio si cancelado | Siempre registrado: puede ser socio, profesional o admin |
| `motivo_cancelacion` | `TEXT` | SÍ | Obligatorio si cancelado | Razón de la cancelación |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |
| `actualizado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Actualizado automáticamente por trigger |

**Ciclo de vida del estado:**

```
RESERVADO ──► COMPLETADO         (profesional o admin, al finalizar la atención)
          ──► AUSENTE            (profesional o admin, cuando el paciente no se presenta)
          ──► CANCELADO_EN_TIEMPO (aviso con ≥ 24 h de anticipación; libera el slot)
          ──► CANCELADO_TARDE    (aviso con < 24 h; el slot queda bloqueado)
```

**Restricción de solapamiento:** `ALTER TABLE turnos ADD CONSTRAINT no_solapamiento_turnos EXCLUDE USING GIST (profesional_id WITH =, tstzrange(inicio, fin, '[)') WITH &&) WHERE (profesional_id IS NOT NULL AND estado IN ('RESERVADO', 'CANCELADO_TARDE'))`. Los turnos GYM no verifican solapamiento por motor (sin profesional asignado); la API limita la capacidad de la sala.

**Regla de morosidad (RN-01):** si `tipo_turno = 'GYM'` y `personas.es_socio_gym = TRUE`, la API verifica que la persona no tenga cuota mensual vencida hace más de 10 días. Una cuota del período `P` vence el día 1 del mes `P+1`; está vencida hace más de 10 días si `NOW() > (P + 1 mes + 10 días)`. La validación ocurre en la capa de servicio Java, no en el motor.

---

## Tabla: `excepciones_morosidad`

Excepciones puntuales a la regla de morosidad, autorizadas explícitamente por administración.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `persona_id` | `BIGINT` | NO | FK personas | Persona beneficiaria de la excepción |
| `autorizado_por` | `BIGINT` | NO | FK usuarios (rol ADMIN) | Administrador que autorizó |
| `turno_id` | `BIGINT` | SÍ | FK turnos | Turno específico habilitado (puntual); NULL si la excepción es por período |
| `motivo` | `TEXT` | NO | — | Justificación de la excepción |
| `valida_hasta` | `DATE` | NO | — | La excepción expira en esta fecha |
| `creado_en` | `TIMESTAMPTZ` | NO | DEFAULT NOW() | Fecha y hora de creación |

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
- `chk_concepto_datos`: concepto es mutuamente excluyente — cuota tiene `periodo` y `turno_id` = NULL; sesión tiene `turno_id` y `periodo` = NULL.
- `chk_periodo_primer_dia`: `EXTRACT(DAY FROM periodo) = 1`
- `uq_pago_por_turno`: índice único parcial sobre `turno_id WHERE turno_id IS NOT NULL`
- `uq_cuota_mensual`: índice único parcial sobre `(persona_id, periodo) WHERE periodo IS NOT NULL`

---

## Tabla: `notificaciones`

Log de emails enviados al sistema. Registra todos los envíos para auditoría; no se eliminan registros.

| Campo | Tipo | Nulable | Restricciones | Descripción |
|-------|------|---------|---------------|-------------|
| `id` | `BIGSERIAL` | NO | PK | Identificador interno autoincremental |
| `persona_id` | `BIGINT` | NO | FK personas | Persona destinataria |
| `turno_id` | `BIGINT` | SÍ | FK turnos | Turno relacionado; NULL para notificaciones administrativas |
| `tipo` | `tipo_notificacion` | NO | ENUM | CONFIRMACION_TURNO · AVISO_CANCELACION · RECORDATORIO |
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
