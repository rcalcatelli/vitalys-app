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

| ID    | Caso de prueba                                                                 | Entrada                                              | Resultado esperado                          |
|-------|--------------------------------------------------------------------------------|------------------------------------------------------|---------------------------------------------|
| PU-01 | Cuota al día (último período = mes actual)                                    | periodo = 2026-09-01, hoy = 2026-09-25               | diasMora = 0, bloqueado = false             |
| PU-02 | Cuota vencida exactamente hace 10 días                                        | periodo = 2026-08-01, hoy = 2026-09-11               | diasMora = 10, bloqueado = false            |
| PU-03 | Cuota vencida hace 11 días → moroso                                           | periodo = 2026-08-01, hoy = 2026-09-12               | diasMora = 11, bloqueado = true             |
| PU-04 | Sin pagos registrados → moroso con días = NULL                                | sin filas en pagos                                   | bloqueado = true (caso conservador)         |
| PU-05 | Persona sin membresía gym (es_socio_gym = false) → sin bloqueo               | es_socio_gym = false                                 | bloqueado = false sin consultar pagos       |

### TurnoServiceTest

| ID    | Caso de prueba                                                                 | Entrada                                              | Resultado esperado                          |
|-------|--------------------------------------------------------------------------------|------------------------------------------------------|---------------------------------------------|
| TU-01 | Cancelación con exactamente 24 h de anticipación → EN_TIEMPO                 | inicio = T+24h00, ahora = T                          | estado = CANCELADO_EN_TIEMPO                |
| TU-02 | Cancelación con 23 h 59 min → TARDE                                          | inicio = T+23h59, ahora = T                          | estado = CANCELADO_TARDE                    |
| TU-03 | SOCIO_PACIENTE cancela turno de otra persona → AccesoDenegadoException       | turno.persona_id ≠ usuario.persona_id                | excepción 403                               |
| TU-04 | Cancelar turno ya COMPLETADO → EstadoInvalidoException                       | estado = COMPLETADO                                  | excepción 422                               |
| TU-05 | Reservar turno GYM con morosidad → MorosidadException                        | es_socio_gym = true, diasMora = 15                   | excepción 422                               |
| TU-06 | Reservar turno GYM con excepción vigente → permitido                         | excepcion.valida_hasta > hoy                         | turno creado                                |
| TU-07 | Reservar fuera de disponibilidad del profesional → DisponibilidadException   | horario no cubre la franja                           | excepción 422                               |

---

## Nivel 2 — Pruebas de integración (Spring Boot Test + Testcontainers)

Prueban el stack completo API + base de datos con un PostgreSQL real en contenedor.

### Auth

| ID    | Caso                                                      | Método y URL               | Body                                     | Respuesta esperada                            |
|-------|-----------------------------------------------------------|----------------------------|------------------------------------------|-----------------------------------------------|
| PI-01 | Registro exitoso                                          | POST /api/auth/register    | email único, pass ≥8 chars              | 201, JWT en body                              |
| PI-02 | Registro con email duplicado                              | POST /api/auth/register    | email ya existente                       | 409 Conflict                                  |
| PI-03 | Login correcto                                            | POST /api/auth/login       | email + pass correctos                   | 200, JWT válido                               |
| PI-04 | Login con contraseña incorrecta                           | POST /api/auth/login       | pass incorrecta                          | 401                                           |
| PI-05 | Acceso sin token a endpoint protegido                     | GET /api/personas          | —                                        | 401                                           |
| PI-06 | Acceso con rol insuficiente (SOCIO_PACIENTE a /admin/)    | GET /api/admin/personas    | JWT de SOCIO_PACIENTE                    | 403                                           |

### Turnos

| ID    | Caso                                                            | Resultado esperado                              |
|-------|----------------------------------------------------------------|--------------------------------------------------|
| PI-07 | Reserva exitosa en slot disponible                             | 201, turno con estado RESERVADO                  |
| PI-08 | Reserva en slot solapado → rechazada por EXCLUDE GIST         | 409 (constraint de BD capturada por API)         |
| PI-09 | Dos reservas simultáneas al mismo slot (race condition test)  | Solo una de las dos en 201; la otra en 409       |
| PI-10 | Reserva GYM sin excepción por moroso                          | 422 con mensaje de morosidad                     |
| PI-11 | Cancelación en tiempo → estado CANCELADO_EN_TIEMPO            | 200, slot liberado (verificar EXCLUDE no bloquea)|
| PI-12 | Cancelación tardía → estado CANCELADO_TARDE                   | 200, slot sigue bloqueado (EXCLUDE activo)       |

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
| TurnoService                | 85 %                       |
| Constraints de BD (via PI)  | 100 % de los casos críticos|
| Controladores REST          | 70 % (happy path + errores)|

Las métricas de cobertura se verifican con JaCoCo en el build de CI (GitHub Actions).
