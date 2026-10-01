# Relevamiento de campo — Centro Deportivo Jerárquicos

**Vitalys App · Trabajo Final Integrador · TUP · UTN · 2026**
Relevamiento realizado por: Pablo Basualdo Arcati
Guía utilizada: [`guia-entrevista.md`](./guia-entrevista.md)

---

## Ficha del relevamiento

| Dato | Valor |
|---|---|
| Establecimiento | Centro Deportivo Jerárquicos |
| Naturaleza | **RELEVAMIENTO DE CAMPO** — respuestas de una persona del establecimiento |
| Fecha | 28/09/2026 |
| Rol de quien responde | _a completar_ |
| Modalidad | Presencial |
| Autorización para nombrar el establecimiento | _a completar_ |

> A diferencia de [`perfiles-usuario.json`](./perfiles-usuario.json), que es un artefacto de
> diseño elaborado por el equipo y está rotulado `"naturaleza": "SINTETICO"`, este documento
> registra lo que una persona del establecimiento efectivamente respondió. Las preguntas que
> no se llegaron a formular quedan listadas al final como **pendientes**, sin completar por
> inferencia.

---

## 1. Herramienta en uso

Utilizan un **programa desarrollado a medida (in-house)** que administra los turnos y
**define por roles el dashboard** que cada usuario visualiza. No es papel, planilla ni un
producto SaaS de terceros.

Lo que hace cada rol dentro de ese sistema:

- **Usuario de gimnasio:** selecciona día, horario y **la actividad a realizar**, y reserva
  su turno.
- **Usuario que además es paciente:** pide turnos de consultorio **en la misma plataforma**,
  seleccionando profesional por especialidad sobre los turnos disponibles clasificados por
  día y hora.
- **Profesional:** recibe la reserva, ve su agenda del día, marca **asistió / ausente**, e
  **informa si se ausentará por un período de tiempo**. No tiene otras acciones sobre el
  turno.

---

## 2. Circuito de reserva de turno de consultorio

Flujo observado en la web y en la app, en este orden:

1. El usuario entra y pulsa el botón **Clínica Médica**.
2. Se despliega un selector de **localidad y ciudad** (donde vive o donde está actualmente).
3. Con esa información se despliega un segundo selector de **especialidad médica**.
4. Se muestra el **listado de profesionales** filtrado por ubicación geográfica y
   especialidad.
5. Elegido el profesional, aparece un **calendario que solo habilita las fechas con turnos
   disponibles**.
6. El usuario selecciona día y hora; recién ahí **se activa el botón "Reservar turno"**.

El acceso a gimnasio y el acceso a clínica médica son **entradas distintas del sistema**:
el turno de consultorio arranca por el botón *Clínica Médica*, con un circuito propio que
el turno de gimnasio no recorre.

---

## 3. Cuotas, cobranza y morosidad

**Forma de cobro.** Los pagos se realizan de **forma automática por CBU o tarjeta de
crédito**. No hay un operador que registre el cobro en el circuito normal.

**Generación de la deuda.** Si no hay saldo al momento del débito, **se genera una deuda que
se va acumulando**. Los períodos impagos no se dan por perdidos: se suman.

**Tolerancia.** El usuario **puede seguir asistiendo con normalidad**, mientras se le
notifica que tiene deuda pendiente.

**Umbral de bloqueo.** Al alcanzar **6 meses de deuda acumulada** se suspende al usuario de
**toda actividad del gimnasio**, y dentro del sistema el sector de gimnasio queda bloqueado
con un aviso de que no puede utilizar las instalaciones hasta regularizar.

**Alcance del bloqueo.** La suspensión **no alcanza a la cobertura médica**. Se bloquea el
gimnasio; la prestación de salud continúa.

**Intimación y salida.** Se intima por **notificación o carta documento** a regularizar,
ofreciendo facilidades: **financiación en cuotas sin interés** o **10 % de descuento sobre
el pago total** de la deuda.

**Relación con la afiliación.** La cuota del centro deportivo es **aparte de la afiliación**:
el descuento de la obra social es por ley, mientras que el centro deportivo es una
**adhesión voluntaria** — el usuario puede elegir a qué gimnasio ir.

---

## 4. Cancelaciones y liberación del lugar

_Ampliación de la consulta, 28/09/2026._

Una cancelación **libera el lugar** para que otra persona lo tome. Vale tanto para el
gimnasio como para los turnos de clínica: si alguien cancela un turno, ese lugar vuelve a
estar disponible.

La excepción es **cuando el turno ya comenzó**. Si el turno es a las 14:00 y la cancelación
llega a las 14:01, el lugar **queda bloqueado**, y esto aplica a los dos tipos de turno por
igual.

Es decir: el criterio de liberación no es cuánta anticipación tuvo el aviso, sino **si el
aviso llegó antes de que empezara la franja**.

---

## 5. Qué automatizarían

Lo señalado por el establecimiento, en sus términos:

- Un **historial de visitas médicas** con las órdenes de medicamentos guardadas digitalmente
  en cada turno asistido.
- Que los **médicos puedan ver si el paciente tiene una rutina de gimnasio indexada**, para
  llevar también ese control.

Ambos apuntan a lo mismo: **cruzar datos entre el servicio deportivo y el de salud**, que hoy
conviven en la plataforma pero no se comunican entre sí.

---

## 6. Contraste con el diseño de Vitalys

### 6.1. Lo que el relevamiento confirma

| Hallazgo de campo | Qué valida |
|---|---|
| El usuario de gimnasio que además es paciente opera en **una sola plataforma y una sola cuenta** | Identidad única socio-paciente (RN-10) y el perfil SP-04 |
| La deuda **se acumula**; los períodos impagos no se dan por perdidos | RN-01 en su forma de cálculo |
| La suspensión por deuda **alcanza al gimnasio pero no a la prestación de salud** | Decisión de dominio 1 — independencia entre morosidad de gimnasio y turnos de consultorio |
| El profesional **solo marca asistió/ausente** y ve su agenda del día | RF-22 y el alcance acotado del rol PROFESIONAL |
| Al usuario **se le notifica la deuda antes** de bloquearlo | El hueco detectado en el perfil SP-02 (no había notificación previa al bloqueo) es real |
| Gimnasio y consultorio tienen **entradas distintas** en el sistema | La ruta propia para el turno de gimnasio que define el documento de módulos |
| El calendario **solo habilita fechas con disponibilidad real** | El diseño de consulta de disponibilidad previa a la reserva |
| Lo que pedirían automatizar es **cruzar datos entre gimnasio y salud** | La propuesta de valor de Vitalys frente a soluciones de cobertura parcial |

### 6.2. Lo que el relevamiento contradice o tensiona

1. **El umbral de bloqueo por morosidad.** Vitalys bloquea la reserva de gimnasio ante la
   existencia de deuda. Jerárquicos **tolera hasta 6 meses de deuda acumulada** antes de
   suspender, y durante todo ese lapso el socio entra con normalidad mientras recibe
   notificaciones. El cálculo acumulativo de RN-01 queda confirmado; **el disparo inmediato
   del bloqueo, no**.

2. **La cobranza no tiene operador.** El modelo de pagos de Vitalys asume un ADMIN que
   registra el cobro, con operador obligatorio. En Jerárquicos el circuito normal es
   **débito automático por CBU o tarjeta**, sin intervención humana; el operador aparecería
   solo en la regularización de una deuda.

3. **El turno de gimnasio incluye la actividad.** El usuario selecciona día, horario **y
   actividad**. El turno de gimnasio de Vitalys modela una franja con cupo, sin dimensión de
   actividad.

4. **La cancelación libera el lugar; lo que bloquea es que el turno ya haya empezado.**
   RN-02 decía que un turno `CANCELADO_TARDE` mantiene el lugar bloqueado en los dos tipos
   de turno. En Jerárquicos una cancelación **libera** el lugar —en gimnasio y en clínica—
   y lo único que lo bloquea es cancelar una vez iniciada la franja. El discriminante no es
   la anticipación del aviso sino el inicio del turno, y resulta ser el mismo principio que
   Vitalys ya aplicaba a `AUSENTE` (RN-08).

5. **La gestión de la ausencia del profesional existe como función.** El profesional
   **informa que se ausentará por un período**. Es el mismo problema del hallazgo 5 del
   RFC-001 (qué ocurre con los turnos ya reservados cuando un profesional reduce su
   disponibilidad), y confirma que un sistema en producción necesita resolverlo. **Qué hace
   ese sistema con los turnos ya reservados en el período informado quedó sin relevar.**

### 6.3. Fuera del alcance del MVP, documentado para no perderlo

- Facilidades de pago sobre la deuda (financiación en cuotas, descuento por pago total).
- Intimación formal por carta documento.
- Historia clínica digital y órdenes de medicamentos.
- Elección de establecimiento entre varias sedes.

---

## 7. Preguntas pendientes

No se llegaron a formular o no fueron respondidas. Se registran sin completar por inferencia:

- **Cupo por franja horaria.** ¿Hay un límite de personas por horario? ¿Cómo se controla?
  ¿Qué pasa cuando se llena? — _Es la pregunta abierta más relevante: sostiene la Decisión de
  dominio 11._
- **Plazo de aviso y sanción.** Quedó claro **cuándo se libera el lugar** (sección 4), pero no
  si existe un plazo mínimo de aviso ni qué consecuencia tiene para el socio cancelar sobre
  la hora o no presentarse. Vitalys conserva los umbrales de 24 h y 2 h como registro
  (`CANCELADO_EN_TIEMPO` / `CANCELADO_TARDE`) sin respaldo de campo todavía.
- **Turnos ya reservados** dentro del período de ausencia informado por un profesional.
- **Horarios de apertura** del centro deportivo, y si el sábado tiene una grilla distinta.
- **Reserva en nombre de terceros:** ¿puede el personal reservar por un socio?
- **Cantidad de personas activas** y de personal de atención.
