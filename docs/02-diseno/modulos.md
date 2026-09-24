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
| 4 | Agenda de Turnos | Reserva, consulta y cancelación de turnos con reglas de negocio |
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
| POST | `/api/auth/registro` | Registro de nuevo usuario | Público |
| POST | `/api/auth/login` | Login; retorna token JWT | Público |
| POST | `/api/auth/logout` | Invalida sesión | Autenticado |
| GET  | `/api/auth/me` | Datos del usuario autenticado | Autenticado |

**Entidades involucradas:** `usuarios`

---

## Módulo 2 — Gestión de Personas

**Descripción:** Mantenimiento del registro unificado de socios y pacientes. Una sola identidad por persona real, independientemente de si usa el gym, los consultorios, o ambos.

**Regla de negocio clave:** Las bajas son lógicas (`estado = INACTIVO`); nunca se elimina físicamente un registro para preservar el historial de turnos y pagos.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/personas` | Listar personas (filtros: estado, nombre, DNI) | ADMIN |
| POST   | `/api/personas` | Crear nueva persona | ADMIN |
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
| POST   | `/api/profesionales` | Registrar nuevo profesional | ADMIN |
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

**Descripción:** Gestión completa del ciclo de vida de un turno: consulta de slots disponibles, reserva y cancelación con aplicación automática de reglas de negocio.

**Reglas de negocio clave:**
- **Sin solapamientos:** El sistema valida a nivel de base de datos y API que un profesional no tenga dos turnos activos en el mismo horario.
- **Deuda en gym:** Un socio con cuota mensual vencida hace más de 10 días no puede reservar turnos de gym. Los turnos de consultorio no se ven afectados.
- **Cancelación en tiempo:** Aviso con ≥ 24 horas → estado `CANCELADO_EN_TIEMPO`, el slot queda libre.
- **Cancelación tarde:** Aviso con < 24 horas → estado `CANCELADO_TARDE`, el slot no se libera. Se registra fecha, actor y motivo.
- **Trazabilidad:** Todo turno cancelado registra `cancelado_en`, `cancelado_por_usuario` y `motivo_cancelacion`.

**Endpoints principales:**

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET    | `/api/turnos/disponibles` | Slots libres por profesional y fecha | Autenticado |
| GET    | `/api/turnos` | Listar turnos (filtros: persona, profesional, estado, fecha) | ADMIN |
| GET    | `/api/turnos/mis-turnos` | Turnos propios del usuario autenticado | SOCIO_PACIENTE |
| GET    | `/api/turnos/mi-agenda` | Agenda del profesional autenticado | PROFESIONAL |
| POST   | `/api/turnos` | Reservar turno | SOCIO_PACIENTE, ADMIN |
| PATCH  | `/api/turnos/{id}/cancelar` | Cancelar turno (regla 24h automática) | SOCIO_PACIENTE, ADMIN |
| GET    | `/api/turnos/{id}` | Detalle de un turno | ADMIN, partes involucradas |

**Entidades involucradas:** `turnos`, `personas`, `profesionales`, `disponibilidad_profesional`, `pagos` (consulta de deuda)

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
    └── alimenta a Módulos 5 y 6

Módulo 5 (Pagos)
    ├── depende de Módulos 2, 4
    └── condiciona lógica de reserva en Módulo 4

Módulo 6 (Notificaciones)
    └── depende de Módulos 2, 4
```
