# RFC-0001 — Vitalys App: Propuesta de Proyecto (TFI)

| Campo        | Valor                                    |
| ------------ | ---------------------------------------- |
| **RFC**      | 0001                                     |
| **Autores**  | Renzo Calcatelli · Pablo Basualdo Arcati |
| **Revisora** | Sofía Raia (tutora)                      |
| **Estado**   | 🟡 Borrador                              |
| **Creado**   | agosto 2026                              |

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
9. [Decisiones de dominio propuestas](#decisiones-de-dominio-propuestas)
10. [Conclusión](#conclusión)
11. [Minutas](#minutas)

---

## Revisiones

| Versión | Fecha    | Cambio                         | Autor                              |
| ------- | -------- | ------------------------------ | ---------------------------------- |
| 0.1     | ago 2026 | Versión inicial en formato RFC | R. Calcatelli · P. Basualdo Arcati |
| 0.2     | 10/08/2026 | Decisiones de dominio cerradas (antes preguntas abiertas), tratamiento de datos personales, división de responsabilidades y ajustes de consistencia | P. Basualdo Arcati |

---

## Resumen

Vitalys App es una aplicación web responsive para la gestión integral de un centro de salud híbrido (gimnasio + consultorios de Nutrición, Psicología y Kinesiología). Centraliza en una única plataforma la identidad de socios y pacientes, la agenda de turnos por profesional y el registro de pagos. Este RFC propone el problema a resolver, el alcance del MVP, el stack tecnológico y el plan de trabajo para el Trabajo Final Integrador de la TUP (UTN), y solicita comentarios de la tutora y del equipo antes de dar por cerrada la propuesta.

**Repositorio:** https://github.com/rcalcatelli/vitalys-app

---

## Motivación

### Contexto y relevamiento

_(Completar con el anclaje real de la Actividad 1: describir en primera persona cómo funciona hoy un centro/gimnasio que conozcas — cómo se anotan los turnos, cómo se cobran las cuotas, qué herramientas usan.)_

Los centros de salud híbridos —que combinan gimnasio con consultorios profesionales de Nutrición, Psicología y Kinesiología— gestionan su operación diaria con herramientas desconectadas entre sí: planillas de socios, agendas en papel o WhatsApp por cada profesional, y registros de cobros en cuadernos o Excel.

### Actores involucrados

| Actor                      | Rol en el proceso actual                                                                     | Necesidad principal                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Socio / Paciente           | Asiste al gimnasio y/o a consultorios; muchas veces es la misma persona registrada dos veces | Reservar turnos y conocer su estado de cuenta sin depender del horario de recepción |
| Profesionales              | Administran su propia agenda de forma aislada                                                | Ver su agenda unificada y evitar superposiciones                                    |
| Recepción / Administración | Centraliza cobros, turnos y consultas telefónicas; cuello de botella operativo               | Reducir tareas manuales repetitivas y errores de registro                           |
| Dueño / Encargado          | Supervisa ingresos y actividad del centro                                                    | Información consolidada y confiable para decidir                                    |

### Problema central e impacto

La información del centro vive fragmentada en herramientas que no se comunican. Esto produce: turnos superpuestos o perdidos, personas duplicadas en los registros (como socio y como paciente, con datos inconsistentes), pagos sin trazabilidad y una carga administrativa repetitiva. Para el negocio implica ingresos no cobrados, señales de abandono de socios que nadie detecta a tiempo y decisiones tomadas sin datos confiables.

### Propuesta de valor (digitalizar vs. agregar valor)

Una planilla bien armada ya digitaliza; Vitalys agrega valor que las herramientas convencionales no pueden lograr:

1. **Identidad única socio-paciente:** cada persona es una sola entidad con historial unificado de cuotas y turnos.
2. **Reglas de negocio automáticas:** el sistema impide superposiciones de turnos y condiciona la reserva al estado de cuenta de la persona, sin depender de la memoria de un operador (ver [Decisión 1](#decisiones-de-dominio-propuestas)).
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

1. **Autenticación y roles** — socio/paciente, profesional y administración. El dueño/encargado opera con el rol administración: el MVP no define un rol propietario separado.
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

### Tratamiento de datos personales

Aunque la ficha clínica queda fuera de alcance, el sistema maneja datos alcanzados por la Ley 25.326 de Protección de los Datos Personales, que califica como sensible la información referida a la salud. El solo hecho de que una persona tenga un turno registrado con Psicología o Kinesiología constituye un dato de esa naturaleza, independientemente de que no se almacene contenido clínico alguno.

El MVP adopta tres medidas proporcionales al alcance académico del proyecto:

1. **Minimización:** se registran únicamente los datos necesarios para identificar a la persona y operar el turno o el pago. No se almacenan diagnósticos, motivos de consulta ni observaciones clínicas.
2. **Acceso por rol:** un profesional accede exclusivamente a su propia agenda y a los datos de contacto de las personas que atiende, nunca a la agenda de otros profesionales ni al detalle de pagos.
3. **Transporte y credenciales:** comunicación sobre HTTPS (provisto por la plataforma PaaS) y contraseñas almacenadas con hash y sal, nunca en texto plano.

No se declara cumplimiento normativo integral: un tratamiento formal exigiría registro de la base ante la autoridad de aplicación, política de retención y procedimiento de acceso y supresión, aspectos que exceden el alcance de un trabajo académico y quedan señalados como requisito de una eventual puesta en producción real.

### Metodología de trabajo y uso de IA

Modelo Incremental con marco Scrum (sprints de 2 semanas), según la planificación elaborada en Metodología de Sistemas I: roadmap, análisis de stakeholders, matriz de riesgos y definiciones de prueba. Seguimiento mediante Issues y Pull Requests en GitHub; los cambios a este RFC se comentan por PR.

**División de responsabilidades.** El equipo trabaja con ambos integrantes sobre la totalidad del stack; no se divide por capa (uno backend, otro frontend). Cada módulo del MVP tiene un responsable primario que lo lleva de punta a punta —modelo de datos, endpoint e interfaz— y el otro integrante revisa el Pull Request. Ningún cambio se integra sin revisión del otro: no hay auto-merge.
_Fundamento:_ dividir por capa concentra el conocimiento y deja a cada integrante ciego sobre la mitad del sistema, lo que es un riesgo real en un equipo de dos y una desventaja en la defensa oral, donde ambos responden por todo el proyecto. La asignación de responsable primario por módulo se define al inicio de cada sprint y se refleja en el tablero de Issues.

Durante la elaboración de esta propuesta se utilizaron herramientas de IA como interlocutor técnico, conforme a los lineamientos de la cátedra: para revisar la consistencia del alcance, contrastar alternativas de stack y explorar casos borde del dominio (cancelaciones, superposiciones, estados de morosidad). Las decisiones de alcance y tecnología fueron analizadas y adoptadas por el equipo.

---

## Tareas y roadmap

| Sprint   | Período       | Objetivo principal                                                                                          |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| Sprint 1 | 31/08 – 13/09 | Diseño del esquema de base de datos, setup de proyectos (Spring Boot, React) y despliegue inicial de prueba |
| Sprint 2 | 14/09 – 27/09 | Autenticación y roles · **2.ª entrega: esquema de BD y módulos (27/09)**                                    |
| Sprint 3 | 28/09 – 11/10 | Gestión de socios y pacientes                                                                               |
| Sprint 4 | 12/10 – 25/10 | Agenda de turnos                                                                                            |
| Sprint 5 | 26/10 – 08/11 | Registro de pagos · nice to have según margen                                                               |
| Cierre   | 09/11 – 14/11 | Estabilización, informe final y video · **Entrega final (14/11)**                                           |

| Hito de la cátedra                               | Fecha límite   | Estado |
| ------------------------------------------------ | -------------- | ------ |
| Formación del equipo y elección de tutora        | —              | ✅     |
| Propuesta y repositorio (1.ª entrega)            | 30/08          | 🔜     |
| Esquema de BD y listado de módulos (2.ª entrega) | 27/09          | ⏳     |
| Informe final, video y despliegue                | 14/11          | ⏳     |
| Defensa oral                                     | mesa de examen | ⏳     |

---

## Stack tecnológico

### Stack seleccionado

| Capa          | Tecnología                                           | Justificación                                                                     |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Backend       | Java 17 · Spring Boot · Spring Data JPA              | Trabajado en profundidad en Programación III; ecosistema maduro para APIs REST    |
| Frontend      | React · TypeScript                                   | Estándar de la industria; tipado estático que reduce errores                      |
| Base de datos | PostgreSQL (Supabase, PaaS)                          | El dominio (turnos, pagos, personas) exige integridad referencial y transacciones |
| Despliegue    | Vercel (frontend) · Render (backend), modalidad PaaS | Planes gratuitos suficientes; cumple el requisito de servicio en la nube          |
| Versionado    | Git · GitHub (repositorio único)                     | Requisito de la cátedra; trabajo por ramas y Pull Requests                        |

### Alternativas consideradas

- **Backend — Node.js/Express:** ecosistema válido y liviano, pero el equipo tiene mayor recorrido en Java/Spring Boot (Programación III). Se prioriza el menor costo de aprendizaje: el tiempo disponible se invierte en el producto, no en aprender un framework con fecha de entrega comprometida.
- **Base de datos — MongoDB (documental):** el equipo posee experiencia en modelado documental, agregaciones y validadores. Se opta por PostgreSQL porque el dominio es fuertemente relacional: un turno referencia a un profesional y a una persona, no admite superposición, y los pagos exigen consistencia transaccional. Estas garantías las provee el motor relacional de forma nativa; en un modelo documental deberían implementarse en la capa de aplicación, aumentando el riesgo de errores.
- **Despliegue — VPS con Docker:** se opta por PaaS por menor carga operativa: sin administración de servidores, con HTTPS y despliegue continuo desde GitHub incluidos. Docker queda como mejora futura si el proyecto lo requiriera.

### Escalabilidad respecto del problema

La escala esperada es la de un centro chico o mediano: cientos de personas registradas, decenas de turnos diarios, un puñado de usuarios concurrentes. El stack soporta ese volumen con holgura en planes gratuitos y tiene camino de crecimiento conocido si la escala aumentara. No se sobredimensiona la arquitectura (microservicios, colas, caché distribuida) para una escala que el problema no exige.

---

## Métricas

Criterios verificables de éxito del proyecto:

| Métrica                             | Objetivo                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Módulos MVP completos y funcionando | 4 de 4 desplegados en producción al 14/11                                                     |
| Despliegue en la nube               | Frontend, backend y base de datos accesibles públicamente por URL desde el Sprint 1, con arranque en frío documentado (limitación del plan gratuito, ver [Riesgos](#riesgos)) |
| Integridad del dominio              | 0 superposiciones de turnos posibles por diseño (restricciones en BD + validación en API)     |
| Trazabilidad de pagos               | Todo pago registrado queda asociado a una persona y a un concepto (cuota o sesión)            |
| Proceso de desarrollo               | 100% de los cambios integrados por Pull Request; tablero de Issues actualizado por sprint     |
| Entregas de la cátedra              | 3 de 3 entregas presentadas en fecha con aprobación de la tutora                              |

---

## Riesgos

| Riesgo / Limitación                                                   | Impacto                                  | Mitigación                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Free tier de Render duerme el backend sin tráfico (arranque ~30-50 s) | Demo lenta al inicio                     | Precalentar el servicio antes de presentaciones; documentado en README                         |
| Proyecto gratuito de Supabase se pausa tras 7 días de inactividad     | Base inaccesible en demo                 | Actividad periódica; reactivación previa a entregas y defensa                                  |
| Sin backups automáticos en planes gratuitos                           | Pérdida de datos de prueba               | Scripts DDL/DML versionados en `/db` permiten recrear la base                                  |
| Curva de integración Spring Boot + React (CORS, JWT)                  | Retraso en el módulo de autenticación    | Es el primer módulo del plan y ya cuenta con desglose detallado de tareas                      |
| Cambiar de tecnología en etapa avanzada                               | Alto: retrabajos y retrasos              | Decisión de stack cerrada en este RFC y validada con la tutora antes de iniciar el desarrollo  |
| Superposición del TFI con la cursada de otras materias                | Menor dedicación en semanas de parciales | Sprints con margen (nice to have como buffer); planificación de carga al inicio de cada sprint |
| Devolución de las decisiones de dominio posterior al inicio del Sprint 1 (31/08) | Diseño del esquema bloqueado o rehecho: la baja lógica y la duración de turnos condicionan el modelo desde el primer sprint | Las [decisiones de dominio propuestas](#decisiones-de-dominio-propuestas) se adoptan por defecto si no hay devolución al 30/08; toda corrección posterior entra como cambio de alcance por Pull Request |
| Sprint 5 (pagos) cierra el 08/11, seis días antes de la entrega final | Sin colchón para estabilizar, informe y video si el módulo se atrasa | Registro de pagos se implementa en su versión mínima (pago completo, sin parciales); los nice to have se descartan ante el primer día de atraso, no al final |

---

## Decisiones de dominio propuestas

El equipo tomó una posición sobre las decisiones de dominio que condicionan el diseño del esquema y de la API. Se presentan con su fundamento para que la tutora las valide o corrija; no son preguntas abiertas.

**1. Morosidad y reservas.** El socio con cuota de gimnasio vencida por más de 10 días corridos queda bloqueado para reservar turnos de gimnasio. Las sesiones de consultorio no se bloquean: se pagan por sesión y son un vínculo independiente de la membresía. Administración puede autorizar una excepción puntual, que queda registrada.
_Fundamento:_ la regla automática es propuesta de valor del sistema, pero bloquear una consulta de Psicología por una cuota de gimnasio impaga confunde dos relaciones comerciales distintas y expone al centro a un problema asistencial.

**2. Cancelaciones.** El cupo se libera si la cancelación ocurre con 24 horas de anticipación o más. Dentro de las 24 horas el turno se marca como cancelado fuera de término, no se libera y queda asentado. Toda cancelación se registra con fecha, autor y motivo. El MVP no aplica penalidades automáticas.
_Fundamento:_ 24 h es el estándar de la actividad y da margen real de reasignación. Registrar sin penalizar habilita a futuro una política de penalidades con datos históricos ya disponibles.

**3. Carga de disponibilidad.** Cada profesional carga y modifica su propia disponibilidad. Administración puede editar la de cualquier profesional como rol supervisor.
_Fundamento:_ centralizar la carga en recepción reproduce el cuello de botella que el proyecto busca eliminar. El permiso de administración cubre los casos reales de licencia o ausencia.

**4. Duración de turnos.** La duración se almacena por profesional, inicializada con un valor por defecto según especialidad (30 min Nutrición, 50 min Psicología, 45 min Kinesiología).
_Fundamento:_ una sola columna en la entidad `Profesional` cubre ambos escenarios. Fijarla por especialidad sería más simple pero obligaría a una migración ante el primer profesional que atienda distinto, y ese caso es frecuente.

**5. Alcance del rol administración.** Administración puede reservar y cancelar en nombre de una persona. Toda operación registra qué usuario la ejecutó y sobre qué persona.
_Fundamento:_ el canal telefónico y presencial no desaparece porque exista autoservicio. El autoservicio descomprime a recepción; no la reemplaza. La auditoría de autor mantiene la trazabilidad.

**6. Pagos parciales y planes.** El MVP contempla únicamente el pago completo de una cuota mensual o de una sesión individual. Pagos parciales, packs de sesiones y planes combinados quedan fuera de alcance.
_Fundamento:_ los pagos parciales introducen saldos, imputación y estados intermedios de deuda — un módulo en sí mismo. El objetivo del MVP es la trazabilidad del pago, no la gestión de cuentas corrientes.

**7. Baja de socios.** La baja es lógica en todos los casos: la persona conserva su registro con estado `INACTIVO` y fecha de baja. No se contempla borrado físico.
_Fundamento:_ el historial de pagos y turnos debe sobrevivir a la baja por trazabilidad, y una persona dada de baja suele volver. El borrado físico rompería las referencias de pagos y turnos históricos. Decisión con impacto directo en el esquema del Sprint 1.

> Si no se recibe devolución antes del 30/08, el equipo adopta estas decisiones como cerradas para poder iniciar el Sprint 1 en fecha. Cualquier corrección posterior se procesa como cambio de alcance mediante Pull Request sobre este RFC.

---

## Conclusión

El proyecto es viable en sus tres dimensiones. **Técnica:** el stack cubre la totalidad del MVP con tecnologías maduras, y el despliegue gratuito fue verificado como suficiente para la escala del problema. **Temporal:** 4 módulos en ~10 semanas con sprints de 2 semanas, con el desglose del módulo de autenticación (Metodología de Sistemas I) como evidencia de capacidad de estimación y las funcionalidades nice to have como margen de ajuste. **Operativa y de conocimiento:** el equipo aplica el principio de que la familiaridad con una tecnología es un factor de viabilidad de primer orden — Spring Boot y JPA provienen de Programación III y React del recorrido de la carrera — y la elección de PaaS elimina la administración de infraestructura.

Se solicita la revisión de este RFC por parte de la tutora, en particular de las [decisiones de dominio propuestas](#decisiones-de-dominio-propuestas). Con su visto bueno, el estado pasa a ✅ Aceptado y el documento se presenta como 1.ª entrega de la cátedra.

---

## Minutas

Registro de reuniones del equipo y con la tutora:

| Fecha      | Participantes | Temas tratados                        | Decisiones / Acuerdos                                                   |
| ---------- | ------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| 09/08/2026 | Renzo · Pablo | Definición del proyecto y formato RFC | Se adopta Vitalys como proyecto del TFI y RFC como formato de propuesta |
