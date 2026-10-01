# Guía de entrevista — Relevamiento de situación actual (AS-IS)

**Vitalys App · Trabajo Final Integrador · TUP · UTN · 2026**
Autores: Renzo Calcatelli · Pablo Basualdo Arcati

---

## Objetivo

Describir **cómo funciona hoy** un centro deportivo real: cómo se otorgan los turnos,
cómo se cobran las cuotas y qué herramientas se usan. El resultado alimenta la sección
*Situación actual (AS-IS)* de [`../propuesta-proyecto-rfc.md`](../propuesta-proyecto-rfc.md).

Esto es relevamiento de campo: se registra **lo que la persona entrevistada dice**, no lo
que el equipo supone. Cuando un dato no se pueda confirmar, se anota como no relevado en
lugar de completarlo por inferencia.

---

## Antes de empezar — datos a registrar

| Dato | Para qué |
|---|---|
| Nombre del establecimiento | Trazabilidad del artefacto |
| Rol de quien responde (recepción, administración, dueño, profesor) | El rol condiciona qué parte del circuito conoce |
| Fecha y duración de la entrevista | Metodología |
| Modalidad (presencial / telefónica) | Metodología |
| Autorización para nombrar el establecimiento en el informe | Si no la da, se lo refiere de forma genérica |

---

## Cómo preguntar

- **Preguntas abiertas.** "¿Cómo hacen para…?" en lugar de "¿Usan un sistema?".
- **No sugerir la respuesta.** Si se pregunta "¿usan Excel?", la respuesta va a ser Excel.
- **Pedir el caso de excepción.** El circuito normal lo cuentan solos; lo que interesa es
  "¿y cuándo eso no funciona, qué hacen?".
- **Pedir ver la herramienta.** Un vistazo a la planilla o al cuaderno dice más que la
  descripción.
- **Anotar la frase textual** cuando sea buena. Una cita real vale más que un resumen.

---

## Bloque A — El establecimiento y sus servicios

1. ¿Qué servicios ofrecen hoy? (sala de musculación, clases, consultorios, kinesiología,
   nutrición, otros)
2. ¿Aproximadamente cuántas personas activas tienen?
3. ¿Cuántas personas trabajan en la atención al público?
4. ¿Los profesionales que atienden en consultorio son parte del centro o alquilan el
   espacio?
5. Una persona que usa el gimnasio y además se atiende con un profesional del lugar,
   ¿figura una sola vez en los registros o dos?

> **Qué valida:** el modelo de identidad única socio-paciente (RN-10) y la existencia real
> del centro híbrido que el proyecto asume.

---

## Bloque B — Turnos y acceso

6. Para entrar a la sala, ¿hace falta reservar o se entra directamente?
7. Si hay que reservar: ¿cómo se hace? (presencial, teléfono, WhatsApp, app, planilla)
8. ¿Hay un límite de personas por horario? ¿Cómo lo controlan?
9. ¿Qué pasa si se llena un horario? ¿Hay lista de espera?
10. ¿En qué horarios abren? ¿Los sábados es distinto?
11. Para los consultorios, ¿el turno se pide igual que para la sala o es otro circuito?
12. ¿Puede alguien de recepción reservar en nombre de un socio? ¿Pasa seguido?
13. ¿Cada profesional maneja su propia agenda o la maneja recepción?

> **Qué valida:** la existencia del cupo por franja (Decisión 11), la grilla horaria,
> el circuito diferenciado gimnasio/consultorio y la operación en nombre de terceros.

---

## Bloque C — Cancelaciones y ausencias

14. Si una persona no puede ir, ¿avisa? ¿Cómo?
15. ¿Hay algún plazo para avisar? ¿Qué pasa si avisa sobre la hora?
16. ¿Qué pasa si directamente no aparece y no avisó? ¿Tiene alguna consecuencia?
17. ¿Registran quién asistió y quién no? ¿Quién lo registra?

> **Qué valida:** RN-02 (cancelación tardía) y el punto abierto de quién marca la
> asistencia en un turno de gimnasio (hallazgo 3).

---

## Bloque D — Cuotas y morosidad

18. ¿Cómo se paga la cuota? (efectivo, transferencia, débito, mixto)
19. ¿Hay una fecha de vencimiento o cada socio paga en la fecha en que se asoció?
20. ¿Desde cuándo se le empieza a cobrar a alguien que se asocia a mitad de mes?
21. Si una persona deja de pagar un mes y al siguiente paga, ¿el mes salteado se le
    reclama o se da por perdido?
22. ¿A partir de cuándo consideran que alguien está atrasado?
23. ¿Qué pasa cuando alguien está atrasado? ¿Puede entrar igual?
24. ¿Le avisan antes de bloquearlo? ¿Cómo se entera?
25. ¿Hacen excepciones? ¿Quién las autoriza y cómo queda registrado?
26. Si la persona se atiende en consultorio y además es socia del gimnasio, ¿una deuda de
    la cuota le impide el turno del consultorio?

> **Qué valida:** RN-01 (los meses salteados cuentan como impagos), la fecha de inicio de
> membresía (hallazgo 4, ya resuelto), el régimen de excepciones y la Decisión 1
> (independencia entre morosidad de gimnasio y turnos de consultorio).
>
> **Las preguntas 21 y 26 son las más importantes de toda la entrevista**: tocan dos
> decisiones de dominio que el equipo tomó sin evidencia de campo.

---

## Bloque E — Herramientas

27. ¿Con qué anotan todo esto? ¿Me lo podés mostrar?
28. ¿Es un sistema comprado, algo que armaron ustedes, o papel y planilla?
29. Si es un sistema: ¿cuánto sale, hace cuánto lo usan, qué cosas no hace?
30. ¿Los datos de los socios, los turnos y los pagos están en el mismo lugar o separados?
31. ¿Alguien se lleva información a mano o al celular para trabajar?
32. Si mañana se rompe la computadora de recepción, ¿qué pasa?

> **Qué valida:** el diagnóstico de "herramientas desconectadas entre sí" que el RFC
> afirma, y la propuesta de valor frente a las soluciones comerciales.

---

## Bloque F — Dolores

33. ¿Qué es lo que más tiempo les consume en el día a día?
34. ¿Qué es lo que más reclaman los socios?
35. ¿Qué error se repite? (turnos duplicados, cobros mal registrados, gente que entra
    debiendo)
36. Si pudieran automatizar una sola cosa, ¿cuál sería?

> **Qué valida:** el problema central y la priorización del MVP.

---

## Si solo hay cinco minutos

En orden de importancia:

1. **Pregunta 27** — ¿con qué anotan todo esto? (es el corazón del AS-IS)
2. **Pregunta 21** — ¿el mes salteado se reclama o se pierde? (RN-01)
3. **Pregunta 7** — ¿cómo se pide un turno hoy?
4. **Pregunta 23** — ¿el que debe puede entrar igual?
5. **Pregunta 36** — ¿qué automatizarían?

---

## Después de la entrevista

- Pasar las respuestas a `entrevista-<establecimiento>.md` **el mismo día**, antes de que
  se pierda el detalle.
- Marcar explícitamente qué preguntas quedaron sin responder.
- Anotar aparte todo lo que **contradiga** una decisión de dominio ya tomada: eso es lo
  más valioso del relevamiento.
