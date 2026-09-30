# RFC-002 — Selección del Motor de Base de Datos

**Estado:** ✅ APROBADA — 21/09/2026  
**Fecha:** 11/09/2026  
**Autores:** Renzo Calcatelli · Pablo Basualdo Arcati  
**Revisora:** Sofía Raia  
**Relacionado con:** RFC-001 (Propuesta de Proyecto), 2.ª Entrega TFI

> **Actualización del 30/09/2026.** La **decisión** de este RFC no cambió: sigue siendo
> PostgreSQL. Lo que se actualizó son afirmaciones técnicas que dejaron de ser ciertas al
> implementarlas — la corrección del mapeo de enums, que no funcionaba como estaba escrita,
> y la referencia al DDL como esquema definitivo, reemplazado por las migraciones de Flyway.
> Los párrafos corregidos indican en cursiva qué decía la versión original y por qué cambió:
> un RFC aprobado registra una decisión, y borrar el razonamiento que la sostuvo haría
> imposible entenderla después.

---

## 1. Contexto

En la 1.ª entrega (RFC-001, aprobada el 30/08/2026) declaramos **PostgreSQL hospedado en Supabase** como motor de base de datos. Al iniciar el diseño detallado para la 2.ª entrega, el equipo evaluó la posibilidad de migrar a **MongoDB Atlas** con el objetivo de demostrar el manejo de modelado documental (embedding y referencing) y aprovechar experiencia previa del equipo con esa tecnología.

Este RFC documenta el análisis comparativo y la decisión tomada, para someterla a aprobación de la tutora antes de formalizar el esquema.

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

- La regla de morosidad del gimnasio se resuelve con un cruce entre `personas` y `pagos` sobre índices, en una sola consulta declarativa. En MongoDB requiere un `$lookup` o mantener un campo redundante en el documento de persona, que hay que actualizar a mano — y un campo redundante mal sincronizado es justamente lo que bloquearía o dejaría entrar a la persona equivocada.

  > _La formulación original de este punto usaba `SELECT MAX(fecha_pago)` como ejemplo. Ese cálculo quedó descartado: tomar el último pago tapa los meses salteados. RN-01 recorre período por período desde `personas.fecha_inicio_membresia` y compara el total de impagos contra un umbral configurable. El argumento a favor de PostgreSQL no cambia; el ejemplo sí._
- La validación de solapamiento de turnos la impone el motor con un `EXCLUDE USING GIST` sobre rangos de tiempo, no una consulta que la aplicación deba acordarse de hacer. En MongoDB no hay equivalente: la exclusión tendría que reimplementarse en la capa de servicio, con la condición de carrera correspondiente.

  > _La versión original de este punto describía un índice parcial `WHERE estado = 'RESERVADO'`. El predicado evolucionó: hoy la ocupación la define `fn_turno_ocupa_lugar(estado, inicio, cancelado_en)`, compartida por el `EXCLUDE` de consultorio, el cupo de gimnasio y el límite de un turno por día (RN-02, RN-03)._
- Los `CHECK CONSTRAINTS` del DDL ya generado garantizan coherencia a nivel de motor: no puede existir un pago de tipo `CUOTA_MENSUAL` sin `periodo`, ni un turno cancelado sin `cancelado_en`. En MongoDB esa validación recae enteramente en la aplicación.
- `ENUM` types (rol_usuario, estado_turno, concepto_pago) son validados por el motor. En MongoDB son strings sin restricción nativa.
- Spring Data JPA está más maduro y documentado para PostgreSQL. Las queries derivadas y los repositorios funcionan de forma directa.
- **Corrección técnica (punto 2.12), actualizada tras implementarla:** Hibernate requiere mapeo explícito para los tipos `ENUM` nativos de PostgreSQL. Este RFC proponía en su versión original anotar `@Enumerated(EnumType.STRING)` y agregar un `UserType` propio o un `@Column(columnDefinition = "tipo_enum")`. **Esa solución no funciona por sí sola**, y se comprobó al implementarla en el Sprint 2: `columnDefinition` le dice a Hibernate cómo *generar* la columna, no cómo *enviar el parámetro*, así que sigue mandando un `varchar` y Postgres lo rechaza con `column "rol" is of type rol_usuario but expression is of type character varying`. Registrar un `UserType` a mano era el camino de Hibernate 5; en Hibernate 6 ya no hace falta. Lo que resuelve el problema es:

  ```java
  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)          // esta es la anotación que lo arregla
  @Column(name = "rol", columnDefinition = "rol_usuario", nullable = false)
  private RolUsuario rol;
  ```

  Verificado contra un PostgreSQL real con Testcontainers. Ver RG-13 en la [matriz de riesgos](../metodologia/matriz-riesgos.md), donde el riesgo figura como materializado y mitigado.

  **El mismo tipo nativo tiene un segundo filo, en JPQL:** un enum escrito como literal dentro de una consulta (`WHERE f.origen = com.vitalys.domain.OrigenFeriado.OFICIAL`) hace que Hibernate arme el cast con el nombre de la clase Java —`'OFICIAL'::OrigenFeriado`— en lugar del tipo de Postgres, y falla con `type "origenferiado" does not exist`. Se evita pasando el enum como **parámetro** (`WHERE f.origen = :origen`), que sí usa el mapeo de la entidad.
- Supabase ofrece dashboard visual de datos, lo cual es útil para demos ante el comité.

**Debilidades para Vitalys:**

- Las migraciones de esquema requieren scripts DDL explícitos (`ALTER TABLE`), lo que agrega fricción en iteraciones rápidas. _Se materializó, y la respuesta fue adoptar Flyway: la fricción no desapareció, pero pasó a ser deliberada — cada cambio de esquema es un archivo versionado e inmutable. Ver la sección 7._
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

**Consecuencia directa:** se mantiene PostgreSQL, con Spring Data JPA y Supabase como stack de datos. El DDL generado (`db/ddl/vitalys_ddl.sql`) fue el punto de partida del esquema; hoy **ya no es el esquema vigente** — ver la sección 7.

---

## 7. Consecuencias de la decisión adoptada

**Se eligió PostgreSQL (Opción A).** Las consecuencias directas son:

- **El esquema vigente son las migraciones de Flyway en `db/migration/`, no el DDL.** Al momento de aprobarse este RFC el esquema vivía en un único archivo, `db/ddl/vitalys_ddl.sql`, y este documento lo daba por definitivo. Eso cambió al adoptar Flyway: ese archivo pasó a ser **histórico** —es el contenido de `V1__esquema_inicial.sql`, congelado— y todo cambio posterior es una migración versionada nueva. Consultarlo hoy para saber cómo está la base da una respuesta incompleta: no tiene la tabla `excepciones_morosidad`, ni `feriados`, ni la columna `fecha_inicio_membresia`, ni ninguna de las reglas de gimnasio.
- **Por qué se cambió:** un archivo único que se edita no deja registro de qué cambió, ni garantiza que la base de cada integrante y la de producción estén en el mismo estado. Flyway aplica los cambios en orden, una sola vez cada uno, y `flyway_schema_history` responde en qué versión está cada entorno. El detalle está en [`docs/03-despliegue/entorno-local-docker.md`](../03-despliegue/entorno-local-docker.md).
- La decisión de fondo —PostgreSQL— **no cambió**, y esto la refuerza: los `CHECK`, los `EXCLUDE USING GIST` y los triggers que motivaron la elección siguen siendo el argumento central, solo que ahora llegan al motor por migraciones versionadas.
- Spring Data JPA y Supabase se mantienen como stack de datos para todo el proyecto.
- El riesgo técnico es bajo; el plazo es controlable con el plan de sprints vigente.
- No se requiere RFC-003: la decisión queda documentada y cerrada en este RFC.

**Demostración de competencia NoSQL:** el informe final incluirá la estrategia de embedding/referencing de la Sección 5, explicando cómo se modelaría en MongoDB y la razón de la elección en contra. Esto demuestra comprensión de ambos paradigmas sin riesgo técnico adicional.

---

## 8. Referencias

- RFC-001 — Propuesta de Proyecto Vitalys (1.ª entrega, 30/08/2026)
- Propuesta aprobada: [`docs/01-propuesta/propuesta-proyecto-rfc.md`](../01-propuesta/propuesta-proyecto-rfc.md)
- **Esquema vigente:** migraciones de Flyway en [`db/migration/`](../../db/migration/) — el estado real de la base es el resultado de aplicarlas en orden de versión
- Esquema inicial, **histórico**: [`db/ddl/vitalys_ddl.sql`](../../db/ddl/vitalys_ddl.sql) (equivale a `V1__esquema_inicial.sql`; no refleja los cambios posteriores)
- Diccionario de datos actualizado: [`docs/02-diseno/diccionario-datos.md`](diccionario-datos.md)
- Módulos del sistema: [`docs/02-diseno/modulos.md`](modulos.md)
