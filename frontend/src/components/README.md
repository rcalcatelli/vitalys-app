# `src/components/` — Atomic Design

Jerarquía de componentes **presentacionales**. Ninguno de los niveles de acá
adentro (`atoms`, `molecules`, `organisms`, `templates`) conoce `AuthContext`
ni `react-router`: no hay `useAuth()`, no hay `useNavigate()`, no hay `<Link>`
apuntando a una ruta concreta. Reciben datos y callbacks por props y nada más.
Eso es lo que permite testearlos montándolos solos, sin `MemoryRouter` ni
`AuthProvider`, y lo que los hace reutilizables si mañana aparece una tercera
pantalla de auth.

La lógica de negocio (llamar a la API, decidir a dónde navegar, leer la
sesión) vive en `src/pages/*` — los **contenedores**. Una page arma el estado,
maneja el submit, y le pasa a un organismo `onSubmit`, `error`, `cargando`.

`RoleGuard` **no está acá**: no es UI, es lógica de ruteo (decide qué
renderizar según sesión/rol). Vive en `src/router/RoleGuard.tsx`.

## Niveles

- **`atoms/`** — la pieza más chica con sentido propio: `Button`, `Input`,
  `Label`, `FieldError`. No conocen el dominio (no saben qué es un "email" o
  una "contraseña"), solo primitivas de UI.
- **`molecules/`** — combinan 2-3 átomos para un propósito concreto pero
  todavía genérico: `FormField` (Label + Input), `PasswordInput` (Label +
  Input + botón mostrar/ocultar). Siguen sin saber qué formulario las usa.
- **`organisms/`** — una sección completa y con sentido de negocio propio:
  `LoginForm`, `RegistroForm`. Saben qué campos tiene el formulario y qué
  reglas de UX aplican (p.ej. que las contraseñas deben coincidir), pero no
  qué pasa después de un submit exitoso — eso lo decide la page.
- **`templates/`** — el esqueleto de layout compartido entre varias pages:
  `AuthLayout` (título + contenido + pie). No tiene lógica, solo estructura.

Un componente nuevo va en el nivel más bajo que alcance para expresarlo. Si
dudás entre molecule y organism, preguntate: ¿esto conoce una regla de
negocio/UX del dominio, o es puramente estructural? Lo primero es organism.

**No crees átomos/moléculas que nadie use.** Derivalos de lo que un
organismo/page necesita de verdad. Un design system con piezas sin consumidor
es peso muerto, no reutilización.

## Tailwind vs. SCSS

**Tailwind manda.** Layout, espaciado, color, tipografía, estados básicos
(`hover:`, `focus:`, `disabled:`) van como utilidades en el JSX. Los tokens
del proyecto (colores, tipografía) están centralizados en
`src/index.css` vía el bloque `@theme` de Tailwind v4 — no se repiten hex
codes sueltos en SCSS.

`Componente.scss` existe **solo si Tailwind no alcanza**: animaciones con
`@keyframes`, selectores que Tailwind no cubre (p.ej. pseudo-elementos raros,
overrides de una librería de terceros que no expone clases utilitarias). Si
un componente no lo necesita, no tiene `.scss` — no se crean archivos vacíos
para "completar" la carpeta.

**Regla de una sola fuente de verdad por propiedad**: si el padding de un
componente sale de `px-4`, ese mismo componente no puede tener además un
`padding` distinto en un `.scss`. Elegí una sola vía por propiedad.

### Estado actual: ningún componente tiene `.scss`

Con los átomos/moléculas/organismos/template de este batch (`Button`,
`Input`, `Label`, `FieldError`, `FormField`, `PasswordInput`, `LoginForm`,
`RegistroForm`, `AuthLayout`) todo se resolvió con utilidades de Tailwind:
flexbox para layout, `focus-visible:ring-*` para foco, `disabled:opacity-*`
para estados deshabilitados, colores del `@theme`. Ninguno necesitó
keyframes, selectores no cubiertos por Tailwind, ni overrides de terceros —
así que ninguno tiene `Componente.scss` todavía. `sass` está instalado y
disponible para el día que aparezca ese caso real.

## Mobile first (convención del proyecto, no negociable)

Todo el frontend se escribe mobile first. No es una preferencia estética: es
la convención del proyecto y aplica a cada componente nuevo.

- Las clases **sin prefijo son el estado móvil** y son el punto de partida.
  Escribí primero cómo se ve en un teléfono angosto.
- Los breakpoints (`sm:`, `md:`, `lg:`) **solo agregan** sobre esa base,
  nunca la corrigen. Si te encontrás escribiendo `md:` para deshacer algo del
  estado base, la base estaba pensada para escritorio y hay que darla vuelta.
- Nada de `max-w-*` fijo sin un ancho fluido debajo. Los formularios (y
  `AuthLayout`, `PlaceholderHomePage`) ocupan el ancho disponible en mobile
  (`w-full`) y recién a partir de `sm:` (o `md:`) se limitan con `max-w-*` y
  se centran con `mx-auto`.
- Áreas táctiles: botones y controles interactivos con altura mínima de 44px
  (`min-h-11` en Tailwind — `2.75rem`). El botón de mostrar/ocultar
  contraseña (`variant="ghost"` de `Button`) además lleva `min-w-11`: es el
  candidato típico a quedar demasiado chico por ser ícono-only.
- Tipografía y espaciado legibles en mobile primero; si algo necesita crecer
  en pantallas grandes (como los títulos de `AuthLayout`), eso va con
  prefijo (`text-2xl sm:text-4xl`), nunca al revés.

**Decisión — panel de marca del login en mobile**: el mockup fuente es
desktop-only y muestra el panel de marca (`BrandPanel`) siempre, ocupando la
mitad izquierda. En mobile no hay mitad que valga: mostrarlo arriba, aunque
sea compacto, empuja el formulario (la prioridad real de la pantalla) fuera
de la vista inicial. Por eso `BrandPanel` se **oculta completo** en mobile
(`hidden md:flex`) y recién aparece como panel partido desde `md:` — no se
apila arriba en una versión compacta. El logo y el copy de marca ("Vitalys",
"Centro de salud Vitalys") igual están presentes en mobile porque el header
del panel de formulario (`AuthSplitLayout`) tiene su propio `Logo`.

Ejemplo del criterio (no lo copies literal, es ilustrativo):

```
CORRECTO   className="w-full px-4 py-3 sm:max-w-md sm:mx-auto"
INCORRECTO className="max-w-md mx-auto px-4 py-3 max-sm:w-full"
```

El primero arranca en mobile y suma. El segundo arranca en escritorio y
parchea hacia abajo — eso es exactamente lo que NO hay que hacer acá.

## Tokens: de dónde salen y por qué son intocables acá

**Fuente única de verdad**: `docs/02-diseno/design-system/Vitalys.dc.html` —
el mockup que el usuario hizo con Claude Design. Es un archivo estático (sin
`<script>` de lógica real; el `<style>` de adentro solo trae el reset y las
variables de color, todo lo demás está inline en `style="..."`). De ahí
salen, calcados sin reinterpretar:

- **Colores** — declarados como custom properties en
  `:root`/`[data-theme="light"]` y `[data-theme="dark"]` en `src/index.css`
  (`--bg`, `--surface`, `--text`, `--clin`, `--gym`, `--ok`, `--warn`, `--bad`,
  etc., cada uno con su `-ink`/`-soft` cuando corresponde). El `@theme` de
  Tailwind v4 los expone como utilidades (`bg-clin`, `text-bad-ink`, etc.)
  **apuntando a esas custom properties, nunca a un hex fijo**
  (`--color-clin: var(--clin)`, no `--color-clin: #0B6B69`). Así, el día que
  se implemente el switch de tema, alcanza con setear `data-theme="dark"` en
  `<html>` — ningún componente cambia.
- **Tipografía** — `Schibsted Grotesk` (`font-heading`, títulos),
  `IBM Plex Sans` (`font-sans`, cuerpo — ya es el default heredado por
  `body`), `IBM Plex Mono` (`font-mono`, reservada para datos puntuales:
  horarios, DNI, identificadores). Se cargan desde Google Fonts en
  `index.html`.
- **Radios** — el mockup usa valores sueltos entre `2px` y `999px` sin una
  escala explícita. Los racionalizamos en `--radius-sm/md/lg/xl/full` (6/8/
  12/14/999px) en vez de replicarlos todos: `rounded-md` (8px) es el que usan
  `Input`/`Button` (calco de los `border-radius:8px` del mockup).

**`clin` (consultorio) y `gym` (gimnasio) son colores SEMÁNTICOS del
dominio** — corresponden a `tipo_turno` (`CONSULTORIO`/`GYM`) en el modelo de
datos, no a una jerarquía visual. Por eso se llaman así y no
`primary`/`secondary`: el nombre tiene que decir qué significan, no qué lugar
ocupan. `gym-past` existe para turnos de gimnasio ya pasados (no se usa en
las pantallas de auth de este batch, pero queda definido para cuando
aparezca).

El mockup usa `height:46px` para inputs y `height:48px` para el botón
primario — en vez de un `h-[46px]` arbitrario, `Input` y `Button` (variant
`primary`) usan los dos `h-12` (48px, step real de la escala de Tailwind):
mismo alto, visualmente alineados, y de sobra por encima del mínimo táctil de
44px.

**Nunca escribas un hex literal en un componente.** Si un color o tamaño no
está en `@theme`, se agrega ahí — no se hardcodea en el JSX ni se repite en
un `.scss`.

### Actualización: `LoginForm` ya usa `font-mono` en "DNI o email"

`POST /api/auth/login` pasó a aceptar `identificador` (DNI o email, no solo
email) — con el contrato viejo dejábamos el campo en `IBM Plex Sans` porque un
email no es un identificador de formato fijo. Ahora que el campo realmente
puede contener un DNI, `LoginForm` lo calca del mockup con `font-mono` y el
placeholder `38100001`. `RegistroForm` sigue en `IBM Plex Sans` para su campo
`Email` porque el registro **no cambió**: sigue siendo solo email.

### Componentes nuevos del login rediseñado (W-01)

El login pasó de un form centrado a la pantalla partida real del mockup
(panel de marca + panel de formulario). Piezas nuevas:

- **`atoms/Logo`** — ícono + wordmark "Vitalys", con `variant` (`brand` para
  el panel de marca / `surface` para el panel del formulario) y `size`.
- **`atoms/Button`** — variant nuevo, `outline` (botón con borde, calco del
  toggle de tema del mockup: `height:36px;border:1px solid var(--border)`).
- **`molecules/ThemeToggle`** — botón "Modo oscuro"/"Modo claro" según el
  tema recibido por props. No lee `localStorage` ni toca `<html>` — eso vive
  en `hooks/useTheme` (fuera de `components/`, porque son efectos de lado que
  un componente presentacional no debe conocer) y lo resuelve la page.
- **`molecules/DemoAccountCard`** — tarjeta de cuenta de demostración
  (avatar con iniciales + nombre + descripción). Solo emite `onClick`; es
  `LoginForm` quien decide autocompletar sus propios campos con los datos
  reales del seed (`organisms/LoginForm/demoAccounts.ts`).
- **`organisms/BrandPanel`** — panel izquierdo del login (logo, titular,
  leyenda de horarios/servicios, pie). 100% estático, sin props — es copy
  fijo del centro, no dato de negocio.
- **`templates/AuthSplitLayout`** — el layout partido en sí (`BrandPanel` +
  columna de formulario con su propia fila logo/toggle de tema). Genérico
  desde el día uno (recibe `children`), por eso `RegistroPage` lo adoptó sin
  tocar el template cuando le tocó su propio rediseño (ver más abajo).

### Registro (W-06) adoptó el mismo layout partido — `AuthLayout` sigue viva

`RegistroPage` pasó de `AuthLayout` (centrado) a `AuthSplitLayout`, calcando el
estado `auth === 'register'` del mismo mockup. No hizo falta tocar
`AuthSplitLayout`, `BrandPanel` ni `ThemeToggle`: los tres ya eran genéricos
(sin nada hardcodeado de "login"), así que el corte de componentes del primer
batch se sostuvo. `AuthLayout` **no se borró**: `RecuperarContrasenaPage`
todavía la usa (pantalla centrada simple, sin panel de marca).

`RegistroForm` ganó un callback nuevo, `onGoToLogin` (mismo patrón que
`onGoToRegister` de `LoginForm`: un `<button>`, no un `<Link>`, para no acoplar
el organismo a `react-router`).

**Lo que el mockup muestra para `auth === 'register'` pero NO se construyó**:
Nombre, Apellido, DNI (`font-mono`, placeholder "Sin puntos") y un selector
"¿Qué vas a usar?" (chips Gimnasio/Consultorios). El registro público real es
`{ email, contrasena }` únicamente (RF-01/CA-01-1): un usuario recién
registrado todavía no tiene fila en `personas` (CA-01-6, a diferencia del
login no existe un identificador dual DNI-o-email posible acá) y esos datos
los completa el ADMIN después. Construir esos inputs habría sido UI que no
persiste nada — ninguno de los tres es axioma de "fidelidad al mockup", son
parte del prototipo estático que simula un dominio (`personas`, `servicios`)
que la pantalla real de registro no gestiona. Por la misma razón tampoco hay
selector de rol (el backend responde 400 si el body incluye `rol`,
CA-01-7). "Confirmar contraseña" sí se mantuvo aunque no está en el
mockup: es validación de UI pura, preexistente, que no viaja al backend.

`LoginForm` ahora también sabe renderizar su propio encabezado ("Ingresá a tu
cuenta") y la lista de cuentas de demostración: es contenido/reglas propias de
ESE formulario, no layout compartido, así que no viven en el template.

Los dos enlaces del formulario ("¿Olvidaste tu contraseña?" y "Registrate")
son `<button>` que emiten un callback (`onForgotPassword`/`onGoToRegister`),
no `<Link>`: `LoginForm` sigue sin conocer `react-router`, la navegación la
resuelve `LoginPage`.

### Fix: el ojo de `PasswordInput` pasó a estar DENTRO del input, y sin emoji

Estado previo (bug reportado mirando la pantalla real): el botón de
mostrar/ocultar contraseña era un **hermano** del input en un `flex`, flotando
afuera del recuadro — se veían dos controles separados en vez de un campo de
contraseña. Además el ícono era un emoji (`👁`/`🙈`): se renderiza distinto
por sistema operativo, no hereda color y no escala con la tipografía.

Arreglo:

- `PasswordInput` envuelve el `Input` en un `div.relative` y el botón queda
  `absolute inset-y-0 right-0` — superpuesto dentro del recuadro, no al lado.
  El foco visible sigue siendo el del propio `<input>` (su `focus:ring-*` no
  cambió).
- `Input` (átomo) suma la prop `hasTrailingIcon` para reservar `pr-12` en vez
  de `px-3`: son dos variantes de padding mutuamente excluyentes resueltas
  **adentro del átomo**, no una `className` con un `pr-*` suelto pisando el
  `px-3` base desde afuera — dos utilidades de Tailwind con la misma
  especificidad no se pisan de forma confiable según el orden en el string de
  clases, depende del orden de generación de la hoja de estilos. Cualquier
  otro consumidor que necesite ese mismo padding usa la prop, no repite la
  clase.
- El emoji se reemplazó por dos SVG inline (`EyeIcon`/`EyeOffIcon`,
  colocados en `PasswordInput.tsx`, sin uso fuera de ahí): `fill="none"` +
  `stroke="currentColor"` para heredar el color del texto (y seguir el tema
  claro/oscuro sin tocar nada), `aria-hidden="true"` porque el nombre
  accesible lo sigue dando el `aria-label` del botón, no el gráfico.
- El botón mantiene su `aria-label` dinámico ("Mostrar contraseña" /
  "Ocultar contraseña"), `type="button"`, y el mínimo táctil de 44px
  (`min-h-11 min-w-11` del variant `ghost` de `Button`) — nada de esto se negoció.

### El mockup es desktop-only — el mobile-first lo aportamos nosotros

El archivo fuente **no tiene un solo `@media`**: es una maqueta estática de
escritorio, con tamaños de fuente que van de `10.5px` (celdas de tablas
densas) a `48px` (números grandes de fecha). Ninguno de esos extremos se usa
tal cual como base en mobile — la sección "Mobile first" de arriba (base sin
prefijo = mobile, `sm:`/`md:` solo suman) es la que gobierna los tamaños
reales que terminan en el código; el mockup aporta la paleta, la tipografía y
el "aire" (radios, alturas de 44-48px, densidad de spacing), no el
comportamiento responsive.

## Accesibilidad (no es opcional)

- Todo input va asociado a su `<label>` vía `htmlFor`/`id` (`Label` + `Input`,
  o `FormField`/`PasswordInput` que ya arman esa asociación).
- Los errores (`FieldError`) usan `role="alert"` para que un lector de
  pantalla los anuncie apenas aparecen, y se asocian al `<form>` vía
  `aria-describedby` cuando hay un error visible.
- El botón de mostrar/ocultar contraseña (`PasswordInput`) siempre tiene
  `aria-label` ("Mostrar contraseña" / "Ocultar contraseña"): es un ícono sin
  texto visible, así que su nombre accesible depende 100% de ese atributo.

Si agregás un campo nuevo, mantené esa asociación — es lo que además hace que
los tests con React Testing Library (`getByLabelText`, `getByRole("alert")`)
sigan funcionando sin trucos.
