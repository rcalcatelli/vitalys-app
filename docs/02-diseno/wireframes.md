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
- ADMIN → /admin/dashboard  
- PROFESIONAL → /profesional/agenda  
- SOCIO_PACIENTE → /socio/turnos  

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
**Acciones:** Crear cuenta → POST /api/auth/registro con `{email, contraseña}` (sin `rol`) → 201 con JWT → redirige a `/socio/turnos` (el rol asignado es siempre `SOCIO_PACIENTE`, RF-01).  
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
│  Fecha        [lun 28/10/2026  ▼]     ← → (navegación)        │
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
│  ┌─ Morosidad (condicional — solo gym) ────────────────────┐   │
│  │ ⚠ Tenés una cuota vencida hace 24 días.                 │   │
│  │   No podés reservar turnos de gimnasio.                  │   │
│  │   [Ver estado de cuenta]                                 │   │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Confirmación (modal al hacer clic en RESERVAR) ────────┐   │
│  │  Confirmás la reserva?                                   │   │
│  │  Valentina Méndez · Nutrición                           │   │
│  │  Lunes 28/10/2026 · 09:00 – 09:30                       │   │
│  │  [Cancelar]                    [Confirmar reserva]       │   │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Flujo:** seleccionar tipo → (si consultorio) elegir profesional → elegir fecha → elegir slot → confirmar.  
**Reglas:** slots ocupados no son clicables. Si tipo=GYM y morosidad>10 días, los slots se reemplazan por el aviso. Confirmación muestra resumen antes de POSTear.

---

## W-03 — Agenda del profesional

```
┌─────────────────────────────────────────────────────────────────┐
│  VITALYS          MI AGENDA                [Rodrigo Almirón] ▼ │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ← Semana del 27/10 al 31/10/2026 →                            │
│                                                                  │
│  ┌────────┬────────────────────────────────────────────────┐   │
│  │ Hora   │ MAR 28/10      JUE 30/10                       │   │
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

---

## W-04 — Estado de cuenta (SOCIO_PACIENTE)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Inicio       MI ESTADO DE CUENTA          [Juan García] ▼  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Alerta de morosidad ───────────────────────────────────┐   │
│  │ ⚠ Tenés cuotas vencidas hace más de 10 días.            │   │
│  │   No podés reservar turnos de gimnasio hasta regularizar.│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CUOTAS DE GIMNASIO                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Período       Monto       Estado                        │   │
│  │  Jul 2026      $15.000     ✅ Pagada (10/07/2026)        │   │
│  │  Ago 2026      —           ❌ Vencida (mora 26 días)     │   │
│  │  Sep 2026      —           🕓 Pendiente (vence 01/10)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  SESIONES DE CONSULTORIO                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Fecha          Profesional    Monto     Estado          │   │
│  │  23/09/2026     R. Almirón     $8.000    ✅ Pagada       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ───────────────────────────────────────────────────────────    │
│  Pagos registrados: 2 · Total abonado: $23.000                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Lógica:** una cuota figura como vencida si `NOW() > (periodo + 1 mes)`. El bloqueo para gym se muestra si la mora es `> 10 días`. Los datos de cuota son de solo lectura para el socio; el pago lo registra el ADMIN.

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
│  ┌─ Morosidad (condicional) ────────────────────────────────┐   │
│  │ ⚠ Tenés una cuota vencida hace 24 días.                  │   │
│  │   No podés reservar turnos de gimnasio.                   │   │
│  │   [Ver estado de cuenta]                                  │   │
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
**Reglas:** solo se listan franjas dentro de la grilla del gimnasio (L-V 07:00–21:00, sáb 09:00–12:00; domingo no muestra franjas). Una franja con `ocupados = cupo_por_franja` (tabla `configuracion_gym`) aparece como "cupo completo" y no es clicable. Si la persona ya tiene un turno de gym ese día, no se ofrecen más franjas (un turno de gym por persona y por día). Si hay morosidad `> 10 días` sin excepción vigente (ver UC21), las franjas se reemplazan por el aviso, igual que en W-02. Confirmar envía `POST /api/turnos {persona_id, tipo_turno: GYM, inicio}`.

---

## Notas generales de UX

- **Responsive:** el layout se adapta a tablet (≥768 px) y desktop. Las tablas colapsan a tarjetas en móvil.
- **Feedback de acciones:** toda operación muestra un toast de éxito o error en la esquina superior derecha.
- **Navegación por rol:** el menú lateral cambia según el rol del usuario autenticado. No se muestran secciones sin permiso.
- **Confirmaciones destructivas:** la baja lógica, la cancelación de turno y el registro de excepción de morosidad requieren modal de confirmación para evitar errores involuntarios.
