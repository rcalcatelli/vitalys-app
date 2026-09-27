# Sistema de diseño — Vitalys

`Vitalys.dc.html` es el mockup de la aplicación, elaborado por el equipo con Claude Design.
Define el lenguaje visual: paleta, tipografía, radios, espaciado y el aspecto de cada
componente. El frontend consume esos valores como tokens.

## Cómo se consume

Las variables CSS del mockup se replican tal cual en `frontend/src/index.css`, bajo
`:root`/`[data-theme="light"]` y `[data-theme="dark"]`. El bloque `@theme` de Tailwind
**apunta a esas variables en vez de repetir los colores** (`--color-clin: var(--clin)`).

Gracias a esa indirección, cambiar de tema es setear `data-theme` en `<html>`: todas las
utilidades siguen sola, sin duplicar la paleta ni tocar un componente.

Ningún componente escribe un color literal.

## Los colores son semánticos, no decorativos

| Token | Significa |
|-------|-----------|
| `clin` (teal `#0B6B69`) | Consultorio — Nutrición, Psicología, Kinesiología |
| `gym` (naranja `#C9601B`) | Gimnasio |
| `gym-past` | Turno de gimnasio ya pasado |
| `ok` / `warn` / `bad` | Estados de la interfaz |

`clin` y `gym` se corresponden con `turnos.tipo_turno` (`CONSULTORIO` / `GYM`). Por eso se
nombran así y no `primary`/`secondary`: el nombre dice qué significa, no qué lugar ocupa en
una jerarquía visual.

## El mockup no resuelve el responsive

**No tiene ninguna `@media`**: es estático, pensado para escritorio. Sus tamaños de fuente van
de 10,5 px a 48 px, y los más chicos corresponden a tablas densas de escritorio.

El comportamiento responsive lo escribe el frontend siguiendo la convención **mobile first**
del proyecto: las clases sin prefijo son el estado móvil y los breakpoints solo agregan. Los
tamaños del mockup se usan como referencia de escala, no como base móvil.

## Desviaciones deliberadas respecto del mockup

El mockup se diseñó como pieza visual y en algunos puntos propone comportamientos que
contradicen los requerimientos del sistema. Donde eso ocurre, **gana el requerimiento**, y acá
queda registrado el motivo.

### El formulario de registro no pide Nombre, Apellido ni DNI

El mockup muestra esos campos, más un selector "¿Qué vas a usar?". La aplicación **no los
construye**: `POST /api/auth/registro` recibe únicamente email y contraseña.

El motivo es **RN-10**: el alta en `personas` tiene dos caminos y *ambos son exclusivos del
ADMIN* — alta presencial (RF-05) o vínculo por email de un usuario ya registrado (RF-31). Y
**CA-01-6** lo dice explícitamente: tras registrarse, "la ficha de persona queda pendiente de
completar por el ADMIN (el usuario existe pero `personas` no tiene fila aún)".

Construir esos campos significaría que el registro público crea la ficha de persona, que es
justamente lo que la tutora señaló en el punto 7 de la devolución de la 2.ª entrega y que se
corrigió. Sería reintroducir el problema.

### El registro no tiene selector de rol

Mismo origen. **RF-01** y **CA-01-7**: el rol siempre es `SOCIO_PACIENTE`, lo fuerza el
servidor, y si el body incluye `rol` la API responde 400. Un selector de rol en el registro
público era el agujero de escalación de privilegios del punto 7.

### El login sí acepta DNI, el registro no

El login ofrece "DNI o email" (RF-36) porque quien ya tiene ficha cargada puede identificarse
con su DNI. El registro no puede: un usuario nuevo todavía no tiene fila en `personas` y por
lo tanto no tiene DNI asociado.

### "¿Olvidaste tu contraseña?"

El enlace existe como en el mockup, pero lleva a una pantalla que informa que la función
estará disponible más adelante. No hay endpoint de recuperación ni ningún RF que lo contemple.

### La tarjeta de demostración "Laura Benítez"

El mockup muestra cinco cuentas de demostración. Cuatro tienen correlato real en
`db/dml/seed.sql`; la quinta no existe. En su lugar se usa la cuenta de administración que sí
está cargada. Una tarjeta que autocompleta credenciales inexistentes es peor que no tenerla.

## Vistas que el mockup define y todavía no se construyeron

El mockup incluye, además de la autenticación, tres vistas completas de la aplicación:
`socio`, `profesional` y `recepcion`, con agenda, turnos, pagos, personas y notificaciones.

Corresponden a los **Sprints 3, 4 y 5** y son otras issues. Van a consumir los mismos tokens y
los mismos componentes de `frontend/src/components/`, sin rehacer la capa de diseño.
