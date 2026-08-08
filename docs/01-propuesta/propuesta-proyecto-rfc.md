# RFC-0001 — Vitalys App: Propuesta de Proyecto (TFI)

| Campo | Valor |
|---|---|
| **RFC** | 0001 |
| **Autores** | Renzo Calcatelli · Pablo Basualdo Arcati |
| **Revisora** | Sofía Raia (tutora) |
| **Estado** | 🟡 Borrador |
| **Creado** | agosto 2026 |

---

## Tabla de contenido

1. [Revisiones](#revisiones)
2. [Resumen](#resumen)
3. [Motivación](#motivación)
4. [Implementación propuesta](#implementación-propuesta)
5. [Tareas y roadmap](#tareas-y-roadmap)
6. [Stack tecnológico](#stack-tecnológico)
7. [Métricas](#métricas)
8. [Riesgos](#riesgos)
9. [Preguntas sin resolver](#preguntas-sin-resolver)
10. [Conclusión](#conclusión)
11. [Minutas](#minutas)

---

## Revisiones

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.1 | ago 2026 | Versión inicial en formato RFC | R. Calcatelli · P. Basualdo Arcati |

---

## Resumen

Vitalys App es una aplicación web responsive para la gestión integral de un centro de salud híbrido (gimnasio + consultorios de Nutrición, Psicología y Kinesiología). Centraliza en una única plataforma la identidad de socios y pacientes, la agenda de turnos por profesional, el registro de pagos y las notificaciones. Este RFC propone el problema a resolver, el alcance del MVP, el stack tecnológico y el plan de trabajo para el Trabajo Final Integrador de la TUP (UTN), y solicita comentarios de la tutora y del equipo antes de dar por cerrada la propuesta.

**Repositorio:** https://github.com/rcalcatelli/vitalys-app

---

## Motivación

### Contexto y relevamiento

_(Completar con el anclaje real de la Actividad 1: describir en primera persona cómo funciona hoy un centro/gimnasio que conozcas — cómo se anotan los turnos, cómo se cobran las cuotas, qué herramientas usan.)_

Los centros de salud híbridos —que combinan gimnasio con consultorios profesionales de Nutrición, Psicología y Kinesiología— gestionan su operación diaria con herramientas desconectadas entre sí: planillas de socios, agendas en papel o WhatsApp por cada profesional, y registros de cobros en cuadernos o Excel.

### Actores involucrados

| Actor | Rol en el proceso actual | Necesidad principal |
|---|---|---|
| Socio / Paciente | Asiste al gimnasio y/o a consultorios; muchas veces es la misma persona registrada dos veces | Reservar turnos y conocer su estado de cuenta sin depender del horario de recepción |
| Profesionales | Administran su propia agenda de forma aislada | Ver su agenda unificada y evitar superposiciones |
| Recepción / Administración | Centraliza cobros, turnos y consultas telefónicas; cuello de botella operativo | Reducir tareas manuales repetitivas y errores de registro |
| Dueño / Encargado | Supervisa ingresos y actividad del centro | Información consolidada y confiable para decidir |

### Problema central e impacto

La información del centro vive fragmentada en herramientas que no se comunican. Esto produce: turnos superpuestos o perdidos, personas duplicadas en los registros (como socio y como paciente, con datos inconsistentes), pagos sin trazabilidad y una carga administrativa repetitiva. Para el negocio implica ingresos no cobrados, señales de abandono de socios que nadie detecta a tiempo y decisiones tomadas sin datos confiables.

### Propuesta de valor (digitalizar vs. agregar valor)

Una planilla bien armada ya digitaliza; Vitalys agrega valor que las herramientas convencionales no pueden lograr:

1. **Identidad única socio-paciente:** cada persona es una sola entidad con historial unificado de cuotas y turnos.
2. **Reglas de negocio automáticas:** el sistema impide superposiciones de turnos y puede condicionar reservas al estado de pago, sin depender de la memoria de un operador.
3. **Autoservicio 24/7:** el socio reserva y cancela turnos sin llamar en horario de atención, descomprimiendo a la administración.

### Competencia y diferenciación

Existen soluciones comerciales de gestión para gimnasios y de agenda de turnos para profesionales de la salud (plataformas SaaS por suscripción mensual). El relevamiento muestra dos limitaciones para el segmento objetivo: **cobertura parcial del dominio** (las herramientas fitness no gestionan consultorios y las de agenda médica no gestionan membresías, obligando al centro híbrido a mantener dos sistemas que no comparten datos) y **costo de adopción** (suscripciones difíciles de justificar para centros chicos y medianos, que terminan volviendo a la planilla).

**Diferenciación de Vitalys:** una única plataforma diseñada específicamente para el modelo híbrido, donde la identidad unificada socio-paciente no es una integración forzada entre dos sistemas sino el núcleo del diseño.

### Cliente

Caso de estudio propio (centro de salud híbrido "Vitalys"), con anclaje en el relevamiento de un establecimiento real. El proyecto da continuidad al trabajo de planificación desarrollado por el equipo en Metodología de Sistemas I (ver `/docs/metodologia`).

---

## Implementación propuesta

### Arquitectura general

Aplicación web responsive con arquitectura cliente-servidor: frontend SPA (React) que consume una API REST (Spring Boot) sobre una base de datos relacional (PostgreSQL). Autenticación basada en tokens (JWT) con control de acceso por roles. Al menos un componente desplegado en la nube conforme al requisito de la cátedra (ver [Stack tecnológico](#stack-tecnológico)).

### Alcance — MVP (compromiso de entrega)

1. **Autenticación y roles** — socio/paciente, profesional y administración
2. **Gestión de socios y pacientes** — alta, baja, modificación y consulta con identidad única
3. **Agenda de turnos** — disponibilidad por profesional, reserva y cancelación, sin superposiciones
4. **Registro de pagos** — cuotas de gimnasio y sesiones de consultorio, con estado de cuenta por persona

### Alcance — Nice to have (si el plan lo permite)

- **Notificaciones por email** — confirmaciones y recordatorios de turnos
- **Reportes básicos** — ingresos del período y ocupación de turnos para administración

### Alcance — Fuera de alcance (versión futura)

- Ficha clínica digital
- Integración con pasarela de pagos real
- Publicación en tiendas móviles (App Store / Play Store)

### Metodología de trabajo y uso de IA

Modelo Incremental con marco Scrum (sprints de 2 semanas), según la planificación elaborada en Metodología de Sistemas I: roadmap, análisis de stakeholders, matriz de riesgos y definiciones de prueba. Seguimiento mediante Issues y Pull Requests en GitHub; los cambios a este RFC se comentan por PR.

Durante la elaboración de esta propuesta se utilizaron herramientas de IA como interlocutor técnico, conforme a los lineamientos de la cátedra: para revisar la consistencia del alcance, contrastar alternativas de stack y explorar casos borde del dominio (cancelaciones, superposiciones, estados de morosidad). Las decisiones de alcance y tecnología fueron analizadas y adoptadas por el equipo.

---

## Tareas y roadmap

| Sprint | Período | Objetivo principal |
|---|---|---|
| Sprint 1 | 31/08 – 13/09 | Diseño del esquema de base de datos, setup de proyectos (Spring Boot, React) y despliegue inicial de prueba |
| Sprint 2 | 14/09 – 27/09 | Autenticación y roles · **2.ª entrega: esquema de BD y módulos (27/09)** |
| Sprint 3 | 28/09 – 11/10 | Gestión de socios y pacientes |
| Sprint 4 | 12/10 – 25/10 | Agenda de turnos |
| Sprint 5 | 26/10 – 08/11 | Registro de pagos · nice to have según margen |
| Cierre | 09/11 – 14/11 | Estabilización, informe final y video · **Entrega final (14/11)** |

| Hito de la cátedra | Fecha límite | Estado |
|---|---|---|
| Formación del equipo y elección de tutora | — | ✅ |
| Propuesta y repositorio (1.ª entrega) | 30/08 | 🔜 |
| Esquema de BD y listado de módulos (2.ª entrega) | 27/09 | ⏳ |
| Informe final, video y despliegue | 14/11 | ⏳ |
| Defensa oral | mesa de examen | ⏳ |

---

## Stack tecnológico

### Stack seleccionado

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | Java 17 · Spring Boot · Spring Data JPA | Trabajado en profundidad en Programación III; ecosistema maduro para APIs REST |
| Frontend | React · TypeScript | Estándar de la industria; tipado estático que reduce errores |
| Base de datos | PostgreSQL (Supabase, PaaS) | El dominio (turnos, pagos, personas) exige integridad referencial y transacciones |
| Despliegue | Vercel (frontend) · Render (backend), modalidad PaaS | Planes gratuitos suficientes; cumple el requisito de servicio en la nube |
| Versionado | Git · GitHub (repositorio único) | Requisito de la cátedra; trabajo por ramas y Pull Requests |

### Alternativas consideradas

- **Backend — Node.js/Express:** ecosistema válido y liviano, pero el equipo tiene mayor recorrido en Java/Spring Boot (Programación III). Se prioriza el menor costo de aprendizaje: el tiempo disponible se invierte en el producto, no en aprender un framework con fecha de entrega comprometida.
- **Base de datos — MongoDB (documental):** el equipo posee experiencia en modelado documental, agregaciones y validadores. Se opta por PostgreSQL porque el dominio es fuertemente relacional: un turno referencia a un profesional y a una persona, no admite superposición, y los pagos exigen consistencia transaccional. Estas garantías las provee el motor relacional de forma nativa; en un modelo documental deberían implementarse en la capa de aplicación, aumentando el riesgo de errores.
- **Despliegue — VPS con Docker:** se opta por PaaS por menor carga operativa: sin administración de servidores, con HTTPS y despliegue continuo desde GitHub incluidos. Docker queda como mejora futura si el proyecto lo requiriera.

### Escalabilidad respecto del problema

La escala esperada es la de un centro chico o mediano: cientos de personas registradas, decenas de turnos diarios, un puñado de usuarios concurrentes. El stack soporta ese volumen con holgura en planes gratuitos y tiene camino de crecimiento conocido si la escala aumentara. No se sobredimensiona la arquitectura (microservicios, colas, caché distribuida) para una escala que el problema no exige.

---

## Métricas

Criterios verificables de éxito del proyecto:

| Métrica | Objetivo |
|---|---|
| Módulos MVP completos y funcionando | 4 de 4 desplegados en producción al 14/11 |
| Despliegue en la nube | Frontend, backend y base de datos accesibles públicamente en forma continua desde el Sprint 1 |
| Integridad del dominio | 0 superposiciones de turnos posibles por diseño (restricciones en BD + validación en API) |
| Trazabilidad de pagos | Todo pago registrado queda asociado a una persona y a un concepto (cuota o sesión) |
| Proceso de desarrollo | 100% de los cambios integrados por Pull Request; tablero de Issues actualizado por sprint |
| Entregas de la cátedra | 3 de 3 entregas presentadas en fecha con aprobación de la tutora |

---

## Riesgos

| Riesgo / Limitación | Impacto | Mitigación |
|---|---|---|
| Free tier de Render duerme el backend sin tráfico (arranque ~30-50 s) | Demo lenta al inicio | Precalentar el servicio antes de presentaciones; documentado en README |
| Proyecto gratuito de Supabase se pausa tras 7 días de inactividad | Base inaccesible en demo | Actividad periódica; reactivación previa a entregas y defensa |
| Sin backups automáticos en planes gratuitos | Pérdida de datos de prueba | Scripts DDL/DML versionados en `/db` permiten recrear la base |
| Curva de integración Spring Boot + React (CORS, JWT) | Retraso en el módulo de autenticación | Es el primer módulo del plan y ya cuenta con desglose detallado de tareas |
| Cambiar de tecnología en etapa avanzada | Alto: retrabajos y retrasos | Decisión de stack cerrada en este RFC y validada con la tutora antes de iniciar el desarrollo |
| Superposición del TFI con la cursada de otras materias | Menor dedicación en semanas de parciales | Sprints con margen (nice to have como buffer); planificación de carga al inicio de cada sprint |

---

## Preguntas sin resolver

Decisiones de dominio y diseño que el equipo aún no cerró y sobre las que se solicitan comentarios:

1. **Morosidad y reservas:** ¿un socio con cuota vencida queda bloqueado para reservar turnos, o el sistema solo lo advierte a recepción? ¿Aplica igual para sesiones de consultorio ya pagadas por separado?
2. **Cancelaciones:** ¿con cuánta anticipación mínima se puede cancelar un turno para que se libere el cupo? ¿Se registra el historial de cancelaciones de cada persona?
3. **Carga de disponibilidad:** ¿cada profesional carga y modifica su propia disponibilidad horaria, o la administra recepción de forma centralizada?
4. **Duración de turnos:** ¿es fija por tipo de profesional (ej. 30 min Nutrición, 50 min Psicología) o configurable por profesional?
5. **Alcance del rol administración:** ¿administración puede reservar/cancelar en nombre de un socio (atención telefónica/presencial), o el autoservicio es el único canal de reserva?
6. **Pagos parciales y planes:** ¿el MVP contempla solo pago completo de cuota/sesión, o también pagos parciales y planes (ej. cuota mensual + pack de sesiones)?
7. **Baja de socios:** ¿la baja es lógica (conserva historial) o física? Impacta el diseño del esquema desde el Sprint 1.

---

## Conclusión

El proyecto es viable en sus tres dimensiones. **Técnica:** el stack cubre la totalidad del MVP con tecnologías maduras, y el despliegue gratuito fue verificado como suficiente para la escala del problema. **Temporal:** 4 módulos en ~10 semanas con sprints de 2 semanas, con el desglose del módulo de autenticación (Metodología de Sistemas I) como evidencia de capacidad de estimación y las funcionalidades nice to have como margen de ajuste. **Operativa y de conocimiento:** el equipo aplica el principio de que la familiaridad con una tecnología es un factor de viabilidad de primer orden — Spring Boot y JPA provienen de Programación III y React del recorrido de la carrera — y la elección de PaaS elimina la administración de infraestructura.

Se solicita la revisión de este RFC por parte de la tutora, en particular de las [preguntas sin resolver](#preguntas-sin-resolver). Con su visto bueno, el estado pasa a ✅ Aceptado y el documento se presenta como 1.ª entrega de la cátedra.

---

## Minutas

Registro de reuniones del equipo y con la tutora:

| Fecha | Participantes | Temas tratados | Decisiones / Acuerdos |
|---|---|---|---|
| _(completar)_ | Renzo · Pablo | Definición del proyecto y formato RFC | Se adopta Vitalys como proyecto del TFI y RFC como formato de propuesta |
