# RFC-002 — Selección del Motor de Base de Datos

**Estado:** ✅ APROBADA — 21/09/2026  
**Fecha:** 11/09/2026  
**Autores:** Renzo Calcatelli · Pablo Basualdo Arcati  
**Revisora:** Sofía Raia  
**Relacionado con:** RFC-001 (Propuesta de Proyecto), 2.ª Entrega TFI

---

## 1. Contexto

En la 1.ª entrega (RFC-001, aprobada el 30/08/2026) declaramos **PostgreSQL hospedado en Supabase** como motor de base de datos. Al iniciar el diseño detallado para la 2.ª entrega, el equipo evaluó la posibilidad de migrar a **MongoDB Atlas** con el objetivo de demostrar el manejo de modelado documental (embedding y referencing) y aprovechar experiencia previa del equipo con esa tecnología.

Este RFC documenta el análisis comparativo y la decisión tomada, para someterla a aprobación de la tutora antes de formalizar el esquema definitivo.

---

## 2. Drivers de la decisión

Los factores que condicionan esta elección son, en orden de importancia:

1. **Integridad de las reglas de negocio** — el sistema tiene reglas cruzadas entre entidades (deuda de gym bloqueando turnos, solapamiento de horarios) que deben ejecutarse con consistencia garantizada.
2. **Complejidad del modelo** — 7 entidades con relaciones bien definidas y cardinalidades fijas (1:1, 1:N, N:1).
3. **Plazo y riesgo técnico** — MVP para el 14/11; el equipo trabaja part-time como estudiantes.
4. **Valor académico** — la materia valora demostrar comprensión de modelado, tanto relacional como documental.
5. **Experiencia del equipo** — Pablo tiene más práctica reciente con MongoDB; ambos tienen base en SQL.

---

## 3. Opciones evaluadas

### Opción A — PostgreSQL (stack original declarado)

**Descripción:** Base de datos relacional. Esquema definido en DDL con tipos enumerados, constraints y triggers. Hospedado en Supabase (tier gratuito). Acceso desde Spring Boot via Spring Data JPA.

**Fortalezas para Vitalys:**

- La regla _"socio con cuota vencida > 10 días no puede reservar turno de gym"_ es una subquery simple: `SELECT MAX(fecha_pago) FROM pagos WHERE persona_id = ? AND concepto = 'CUOTA_MENSUAL'`. En MongoDB requiere un `$lookup` o mantener un campo redundante `dias_mora` en el documento de persona, que hay que actualizar manualmente.
- La validación de solapamiento de turnos es un `SELECT` con `BETWEEN` sobre un índice parcial ya definido (`WHERE estado = 'RESERVADO'`). Eficiente y declarativo.
- Los `CHECK CONSTRAINTS` del DDL ya generado garantizan coherencia a nivel de motor: no puede existir un pago de tipo `CUOTA_MENSUAL` sin `periodo`, ni un turno cancelado sin `cancelado_en`. En MongoDB esa validación recae enteramente en la aplicación.
- `ENUM` types (rol_usuario, estado_turno, concepto_pago) son validados por el motor. En MongoDB son strings sin restricción nativa.
- Spring Data JPA está más maduro y documentado para PostgreSQL. Las queries derivadas y los repositorios funcionan de forma directa.
- **Corrección técnica (punto 2.12):** Hibernate requiere mapeo explícito para los tipos `ENUM` nativos de PostgreSQL. Cada campo enumerado en la entidad JPA debe anotarse con `@Enumerated(EnumType.STRING)` y, para los ENUMs definidos en la base, es necesario registrar un `UserType` o un `@Column(columnDefinition = "tipo_enum")`. Esto se considera un riesgo técnico de implementación (ver [Riesgos](#riesgos)) y no un defecto de diseño: el esquema es correcto; la configuración del ORM debe acompañarlo.
- Supabase ofrece dashboard visual de datos, lo cual es útil para demos ante el comité.

**Debilidades para Vitalys:**

- Las migraciones de esquema requieren scripts DDL explícitos (ALTER TABLE), lo que agrega fricción en iteraciones rápidas.
- La disponibilidad del profesional (tabla `disponibilidad_profesional`) es una entidad separada con múltiples filas por profesional; en MongoDB sería más natural como array embebido.

---

### Opción B — MongoDB Atlas

**Descripción:** Base de datos documental. Colecciones con documentos JSON. Hospedado en MongoDB Atlas (tier gratuito M0). Acceso desde Spring Boot via Spring Data MongoDB.

**Fortalezas para Vitalys:**

- La disponibilidad horaria del profesional encaja naturalmente como array embebido en el documento `profesional`, eliminando una tabla de join:
  ```json
  {
    "nombre": "Dra. García",
    "especialidad": "PSICOLOGIA",
    "duracionTurnoMinutos": 50,
    "disponibilidad": [
      { "diaSemana": 1, "horaInicio": "09:00", "horaFin": "13:00" },
      { "diaSemana": 3, "horaInicio": "14:00", "horaFin": "18:00" }
    ]
  }
  ```
- El esquema flexible permite iterar el modelo sin migraciones durante el desarrollo.
- Permite demostrar conocimiento de embedding vs. referencing, un concepto específico del modelado NoSQL valorado académicamente.
- MongoDB Atlas también ofrece dashboard visual para demos.

**Debilidades para Vitalys:**

- Las consultas cruzadas entre colecciones (`$lookup`) son más costosas y verbosas que los JOINs de SQL. La regla de deuda gym obliga a cruzar `pagos` con `personas` en cada reserva.
- Sin soporte nativo de transacciones multi-documento en tier gratuito de Atlas (las transacciones ACID multi-colección requieren replica set, que M0 sí provee pero con overhead de configuración).
- La validación de solapamiento de turnos requiere lógica en la capa de aplicación o un índice compuesto con condiciones que MongoDB maneja con menos precisión que un índice parcial de PostgreSQL.
- Los `enum` y `check constraints` deben implementarse como validaciones en la capa de servicio (Java), lo que traslada responsabilidad de integridad fuera del motor.
- Mayor riesgo de inconsistencia de datos si una operación compuesta (reservar turno + registrar pago) falla a mitad: requiere manejo explícito de rollback en la aplicación.

---

## 4. Análisis de los casos de uso más críticos

| Caso de uso | PostgreSQL | MongoDB |
|---|---|---|
| Validar deuda gym al reservar | `JOIN` simple + índice | `$lookup` o campo redundante |
| Detectar solapamiento de turnos | Índice parcial + `BETWEEN` | Lógica en aplicación + índice compuesto |
| Leer disponibilidad del profesional | `JOIN` con tabla hija | Array embebido (ventaja MongoDB) |
| Registrar pago + actualizar estado | Transacción SQL nativa | Transacción multi-colección (requiere config) |
| Garantizar unicidad de DNI | `UNIQUE CONSTRAINT` en motor | Índice único en colección |
| Auditoría de cancelaciones | `CHECK CONSTRAINT` en motor | Validación en aplicación |

---

## 5. Estrategia de modelado si se elige MongoDB

Si el equipo decide ir por MongoDB, la estrategia de embedding y referencing sería:

**Embeber (datos que siempre se leen juntos y no cambian con frecuencia):**
- `disponibilidad` dentro de `profesional` — se lee siempre que se buscan slots disponibles.
- Snapshot de datos básicos de la persona dentro de cada `turno` (nombre, apellido, email) — evita lookup al mostrar la agenda.

**Referenciar (datos con vida propia o alta cardinalidad):**
- `persona_id` y `profesional_id` en `turno` — una persona tiene muchos turnos; mantener el documento completo sería redundancia excesiva.
- `persona_id` en `pago` — el historial de pagos puede ser extenso.
- `turno_id` en `notificacion` — relación directa sin necesidad de embed.

Esta estrategia mezcla ambos conceptos deliberadamente, lo cual es exactamente lo que tiene valor demostrar.

---

## 6. Decisión

**✅ APROBADA — 21/09/2026 · Revisora: Sofía Raia**

- [x] Mantener **PostgreSQL** (stack original aprobado, mayor integridad, menor riesgo técnico)
- [ ] ~~Migrar a MongoDB~~

**Fundamento de la tutora:** De los 6 casos de uso críticos comparados en la sección 4, cinco favorecen claramente a PostgreSQL — incluyendo las dos reglas de negocio más sensibles del sistema (validación de deuda gym y solapamiento de turnos), que con MongoDB requieren reimplementarse en la capa de aplicación. Esto contradice el driver #1 del equipo (integridad de las reglas de negocio).

**Valor académico de modelado NoSQL:** El equipo incorporará en el informe final la estrategia de embedding/referencing documentada en la sección 5, explicando cómo se modelaría en MongoDB y por qué no se eligió. Esto demuestra comprensión de ambos paradigmas sin riesgo técnico adicional.

**Consecuencia directa:** El DDL generado (`db/ddl/vitalys_ddl.sql`) queda como esquema definitivo. Spring Data JPA y Supabase se mantienen como stack de datos.

---

## 7. Consecuencias de la decisión adoptada

**Se eligió PostgreSQL (Opción A).** Las consecuencias directas son:

- El DDL en `db/ddl/vitalys_ddl.sql` es el esquema definitivo. Incluye ENUMs, constraints, triggers anti-solapamiento y el `EXCLUDE USING GIST` para turnos.
- Spring Data JPA y Supabase se mantienen como stack de datos para todo el proyecto.
- El riesgo técnico es bajo; el plazo es controlable con el plan de sprints vigente.
- No se requiere RFC-003: la decisión queda documentada y cerrada en este RFC.

**Demostración de competencia NoSQL:** el informe final incluirá la estrategia de embedding/referencing de la Sección 5, explicando cómo se modelaría en MongoDB y la razón de la elección en contra. Esto demuestra comprensión de ambos paradigmas sin riesgo técnico adicional.

---

## 8. Referencias

- RFC-001 — Propuesta de Proyecto Vitalys (1.ª entrega, 30/08/2026)
- Propuesta aprobada: [`docs/01-propuesta/propuesta-proyecto-rfc.md`](../01-propuesta/propuesta-proyecto-rfc.md)
- Esquema PostgreSQL actual: [`db/ddl/vitalys_ddl.sql`](../../db/ddl/vitalys_ddl.sql)
- Módulos del sistema: [`docs/02-diseno/modulos.md`](modulos.md)
