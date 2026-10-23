# Wireframes — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

Pantallas descritas con wireframes en texto estructurado (ASCII). Representan la estructura y jerarquía de la información, no el diseño visual final.

---

## W-01 — Login

```
┌─────────────────────────────────────────────────────┐
│                   VITALYS APP                       │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │  Email                                      │  │
│   │  [________________________________]         │  │
│   │                                             │  │
│   │  Contraseña                                 │  │
│   │  [________________________________]  [👁]   │  │
│   │                                             │  │
│   │            [ INGRESAR ]                     │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ¿No tenés cuenta? → Registrarse                  │
│                                                     │
│   ┌─ Error (condicional) ────────────────────────┐ │
│   │ ⚠ Email o contraseña incorrectos            │ │
│   └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Campos:** email (requerido, formato email), contraseña (requerido, texto oculto).  
**Acciones:** Ingresar → POST /api/auth/login → guarda JWT → redirige por rol:  
- ADMIN → /admin/hoy (`/admin/dashboard` queda como alias)  
- PROFESIONAL → /profesional/agenda  
- SOCIO_PACIENTE → /socio/inicio (W-10)  

El enlace "Registrarse" navega a **W-06 — Registro público**.

**Validaciones:** errores en el campo correspondiente. Un único mensaje de error genérico por seguridad.

---

## W-06 — Registro público

```
┌─────────────────────────────────────────────────────┐
│                   VITALYS APP                       │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │  Email                                      │  │
│   │  [________________________________]         │  │
│   │                                             │  │
│   │  Contraseña                                 │  │
│   │  [________________________________]  [👁]   │  │
│   │                                             │  │
│   │  Confirmar contraseña                       │  │
│   │  [________________________________]  [👁]   │  │
│   │                                             │  │
│   │            [ CREAR CUENTA ]                 │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ¿Ya tenés cuenta? → Ingresar (W-01)               │
│                                                     │
│   Tu ficha la completa el centro.                  │
│                                                     │
│   ┌─ Error (condicional) ────────────────────────┐ │
│   │ ⚠ El email ya está registrado                │ │
│   └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Campos:** email (requerido, formato email), contraseña (requerido, ≥8 caracteres, texto oculto), confirmar contraseña (debe coincidir). **No hay selector de rol**: el rol no es un input de esta pantalla.  
**Acciones:** Crear cuenta → POST /api/auth/registro con `{email, contraseña}` (sin `rol`) → 201 con JWT → redirige a `/socio/inicio` (el rol asignado es siempre `SOCIO_PACIENTE`, RF-01).  
**Validaciones:** email duplicado → 409 (mensaje de error mostrado en el bloque condicional). Contraseñas que no coinciden se validan en el cliente antes de enviar.  
**Nota:** el footer "Tu ficha la completa el centro" comunica que la persona (nombre, apellido, DNI) se completa después, cuando el ADMIN la vincula (W-07) o la da de alta presencial (W-05).

---

## W-02 — Reserva de turno (SOCIO_PACIENTE)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Mis turnos     RESERVAR TURNO              [María Pérez] ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tipo de turno                                                  │
│  ◉ Consultorio   ○ Gimnasio                                     │
│                                                                  │
│  Profesional  [Valentina Méndez — Nutrición       ▼]           │
│                                                                  │
│  Fecha        [mié 28/10/2026  ▼]     ← → (navegación)        │
│                                                                  │
│  Slots disponibles                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  09:00 – 09:30   [RESERVAR]                              │  │
│  │  09:30 – 10:00   [RESERVAR]                              │  │
│  │  10:00 – 10:30   ── ocupado ──                           │  │
│  │  10:30 – 11:00   [RESERVAR]                              │  │
│  │  11:00 – 11:30   [RESERVAR]                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Suspensión por morosidad (condicional — solo gym) ─────┐   │
│  │ ⛔ Acumulás 6 períodos impagos (límite: 6).              │   │
│  │   No podés reservar turnos de gimnasio.                  │   │
│  │   [Ver estado de cuenta]                                 │   │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Confirmación (modal al hacer clic en RESERVAR) ────────┐   │
│  │  Confirmás la reserva?                                   │   │
│  │  Valentina Méndez · Nutrición                           │   │
│  │  Miércoles 28/10/2026 · 09:00 – 09:30                   │   │
│  │  [Cancelar]                    [Confirmar reserva]       │   │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Flujo:** seleccionar tipo → (si consultorio) elegir profesional → elegir fecha → elegir slot → confirmar.  
**Reglas:** slots ocupados no son clicables. Si el turno es de gimnasio y el socio está **suspendido** (períodos impagos ≥ `configuracion_gym.meses_tolerancia_morosidad`, sin excepción vigente), los slots se reemplazan por el aviso; con deuda por debajo del umbral los slots se muestran normalmente (RN-01). Confirmación muestra resumen antes de POSTear.

> **Implementación (`ui-pixel-perfect`).** El flujo de consultorio pasó a **dos pasos con stepper** ("1 Profesional — 2 Horario"): primero tarjetas de profesional ("Lic. X", especialidad, duración y "Próxima agenda: hoy, mar 29 sep · 2 libres", de `GET /api/turnos/consultorio/proxima-agenda`, o "Sin agenda próxima"), después la grilla de slots (libre / ocupado / ya pasó), la nota de cancelación de 24 h y la barra "Confirmar turno", con aviso al terminar. Un socio con deuda o suspendido ve que sus consultas siguen habilitadas (RN-01). CA-02-6 y CA-02-7.

> **Implementación (Sprint 4).** El selector de tipo no es un control de esta pantalla: la reserva quedó en dos rutas, `/socio/reservar-consultorio` (este wireframe: especialidad → profesional → día → slot → modal de confirmación) y `/socio/reservar-gimnasio` (W-08). Si otra persona toma el slot antes (409), se avisa y se recarga la grilla.

---

## W-03 — Agenda del profesional

```
┌─────────────────────────────────────────────────────────────────┐
│  VITALYS          MI AGENDA                [Rodrigo Almirón] ▼ │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ← Semana del 26/10 al 30/10/2026 →                            │
│                                                                  │
│  ┌────────┬────────────────────────────────────────────────┐   │
│  │ Hora   │ MAR 27/10      JUE 29/10                       │   │
│  ├────────┼────────────────────────────────────────────────┤   │
│  │ 14:00  │ Carlos Soto    [libre]                         │   │
│  │        │ [COMPLETAR ▼]                                  │   │
│  ├────────┼────────────────────────────────────────────────┤   │
│  │ 14:50  │ Ana Fernández  María Pérez                     │   │
│  │        │ [COMPLETAR ▼]  [COMPLETAR ▼]                  │   │
│  ├────────┼────────────────────────────────────────────────┤   │
│  │ 15:40  │ [libre]        [libre]                         │   │
│  ├────────┼────────────────────────────────────────────────┤   │
│  │ 16:30  │ Lucía Rojas    [libre]                         │   │
│  │        │ [COMPLETAR ▼]                                  │   │
│  └────────┴────────────────────────────────────────────────┘   │
│                                                                  │
│  Dropdown [COMPLETAR ▼]:                                        │
│  ┌─────────────────────────┐                                    │
│  │  ✔ Marcar COMPLETADO    │                                    │
│  │  ✗ Marcar AUSENTE       │                                    │
│  └─────────────────────────┘                                    │
│                                                                  │
│  [Ver detalle del turno →]  (nombre, DNI, email del paciente)  │
└─────────────────────────────────────────────────────────────────┘
```

**Acciones:** el profesional puede marcar COMPLETADO o AUSENTE sobre turnos en estado RESERVADO del día actual o anteriores. No puede cancelar ni editar datos de la persona.

> **Implementación (Sprint 4).** La agenda se resolvió como una lista agrupada por día (de hoy a siete días, `GET /api/turnos/mi-agenda`) y no como grilla semanal por franja horaria. Cada turno muestra nombre y DNI del paciente —el DNI llega en `pacienteDni`, solo para el PROFESIONAL—; el email no se expone. COMPLETADO se habilita desde 15 minutos antes del inicio y AUSENTE desde el inicio, y un turno completado se muestra con el chip "Atendido" sin opción de deshacer.

> **Implementación (`ui-pixel-perfect`).** La agenda de hoy suma un resumen (pacientes, huecos libres, atendidos y minutos por consulta), **huecos libres** derivados de la disponibilidad menos los turnos (borde punteado, "Hueco libre (pasado)" si ya pasó) y el **turno en curso** resaltado con el chip "En curso". Atendido / Ausente son botones tonales (verde / rojo). La ventana de habilitación sigue siendo la del backend y no la del prototipo (desvío 8 más abajo).

---

## W-04 — Estado de cuenta (SOCIO_PACIENTE)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Inicio       MI ESTADO DE CUENTA          [Juan García] ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Suspensión por morosidad ──────────────────────────────┐   │
│  │ ⛔ Acumulás 6 períodos impagos (límite: 6).              │   │
│  │    No podés reservar turnos de gimnasio hasta            │   │
│  │    regularizar. Tus turnos de consultorio no se ven      │   │
│  │    afectados.                                            │   │
│  │    ℹ Tenés una excepción autorizada hasta el 31/10/2026. │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CUOTAS DE GIMNASIO            (socio desde 01/2026)            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Período       Monto       Estado                        │   │
│  │  Ene–Jun 2026  —           ❌ 6 períodos impagos         │   │
│  │  Jul 2026      $15.000     ✅ Pagada                     │   │
│  │  Ago 2026      $15.000     ✅ Pagada                     │   │
│  │  Sep 2026      —           🕓 Pendiente (vence 11/10)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  SESIONES DE CONSULTORIO                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Sin sesiones de consultorio registradas.                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ───────────────────────────────────────────────────────────    │
│  Pagos registrados: 2 · Total abonado: $30.000                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Lógica:** un período figura como impago si `NOW() > (periodo + 1 mes + 10 días)` y no tiene cuota registrada; un mes salteado sigue contando aunque se hayan pagado los posteriores (RN-01). La pantalla distingue **dos estados**: con deuda por debajo de `configuracion_gym.meses_tolerancia_morosidad` muestra un aviso informativo y el socio reserva con normalidad; al alcanzar el umbral muestra la suspensión, como en el ejemplo. La suspensión **nunca alcanza a los turnos de consultorio** (Decisión de dominio 1). Si existe una excepción vigente (RN-09) se indica junto a la alerta. Los datos de cuota son de solo lectura para el socio; el pago lo registra el ADMIN.

> **Implementación (`ui-pixel-perfect`).** La pantalla muestra cuatro tiles (Total pagado, Cuotas, Sesiones, Períodos impagos), un **medidor** de `umbral` segmentos (nunca un 6 fijo), los períodos del más nuevo al más viejo con montos sin decimales (`$ 35.000`) y el vencimiento redactado con RN-01 ("Vence el 01/10/2026 · tolerancia hasta el 11/10/2026"). Las sesiones de consultorio informan **profesional y especialidad** (PI-135). Con excepción vigente, el socio lee que Recepción la autorizó hasta esa fecha; el ADMIN, "Autorizada por X el DD/MM · motivo". CA-06-5 y CA-06-6.

> **Implementación (Sprint 5).** La pantalla del socio es `/socio/estado-cuenta` (ítem "Estado de cuenta" del menú) y consume `GET /api/pagos/mi-estado-cuenta`. Cada período se muestra como `PAGADO` (con monto, **medio de pago** y fecha), `IMPAGO` o `PENDIENTE` (con la fecha límite); la tabla de sesiones de consultorio también muestra el medio. El aviso de suspensión y la excepción vigente (`{validaHasta, motivo}`) salen del mismo cálculo que usa la reserva de gimnasio (`MorosidadService`). Si el usuario no tiene ficha, la pantalla lo explica (422) sin ofrecer reintentar; ante un error de red ofrece reintentar. La gracia es de 10 días: hasta `periodo + 1 mes + 10 días` inclusive figura `PENDIENTE`.

### W-04b — Pagos (ADMIN)

Ruta `/admin/pagos` (ítem "Pagos" del menú del administrador).

- **Buscador de persona:** por nombre o DNI, en estado guía hasta elegir; cada resultado muestra nombre, DNI y un chip del estado de cuota. La persona elegida queda en una tarjeta con iniciales, servicios (Gimnasio / especialidades), "Cambiar persona" y "Registrar pago".
- **Autorizar excepción (RN-09, CA-08-8):** si la persona está **suspendida**, la tarjeta ofrece un modal con motivo (obligatorio), vencimiento y modalidad (un solo uso / por período). No se ofrece a quien tiene deuda sin llegar al umbral.
- **Estado de cuenta de la persona elegida:** la misma vista del socio (`GET /api/pagos/persona/{id}/estado-cuenta`), redactada en tercera persona y sin el bloque "Cómo funciona la mora".
- **Registrar pago (modal):** se elige el concepto. *Cuota mensual*: sugiere el primer período impago, bloquea los ya pagados y ofrece adelantos; no se ofrece si la persona no es socia del gimnasio. *Sesión de consultorio*: lista los turnos de la persona, excluyendo los cancelados y los de gimnasio, y marca los que ya tienen pago. En ambos casos se carga el **monto** (mayor a cero) y el **medio** (efectivo, transferencia, débito o crédito), ambos obligatorios.
- **Resultado:** al guardar se cierra el modal, se avisa con un toast y se refresca el estado de cuenta. Un 409 (cuota o sesión ya pagada) o cualquier error del servidor se muestra dentro del modal sin cerrarlo, y el botón se bloquea mientras el envío está en curso para evitar el doble pago.

> Los valores del ejemplo corresponden a Juan García en los datos de prueba (`db/dml/seed.sql`), mostrados como si el seed se hubiera cargado a fines de septiembre de 2026. El seed calcula sus fechas contra el día de la carga, así que en la base real los meses cambian pero el caso es siempre el mismo: membresía iniciada ocho meses antes, solo los dos últimos meses pagos, seis períodos impagos y una excepción vigente por 30 días. No tiene sesiones de consultorio: la única del seed es de Carlos Soto.

---

## W-05 — ABM de personas (ADMIN)

```
┌─────────────────────────────────────────────────────────────────┐
│  VITALYS           PERSONAS                     [Admin] ▼      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [+ Nueva persona]   Buscar: [________________] [🔍]           │
│  Filtros: ○ Todos  ○ Activos  ○ Inactivos  ○ Solo gym          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Nombre ↕     DNI ↕       Gym   Estado   Acciones         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ García, Juan  38100002  ✅  ACTIVO  [Ver] [Editar] [Baja]│  │
│  │ Pérez, María  38100001  ✅  ACTIVO  [Ver] [Editar] [Baja]│  │
│  │ Gómez, Pedro  38100006  —   INAC.   [Ver] [Reactivar]    │  │
│  │ Rojas, Lucía  38100003  ✅  ACTIVO  [Ver] [Editar] [Baja]│  │
│  │ Soto, Carlos  38100004  —   ACTIVO  [Ver] [Editar] [Baja]│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Panel lateral: Ver/Editar persona ─────────────────────┐   │
│  │  Nombre *   [Juan              ]  Apellido * [García   ] │   │
│  │  DNI *      [38100002          ]                         │   │
│  │  Teléfono   [11-2002-0002      ]                         │   │
│  │  Nacimiento [22/07/1990        ]                         │   │
│  │  Socio gym  [✅ Sí             ]                         │   │
│  │  Estado     [ACTIVO            ]                         │   │
│  │                                                          │   │
│  │  [Ver turnos]  [Ver pagos]  [Registrar excepción mora]   │   │
│  │                                                          │   │
│  │  [Cancelar]                         [Guardar cambios]   │   │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Confirmación baja lógica (modal) ──────────────────────┐   │
│  │  ¿Dar de baja a Juan García?                            │   │
│  │  El historial de turnos y pagos se conserva.            │   │
│  │  [Cancelar]              [Confirmar baja]               │   │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

> **Implementación (`ui-pixel-perfect`).** La tabla de Personas muestra **Servicios** (chips Gimnasio y especialidades en que tuvo turnos de consultorio), **Cuota** ("Al día", "1 de 6 impagos", "Suspendido", "Excepción hasta DD/MM", "Sin cuota de gym", "Dado de baja") y la acción **"Operar como"** (W-12), que solo se ofrece a quien tiene un usuario socio activo. Los filtros son Todos / Gimnasio / Consultorio / Con deuda; el último lo resuelve el servidor (RF-43). Conserva Editar, Baja / Reactivar y "Vincular usuario existente" (en un menú ⋯).

**Acciones disponibles para ADMIN:** crear, ver detalle, editar, dar de baja lógica (confirma con modal), reactivar. La baja no elimina datos. Desde el panel lateral se puede navegar al historial de turnos y pagos de la persona, y registrar una excepción de morosidad.

**Paso previo al alta:** al hacer clic en "+ Nueva persona" se abre primero el modal "¿Ya tiene cuenta? Buscar por email" (**W-07**). Solo si el email no tiene un `usuario` asociado (404 en W-07), el ADMIN continúa al formulario de alta presencial mostrado arriba (`POST /api/personas`, RF-05).

---

## W-07 — Modal "Vincular por email" (dentro de W-05)

```
┌───────────────────────────────────────────────────┐
│  ¿Ya tiene cuenta?                            [X] │
│                                                     │
│  Email  [________________________________]        │
│                              [ Buscar ]            │
│                                                     │
│  ┌─ Caso: encontrado y libre ─────────────────┐   │
│  │  ✅ Usuario encontrado: juan@mail.com       │   │
│  │  Nombre *   [____________] Apellido * [___] │   │
│  │  DNI *      [____________]                  │   │
│  │  (sin campo de contraseña — ya tiene una)   │   │
│  │  [Cancelar]           [Vincular ficha]      │   │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Caso: no encontrado (404) ────────────────┐    │
│  │  ⚠ No existe un usuario registrado con     │    │
│  │    ese email.                               │    │
│  │  [Crear con credenciales nuevas →]         │    │
│  │  (continúa al formulario de alta            │    │
│  │   presencial de W-05, POST /api/personas)   │    │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Caso: ya vinculado (409) ─────────────────┐    │
│  │  ⚠ Este usuario ya está vinculado a una    │    │
│  │    persona existente.                       │    │
│  │  [Cerrar]                                   │    │
│  └──────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

**Flujo:** el ADMIN busca por email → GET/lookup interno antes de decidir la acción:
- **Encontrado y libre:** formulario sin contraseña (nombre, apellido, DNI) → `POST /api/personas/vincular {email, nombre, apellido, dni}` → 201, la `persona` queda vinculada al `usuario_id` encontrado (RF-31, CA-07-5).
- **No encontrado:** mensaje 404 + botón "Crear con credenciales nuevas", que lleva al formulario de alta presencial de W-05 (RF-05).
- **Ya vinculado:** mensaje 409, no se ofrece ninguna acción de escritura — el ADMIN debe buscar otro email.

**Regla:** el vínculo es ADMIN-only (403 si el actor no es ADMIN, verificado en la capa de servicio, RNF-03).

> **Implementación (Sprint 5).** Se resolvió en un solo paso, sin búsqueda previa: el panel "Vincular usuario existente" de W-05 pide el email junto con los datos de la persona, sin contraseña, y la respuesta de `POST /api/personas/vincular` decide el caso. Con 404 aparece "Crear con credenciales nuevas", que abre el alta presencial; con 409 se muestra el aviso y no se ofrece ninguna acción. Se evita así un endpoint de consulta de emails que no figura en `modulos.md`.

---

## W-08 — Reserva de turno de gimnasio (SOCIO_PACIENTE)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Mis turnos    RESERVAR TURNO DE GIMNASIO    [María Pérez] ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Fecha        [lun 28/09/2026  ▼]     ← → (navegación)         │
│                                                                  │
│  Franjas disponibles                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Horario         Cupo ocupado      Acción                 │  │
│  │  07:00 – 08:00    12 / 20          [RESERVAR]              │  │
│  │  08:00 – 09:00    20 / 20          ── cupo completo ──     │  │
│  │  09:00 – 10:00     5 / 20          [RESERVAR]              │  │
│  │  10:00 – 11:00     0 / 20          [RESERVAR]              │  │
│  │  …                                                          │  │
│  │  20:00 – 21:00     3 / 20          [RESERVAR]              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Suspensión por morosidad (condicional) ─────────────────┐   │
│  │ ⛔ Acumulás 6 períodos impagos (límite: 6).               │   │
│  │   No podés reservar turnos de gimnasio.                   │   │
│  │   [Ver estado de cuenta]                                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Día no laborable (condicional) ─────────────────────────┐   │
│  │ 🚫 El gimnasio no abre el 25/05/2026                      │   │
│  │   (Revolución de Mayo). Elegí otra fecha.                 │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Confirmación (modal al hacer clic en RESERVAR) ─────────┐   │
│  │  Confirmás la reserva?                                    │   │
│  │  Gimnasio · Lunes 28/09/2026 · 09:00 – 10:00              │   │
│  │  [Cancelar]                     [Confirmar reserva]       │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Flujo:** elegir fecha → ver franjas de 60 minutos con el cupo ocupado/total de cada una → reservar una franja libre → confirmar.
**Reglas:** solo se listan franjas dentro de la grilla del gimnasio, entendida de apertura a cierre: L-V de 07:00 a 21:00 —última franja **20:00–21:00**— y sábados de 09:00 a 12:00 —última franja **11:00–12:00**—. Domingos y feriados no muestran ninguna franja; en un feriado se indica el motivo. Una franja con `ocupados = cupo_por_franja` (tabla `configuracion_gym`) aparece como "cupo completo" y no es clicable. Si la persona ya tiene un turno de gym ese día, no se ofrecen más franjas (un turno de gym por persona y por día). Si el socio está **suspendido** —períodos impagos acumulados ≥ `configuracion_gym.meses_tolerancia_morosidad`— y no tiene excepción vigente (ver UC21), las franjas se reemplazan por el aviso, igual que en W-02. Tener deuda **por debajo** del umbral no oculta las franjas: el socio reserva normalmente y el aviso de deuda llega por notificación (RF-37, RN-01). Cada franja muestra su cupo ("x/20") y la anticipación: **se cierra 1 hora antes y se abre 7 días antes** (RN-18, que ahora también valida el backend con 422, PI-139). Confirmar envía `POST /api/turnos/gym {persona_id, inicio}` — la ruta propia del gimnasio, distinta de `POST /api/turnos`, que es la de consultorio y exige `profesional_id`. **Orden de la pantalla:** antes de pedir el cupo se consulta `GET /api/turnos/gym/estado`; si la persona no es socia de gimnasio o está suspendida sin excepción vigente, se muestra el aviso y no se ofrecen días ni franjas (el bloqueo va antes que las franjas).

---

## W-09 — Shell de la aplicación (todos los roles)

```
Escritorio (≥ 760 px)                                Móvil (< 760 px)
┌────────────┬──────────────────────────────┐        ┌──────────────────────────┐
│ ▣ Vitalys  │  [Banner "Operar como" si    │        │ ▣ Vitalys   ◐ Oscuro  (LB)│
│ Recepción  │   aplica — ancho completo]   │        ├──────────────────────────┤
│            ├──────────────────────────────┤        │  Recepción operando…     │
│ ● Hoy      │  RECEPCIÓN                   │        │  (banner, si aplica)     │
│ ● Ingreso  │  Hoy en el centro   [Mar 29  │        ├──────────────────────────┤
│ ● Personas │                      sep·10:40]       │  <contenido, px-4>       │
│ ● Profes.  │                              │        │                          │
│ ● Pagos    │  <contenido, máx. 1160 px>   │        ├──────────────────────────┤
│            │                              │        │ Hoy Ingr. Pers. Prof. Pag│
│ ◐ Oscuro   │                              │        └──────────────────────────┘
│ (LB) Laura │                              │         (barra fija; el ítem activo
│  Benítez   │                              │          lleva una marca superior de 4 px
│  Cerrar    │                              │          y los ítems pueden tener badge)
└────────────┴──────────────────────────────┘
```

**Menú por rol:**

| Rol | Ítems |
|-----|-------|
| SOCIO_PACIENTE | Inicio · Reservar gimnasio · Turno de consultorio · Mis turnos · Estado de cuenta |
| PROFESIONAL | Agenda de hoy · Disponibilidad |
| ADMIN | Hoy en el centro (badge con las notificaciones fallidas) · Ingreso al gimnasio · Personas · Profesionales · Pagos |

No existe un ítem "Pagos y cuotas" aparte: hay una sola pantalla de Pagos.

**Tarjeta de usuario:** "Nombre Apellido" (de `GET /api/auth/me`, RF-40) y el rol ("Recepción", "Socio/a", "Profesional"); si no hay nombre, el email. En móvil, el avatar del encabezado cierra la sesión.
**Estructura:** un único `ShellLayout` anidado bajo `RoleGuard` monta el shell una sola vez; las páginas renderizan su `PageHeader` (sobretítulo, título, subtítulo, acciones) dentro del `Outlet`. El encabezado muestra, solo en escritorio, la fecha y hora de Buenos Aires.

---

## W-10 — Inicio del socio (SOCIO_PACIENTE)

Ruta `/socio/inicio`, home del rol (RF-42, CA-11-1 a CA-11-3).

```
┌─────────────────────────────────────────────────────────────────┐
│  martes 29 de septiembre                                         │
│  Hola, María                                                     │
│                                                                  │
│  ┌─ Tu próximo turno ────────────────────┐ ┌─ Cuota del gimnasio┐ │
│  │ mañana · Gimnasio                      │ │ [● Al día]        │ │
│  │ 08:00 – 09:00                          │ │ <una línea de     │ │
│  │ [Ver mis turnos]  [Cancelar turno]     │ │  resumen>         │ │
│  └────────────────────────────────────────┘ │ Ver estado de     │ │
│                                             │ cuenta →          │ │
│                                             └───────────────────┘ │
│                                                                  │
│  ┌─ Reservar gimnasio ───────┐  ┌─ Pedir consulta ─────────────┐ │
│  │ (50% y sin acción si no    │  │ Siempre activo (RN-01)       │ │
│  │  tiene gimnasio o está     │  └──────────────────────────────┘ │
│  │  suspendido + el motivo)   │                                   │
│  └────────────────────────────┘                                   │
│                                                                  │
│  Tu semana   L  M  M  J  V  S  D     (turnos de lunes a domingo) │
└─────────────────────────────────────────────────────────────────┘
```

**Sin turno próximo:** "No tenés turnos próximos" con borde punteado. **Marca de Recepción:** si el turno lo reservó Recepción, el chip dice "Reservado por Recepción" (RN-27). **Carga y error:** estado de carga y error con "Reintentar" por consulta, sin romper el resto. Solo usa endpoints existentes (`mis-turnos`, `mi-estado-cuenta`, `gym/estado`).

---

## W-11 — Ingreso al gimnasio (ADMIN)

Ruta `/admin/ingreso` (CA-09-6, RN-28).

```
┌─────────────────────────────────────────────────────────────────┐
│  RECEPCIÓN · Ingreso al gimnasio                                 │
│                                                                  │
│  ┌─ Franja en curso  10:00 – 11:00 ───────────────────────────┐ │
│  │  9 de 14 ingresaron      ███████████░░░░░░                  │ │
│  │  A las 11:00, al cerrar la franja, quienes no hayan         │ │
│  │  ingresado pasan a Ausente.                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Buscar: [nombre o DNI_______________]                           │
│                                                                  │
│  PENDIENTES                                                      │
│   García, Juan    DNI 38100002                 [Marcar ingreso]  │
│   Soto, Carlos    DNI 38100004                 [Marcar ingreso]  │
│  INGRESARON                                                      │
│   Pérez, María    DNI 38100001                 Ingreso 10:04     │
│   Rojas, Lucía    DNI 38100003                 Ingresó (sin hora)│
└─────────────────────────────────────────────────────────────────┘
```

**Reglas:** "Marcar ingreso" se habilita desde 15 minutos antes del inicio de la franja y llama a `PATCH /api/turnos/{id}/completado`; el backend guarda `completado_en` (RN-28) y la lista muestra "Ingreso HH:MM". Los ingresos anteriores a V16 no tienen hora y muestran solo "Ingresó" (PI-125). **No hay "Deshacer".** El buscador filtra por nombre o DNI (el DNI llega en el listado del ADMIN). Sin franja en curso, domingo o feriado: estado vacío con texto, sin error.

---

## W-12 — Operar como (ADMIN → socio)

```
Personas (ADMIN)                                      Mientras se opera
┌───────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│ García, Juan  Gym · Nutrición  1 de 6     │   │ ⚠ Recepción operando en nombre de Juan     │
│               impagos        [Operar como]│   │   García. Todo lo que hagas queda registrado│
└───────────────────────────────────────────┘   │                      [Volver a Recepción]  │
        │ POST /api/admin/operar-como           ├────────────────────────────────────────────┤
        ▼ (credencial de 30 min, sessionStorage)│  <pantallas del SOCIO: Inicio, Reservar,   │
   navega a /socio/inicio                       │   Mis turnos, Estado de cuenta>            │
                                                └────────────────────────────────────────────┘
```

**Comportamiento (RF-39, RN-26, RN-27, CA-10-1 a CA-10-8):**

- El banner es una franja de advertencia con ancho completo, **persiste al recargar** y lo ve solo el operador; el socio nunca lo ve.
- El shell, el menú y las pantallas son los del **socio**. Todo lo exclusivo de ADMIN responde 403.
- "Volver a Recepción" termina la sesión (`POST /api/operar-como/fin`), descarta la credencial, restaura la sesión del ADMIN y navega a `/admin/personas`, con un toast.
- Si la credencial vence (401) o se revoca, el cliente vuelve solo a la sesión del ADMIN y avisa "La sesión como X venció".
- Cerrar sesión durante la suplantación descarta ambas credenciales. Otras pestañas conservan la sesión normal del ADMIN.
- En Mis turnos y en Inicio del socio, lo hecho por Recepción lleva la marca "Reservado por Recepción" / "Cancelado por Recepción".

---

## Desvíos documentados respecto del diseño

La fuente visual es `docs/02-diseno/design-system/Vitalys.dc.html` (RNF-03: el backend manda sobre las reglas). La implementación sigue el prototipo píxel a píxel salvo en los puntos siguientes, cada uno con su razón.

| # | Desvío | Razón |
|---|--------|-------|
| 1 | **Registro** pide solo email, contraseña y confirmación; el prototipo pide nombre, apellido, DNI y servicios | El contrato del backend (RF-01, RN-10) crea solo el usuario; la ficha la completa el ADMIN (CA-01-6). Registrar con DNI quedó fuera de alcance |
| 2 | Los campos de contraseña tienen **botón de ojo** (mostrar / ocultar) | Accesibilidad; ya estaba en W-01 y W-06 |
| 3 | Los modales **Nueva persona / Nuevo profesional** tienen campos extra (email, contraseña inicial, teléfono, fecha de nacimiento, socio de gimnasio) y el botón dice "Dar de alta" | El alta presencial crea usuario y ficha en una operación (RF-05, RF-11); sin esos datos el backend rechaza el alta |
| 4 | Personas suma el botón **"Vincular usuario existente"** y un menú ⋯ (Editar / Baja / Reactivar) | RF-31 y RF-08/09 ya existían y el prototipo no los contempla |
| 5 | El menú **no duplica "Pagos y cuotas"** | Hay una sola pantalla de Pagos; el prototipo la listaba dos veces |
| 6 | En Hoy, el KPI dice **"Socios con impagos"** (el valor cuenta personas), con subtítulo "N con reserva suspendida", un botón "Ir a Pagos" y el tipo de la notificación fallida con su etiqueta ("Confirmación") | El prototipo lo llamaba de otra forma y mezclaba períodos con personas; la redacción sigue RN-01 |
| 7 | La cuota dice **"vence el 01/10 (tolerancia hasta el 11/10)"** en vez de "vence el 10/10" | Son las fechas reales de RN-01 (período vencido el día 1 más 10 días de gracia), no las del ejemplo del prototipo |
| 8 | **Atendido se habilita 15 minutos antes del inicio** (con texto de ayuda) y Ausente desde el inicio; el prototipo dice "desde el inicio" para ambos | El backend ya fijaba esa ventana (`MINUTOS_CHECKIN_ANTICIPADO`) y el check-in anticipado del gimnasio depende de ella. Gana el backend (RNF-03); se documenta en RN-08 |
| 9 | El modal de cancelar conserva el **motivo obligatorio** y el botón "Confirmar cancelación" | El backend exige `motivo_cancelacion` (CA-03-3) |
| 10 | Se **quita el selector de día** de Consultorio | El prototipo lo elimina y muestra la próxima agenda por profesional (RF-41) |
| 11 | **RN-18 ahora también la valida el backend** (422 con menos de 1 h o más de 7 días) | El prototipo ya mostraba la regla en la UI; hacerla cumplir solo en el cliente contradice RNF-03 (PI-139) |
| 12 | En móvil, los modales son **hojas inferiores** como en el prototipo, pero los formularios largos hacen scroll | Los formularios de alta no entran en pantalla sin scroll |
| 13 | Los **datos de ejemplo** del prototipo (fechas, medios de pago, subtítulo del servicio) no se reproducen | Son datos de maqueta; la app muestra los reales. Tampoco se inventaron números |

Además, la pantalla de login conserva el panel de marca y las cuentas de demostración con la descripción actualizada ("Laura Benítez · Recepción", "Socio · 6 períodos impagos · con excepción" para Juan García y "Solo paciente de Psicología" para Carlos Soto), que coinciden con el seed de desarrollo.

---

## Notas generales de UX

- **Responsive:** el punto de corte es **760 px**. Por encima, sidebar de 248 px; por debajo, encabezado de 56 px y barra de pestañas inferior (W-09). Las tablas colapsan a tarjetas en móvil y los modales se vuelven hojas inferiores (los formularios largos hacen scroll).
- **Feedback de acciones:** toda acción exitosa muestra un toast arriba (20 px en escritorio, 64 px en móvil) que se cierra solo a los 3,2 s; un único toast a la vez. Los errores de reglas de negocio se siguen mostrando junto a la acción.
- **Navegación por rol:** el menú (sidebar o pestañas) cambia según el rol del usuario autenticado. No se muestran secciones sin permiso. Una ruta de otro rol redirige al home propio.
- **Tema:** el modo oscuro se alterna desde la sidebar o el encabezado móvil, persiste en `localStorage` (`vitalys_theme`) y se aplica antes del primer pintado, sin destello.
- **Base tipográfica:** 14 px con interlineado 1,45 en `body` (no en `html`, para no encoger los espaciados en `rem` de Tailwind) y animación de entrada `vtIn` (0,3 s) en cada pantalla.
- **Confirmaciones destructivas:** la baja lógica, la cancelación de turno y el registro de excepción de morosidad requieren modal de confirmación para evitar errores involuntarios.
