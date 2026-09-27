# RFC-0001 — Vitalys App: Propuesta de Proyecto (TFI)

| Campo        | Valor                                    |
| ------------ | ---------------------------------------- |
| **RFC**      | 0001                                     |
| **Autores**  | Renzo Calcatelli · Pablo Basualdo Arcati |
| **Revisora** | Sofía Raia (tutora)                      |
| **Estado**   | ✅ Aprobada (30/08/2026)                              |
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
| 0.3     | 25/09/2026 | Alcance ampliado a 6 módulos MVP (se incorporan Profesionales/Disponibilidad y Notificaciones). Sprint plan actualizado. Minutas de aprobación de tutora incorporadas. | R. Calcatelli |

---

## Resumen

Vitalys App es una aplicación web responsive para la gestión integral de un centro de salud híbrido (gimnasio + consultorios de Nutrición, Psicología y Kinesiología). Centraliza en una única plataforma la identidad de socios y pacientes, la agenda de turnos por profesional y el registro de pagos. Este RFC propone el problema a resolver, el alcance del MVP, el stack tecnológico y el plan de trabajo para el Trabajo Final Integrador de la TUP (UTN), y solicita comentarios de la tutora y del equipo antes de dar por cerrada la propuesta.

**Repositorio:** https://github.com/rcalcatelli/vitalys-app

---

## Motivación

### Contexto y relevamiento

Los centros de salud híbridos —que combinan gimnasio con consultorios profesionales de Nutrición, Psicología y Kinesiología— gestionan su operación diaria con herramientas desconectadas entre sí: planillas de socios, agendas en papel o WhatsApp por cada profesional, y registros de cobros en cuadernos o Excel.

#### Metodología del relevamiento

En su revisión de la 1.ª entrega (ver [Minutas](#minutas), 22/08/2026), la tutora pidió incorporar relevamiento real. Vitalys es, sin embargo, un caso de estudio propio: no hay un centro de salud concreto disponible para relevar durante la cursada, y simular una serie de entrevistas que no ocurrieron sería peor que no tener relevamiento. Por eso el equipo optó por perfiles de usuario sintéticos como alternativa metodológica explícita, en lugar de entrevistas de campo o de una ficción de entrevistas: doce perfiles (cuatro por cada rol del sistema — SOCIO_PACIENTE, PROFESIONAL, ADMIN), construidos a partir del dominio y de la experiencia de uso de gimnasios y centros de salud similares, para contrastar el catálogo de requerimientos (RF/RN) contra necesidades concretas y detectar huecos funcionales antes de implementar.

El artefacto completo está en [`relevamiento/perfiles-usuario.json`](./relevamiento/perfiles-usuario.json), rotulado explícitamente `"naturaleza": "SINTETICO"`. **Esto no es relevamiento de campo ni testimonio de personas reales**: es un artefacto de diseño elaborado por el equipo. Ninguna cita o necesidad atribuida a un perfil debe leerse como declaración textual de una persona entrevistada, sino como una formulación del equipo que representa una necesidad esperable de ese perfil. Esta aclaración es independiente de la referencia a un establecimiento real que orienta el caso de estudio (ver [Cliente](#cliente)): esa referencia da contexto general al dominio, no sustituye al relevamiento de usuarios.

#### Síntesis por tipo de usuario

- **SOCIO_PACIENTE** (4 perfiles): socios que combinan gimnasio y consultorio, o solo uno de los dos. El eje común es reservar sin depender del horario de recepción y entender con anticipación su estado de cuenta y las reglas de cancelación. El perfil que combina gimnasio y Psicología en la misma cuenta (SP-04) confirma que la identidad única socio-paciente no es un caso de borde sino frecuente.
- **PROFESIONAL** (4 perfiles): tres perfiles (Nutrición, Psicología, Kinesiología) encajan en el modelo de agenda individual con duración configurable. El cuarto (PR-04, entrenamiento en sala) no atiende turnos individuales y no encaja en ese modelo — ver hallazgo crítico abajo.
- **ADMIN** (4 perfiles): recepción, cobranzas, altas/bajas y dirección. Tres perfiles validan el diseño actual (operar en nombre de terceros, ficha única por persona); el de cobranzas expone un hueco de datos (fecha de inicio de membresía) y el de dirección confirma que los reportes agregados quedan fuera del alcance del MVP.

#### Hallazgos que cuestionan el diseño

El valor del relevamiento no está en confirmar lo ya definido, sino en lo que obliga a revisar:

1. **El perfil PR-04 (profesional de sala) no encaja en el modelo de PROFESIONAL.** El esquema asume agenda individual con `profesional_id` por turno; un entrenador de sala no atiende turnos propios y ese modelo no lo representa.
2. **No hay forma de consultar el cupo disponible de un turno de gimnasio** antes de reservar (perfil SP-01): el esquema previo no tenía el concepto de cupo por franja.
3. **Nadie tenía definido quién marca `COMPLETADO` o `AUSENTE` en un turno de gimnasio** (perfil PR-01): RF-22 asigna esa acción al profesional del turno, y el turno de gimnasio no tiene profesional asignado.
4. **Falta la fecha de inicio de membresía** para calcular desde cuándo se adeuda una cuota (perfil AD-02): sin ese dato, un socio nuevo puede aparecer como moroso desde el primer día.
5. **No está definido qué pasa con los turnos ya reservados cuando un profesional reduce su disponibilidad** (perfil PR-03).
6. **Reportes e indicadores agregados quedan fuera del alcance del MVP** (perfil AD-04, dirección del centro): se documenta explícitamente para que no aparezca como un olvido.

Los hallazgos 1, 2 y 3 quedan resueltos a nivel de dominio por las reglas de gimnasio de la [Decisión de dominio 11](#decisiones-de-dominio-propuestas) (el endpoint de consulta de cupo se diseña en el módulo de Agenda de Turnos); los hallazgos 4 y 5 permanecen abiertos y quedan documentados aquí para no perderlos antes de encarar ese módulo; el hallazgo 6 ya estaba reflejado en el alcance del MVP.

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

Caso de estudio propio (centro de salud híbrido "Vitalys"), sin un establecimiento real asociado: el dominio se construyó a partir de perfiles de usuario elaborados por el equipo (ver la sección de relevamiento). El proyecto da continuidad al trabajo de planificación desarrollado por el equipo en Metodología de Sistemas I (ver `/docs/metodologia`).

---

## Implementación propuesta

### Arquitectura general

Aplicación web responsive con arquitectura cliente-servidor: frontend SPA (React) que consume una API REST (Spring Boot) sobre una base de datos relacional (PostgreSQL). Autenticación basada en tokens (JWT) con control de acceso por roles. Al menos un componente desplegado en la nube conforme al requisito de la cátedra (ver [Stack tecnológico](#stack-tecnológico)).

### Alcance — MVP (compromiso de entrega)

1. **Autenticación y roles** — socio/paciente, profesional y administración. El dueño/encargado opera con el rol administración: el MVP no define un rol propietario separado.
2. **Gestión de personas** — alta, baja lógica, modificación y consulta con identidad única socio-paciente.
3. **Profesionales y disponibilidad** — ABM de profesionales, gestión de franjas horarias semanales con control de solapamiento.
4. **Agenda de turnos** — reserva y cancelación para turnos de consultorio y de gimnasio, sin superposiciones (EXCLUDE GIST en BD).
5. **Registro de pagos** — cuotas de gimnasio y sesiones de consultorio, estado de cuenta por persona, control de morosidad.
6. **Notificaciones por email** — confirmación de reserva, aviso de cancelación y recordatorio 24 h antes.

### Alcance — Nice to have (si el plan lo permite)

- **Reportes básicos** — ingresos del período y ocupación de turnos para administración.

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

| Sprint   | Período       | Objetivo principal · Responsable primario                                                                          |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Sprint 1 | 31/08 – 13/09 | DDL definitivo, setup Spring Boot + React, despliegue inicial · **R. Calcatelli**                                  |
| Sprint 2 | 14/09 – 27/09 | Autenticación y roles (JWT) · **2.ª entrega: esquema de BD y módulos (27/09)** · **P. Basualdo Arcati**           |
| Sprint 3 | 28/09 – 11/10 | Módulo Personas (ABM) + Módulo Profesionales y Disponibilidad · **R. Calcatelli / P. Basualdo Arcati**            |
| Sprint 4 | 12/10 – 25/10 | Módulo Agenda de Turnos (reserva, cancelación, validaciones) · **R. Calcatelli**                                   |
| Sprint 5 | 26/10 – 08/11 | Módulo Pagos + Módulo Notificaciones por email · **P. Basualdo Arcati**                                            |
| Cierre   | 09/11 – 14/11 | Estabilización, informe final y video · **Entrega final (14/11)**                                                  |

| Hito de la cátedra                               | Fecha límite   | Estado |
| ------------------------------------------------ | -------------- | ------ |
| Formación del equipo y elección de tutora        | —              | ✅     |
| Propuesta y repositorio (1.ª entrega)            | 30/08          | ✅     |
| Esquema de BD y listado de módulos (2.ª entrega) | 27/09          | ⏳     |
| Informe final, video y despliegue                | 14/11          | ⏳     |
| Defensa oral                                     | mesa de examen | ⏳     |

> **Estado a 27/09/2026:** la 2.ª entrega fue presentada en fecha, pero la tutora todavía no la cerró. El código existe y está verificado: `backend/` es un proyecto Spring Boot completo con autenticación JWT, 37 tests en verde y 95,5% de cobertura; `frontend/` es un proyecto Vite + React + TypeScript con login y guard por rol. El Sprint 2 está completo. El Sprint 1 está parcial: resta crear el proyecto en Supabase, ejecutar las migraciones contra esa base y desplegar en Render y Vercel, tareas que dependen de las cuentas del equipo. Las fechas del cronograma no se modifican y siguen cerrando contra la entrega final del 14/11.

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
| Módulos MVP completos y funcionando | 6 de 6 desplegados en producción al 14/11                                                     |
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

**8. Identidad única y roles múltiples.** El modelo de autenticación asigna un único rol por usuario. Un profesional que también sea socio del gimnasio requiere dos cuentas con emails distintos. Esta situación no se contempla en el MVP y se documenta como **limitación de diseño conocida**: la complejidad de un sistema multi-rol por usuario (selección de rol activo, contextos de permisos combinados) excede el alcance académico del proyecto. Si el caso de uso se volviera frecuente, el RFC correspondiente debería evaluar una tabla de relación `usuario_roles` y un mecanismo de cambio de contexto en el frontend.
_Fundamento:_ ninguno de los perfiles de usuario elaborados describe a un profesional que además sea socio del gimnasio, por lo que el caso no se considera frecuente en este dominio. La regla simple de un rol por usuario simplifica la implementación de Spring Security y reduce la superficie de errores en Sprint 2.

**9. Cierre de sesión con JWT.** El endpoint de logout no invalida el token en el servidor. La sesión se cierra descartando el token del lado del cliente (localStorage). El token permanece técnicamente válido hasta su TTL. Esta es una **limitación documentada del MVP**: la implementación de una lista negra de tokens (Redis u otra solución) introduce una dependencia de infraestructura adicional y no está en el alcance académico. El TTL corto (configurado en 24 h) acota la ventana de riesgo.
_Fundamento:_ todos los endpoints están protegidos por HTTPS. El sistema maneja categorías de datos alcanzadas por la Ley 25.326 —datos identificatorios de personas y, en los turnos de Psicología, datos referidos a la salud (ver [Tratamiento de datos personales](#tratamiento-de-datos-personales))—, por lo que no corresponde calificarlos de "no sensibles". El riesgo residual de esta decisión se acepta en un contexto académico donde los datos cargados son ficticios, no porque el dominio carezca de datos sensibles.

**10. Rol forzado en el registro público y vínculo de fichas por email.** El registro público (`POST /api/auth/registro`) crea siempre un usuario con rol `SOCIO_PACIENTE`; el campo `rol` no forma parte del contrato de entrada y, si el body lo incluye, el servicio responde 400 antes de crear ningún registro. Cuando el ADMIN carga la ficha de una persona (`POST /api/personas`) puede optar por vincularla a un usuario que ya se autorregistró (`POST /api/personas/vincular`) en lugar de crear credenciales nuevas; el vínculo se resuelve buscando el `usuario_id` por email antes del INSERT en `personas`, sin tocar la restricción `usuario_id NOT NULL UNIQUE` del esquema. Los profesionales no tienen endpoint de vínculo: el alta de un profesional (`POST /api/profesionales`) crea siempre `usuario` (rol `PROFESIONAL`) y `profesional` en la misma operación.
_Fundamento:_ permitir un `rol` libre en el registro público contradecía a CA-01-4, RN-10 y los diagramas de casos de uso y de clases, que ya asumían rol forzado; era una inconsistencia documental, no una decisión pendiente. El vínculo por email para personas resuelve el caso real de alguien que se registra solo y luego se acerca al centro para completar su ficha. Ese mismo caso no existe para profesionales: la Decisión 8 fija un único rol por usuario, y todo usuario autorregistrado es por definición `SOCIO_PACIENTE`; vincular esa cuenta como profesional exigiría promover su rol, lo que contradice una decisión ya aceptada el 30/08. Inventar un endpoint de vínculo simétrico para profesionales habría reabierto exactamente el caso que la Decisión 8 cerró.
_Incorporada tras la devolución de la 2.ª entrega, como cambio de alcance mediante Pull Request, según el mecanismo declarado al cierre de esta sección._

**11. Turnos de gimnasio: grilla horaria, cupo y check-in.** El gimnasio no funciona con profesional asignado por turno, sino con una grilla horaria propia: franjas de 60 minutos en punto, de lunes a viernes de 07:00 a 21:00 y los sábados de 09:00 a 12:00; el domingo permanece cerrado. Cada franja tiene un cupo máximo configurable de personas (parámetro único en `configuracion_gym`, inicializado en 20) y cada persona puede reservar como máximo un turno de gimnasio por día. Solo pueden reservar quienes son socios activos del gimnasio. La cancelación libera el cupo si ocurre con 2 horas de anticipación o más, contra las 24 horas de consultorio (Decisión 2). Al no existir profesional asignado, es el rol ADMIN quien marca el turno como `COMPLETADO` en el check-in; si nadie lo marca, el sistema lo pasa automáticamente a `AUSENTE` al cerrar la franja.
_Fundamento:_ el turno de gimnasio es un recurso compartido (el espacio y las máquinas), no la agenda de una persona: el cupo por franja modela esa diferencia sin forzar un `profesional_id` artificial en cada turno. La anticipación de cancelación baja a 2 horas porque liberar un lugar de gimnasio no depende de reorganizar la agenda de un profesional; exigir 24 horas como en consultorio dejaría cupos vacíos evitables. Que el check-in lo marque el ADMIN —y no un profesional, como en consultorio— es consecuencia directa del hallazgo 3 del relevamiento (perfil PR-01, ver [Motivación](#motivación)): nadie tenía asignada esa responsabilidad en un modelo de agenda individual que el turno de gimnasio no sigue.
_Incorporada como cambio de alcance mediante Pull Request, a partir de los hallazgos del relevamiento de usuarios y de las reglas ya implementadas en `db/migration/V2__reglas_gimnasio.sql`._

> Si no se recibe devolución antes del 30/08, el equipo adopta estas decisiones como cerradas para poder iniciar el Sprint 1 en fecha. Cualquier corrección posterior se procesa como cambio de alcance mediante Pull Request sobre este RFC.

---

## Conclusión

El proyecto es viable en sus tres dimensiones. **Técnica:** el stack cubre la totalidad del MVP con tecnologías maduras, y el despliegue gratuito fue verificado como suficiente para la escala del problema. **Temporal:** 6 módulos en ~10 semanas con sprints de 2 semanas, con el desglose del módulo de autenticación (Metodología de Sistemas I) como evidencia de capacidad de estimación y las funcionalidades nice to have como margen de ajuste. **Operativa y de conocimiento:** el equipo aplica el principio de que la familiaridad con una tecnología es un factor de viabilidad de primer orden — Spring Boot y JPA provienen de Programación III y React del recorrido de la carrera — y la elección de PaaS elimina la administración de infraestructura.

Este RFC (RFC-0001) fue revisado y aprobado por la tutora el 30/08/2026 (ver [Minutas](#minutas), reunión del 22/08/2026). El estado es ✅ Aceptado y el documento fue presentado como 1.ª entrega de la cátedra. La fecha 21/09/2026 que figura en las Minutas corresponde a la revisión del RFC-002 (diseño de base de datos), un documento distinto de este.

---

## Minutas

Registro de reuniones del equipo y con la tutora:

| Fecha      | Participantes | Temas tratados                        | Decisiones / Acuerdos                                                   |
| ---------- | ------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| 09/08/2026 | Renzo · Pablo | Definición del proyecto y formato RFC | Se adopta Vitalys como proyecto del TFI y RFC como formato de propuesta |
| 22/08/2026 | Renzo · Pablo · Sofía | Revisión de la 1.ª entrega (RFC-001) | Tutora aprueba la propuesta (✅ 30/08/2026). Indica incorporar relevamiento real; las decisiones de dominio quedan aceptadas. |
| 11/09/2026 | Renzo · Pablo | Preparación de la 2.ª entrega | Se decide evaluar MongoDB vs PostgreSQL (origina RFC-002). Se genera DDL v1 en base al diseño de dominio de Metodología I. |
| 21/09/2026 | Renzo · Pablo · Sofía | Revisión del RFC-002 y diseño de BD | Tutora aprueba PostgreSQL (Opción A) y el DDL existente. Solicita ajustes: tipos ENUM faltantes, estado AUSENTE, tabla excepciones_morosidad, constraint de cancelación, diccionario de datos, requerimientos y diagramas (correcciones aplicadas en #6 y #7). |
| 25/09/2026 | Renzo · Pablo | Presentación de la 2.ª entrega (versión final) | Se incorporan todos los ajustes indicados: DDL v2, diccionario de datos, catálogo de requerimientos + HUs, diagramas (casos de uso, estados, secuencias, clases, arquitectura). Alcance ampliado a 6 módulos. |
