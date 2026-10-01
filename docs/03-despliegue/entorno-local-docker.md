# Entorno local del backend con Docker y Flyway

> Guía de entorno de desarrollo. Complementa `docs/03-despliegue/runbook-deploy.md`
> (despliegue productivo en Supabase + Render + Vercel) y
> `docs/03-despliegue/setup-wsl-testcontainers.md` (tests de integración en Windows).
> Este documento cubre un caso distinto: **levantar el backend localmente, contra un
> Postgres propio, sin tocar Supabase ni depender de Testcontainers.**

---

## 1. Qué resuelve esto

Hasta ahora, para correr el backend en la máquina de cada integrante había que tener un
PostgreSQL instalado a mano, cargar el esquema pegando `db/ddl/vitalys_ddl.sql` en algún
cliente SQL, y exportar variables de entorno una por una. Cada persona repetía ese proceso
por separado, y nada garantizaba que dos máquinas terminaran con el mismo esquema.

Con lo que se agrega en este cambio, el flujo pasa a ser:

```bash
docker compose up -d
```

Un solo comando levanta un Postgres nuevo (o reutiliza el que ya existía), crea las tablas
si hace falta, aplica cualquier corrección de esquema pendiente, y deja el backend
respondiendo en `http://localhost:8080`. No importa si es la primera vez que alguien clona
el repo o si ya venía trabajando hace semanas: `docker compose up` siempre termina en el
mismo estado convergente.

Esto es posible por dos piezas que trabajan juntas: **Docker Compose** (que orquesta los
contenedores) y **Flyway** (que gestiona el esquema de la base). El resto de este documento
explica cada una y, sobre todo, **por qué** las elegimos para Vitalys en particular.

---

## 2. Prerrequisitos

- Docker Desktop instalado y corriendo (Windows, macOS o Linux). Alcanza con el motor de
  Docker — **no hace falta WSL para esto**, a diferencia de los tests de integración con
  Testcontainers (ver §6.3).
- Nada más. Ni Java, ni Maven, ni un Postgres local: todo corre dentro de los contenedores.

---

## 3. Cómo levantar el entorno

### 3.1 Configurar las variables de entorno

En la raíz del repo:

```bash
cp .env.example .env
```

Abrí `.env` y completá los valores marcados. Ninguno necesita ser "real": `DB_PASSWORD` y
`JWT_SECRET` son solo para tu Postgres local, no tienen relación con las credenciales de
Supabase ni con el `JWT_SECRET` de Render. `.env` está en `.gitignore` — nunca se commitea.

### 3.2 Levantar los contenedores

```bash
docker compose up -d
```

Esto hace tres cosas, en orden:

1. Crea (o reutiliza) el volumen `vitalys_pg_data` y levanta un contenedor `postgres`.
2. Espera a que Postgres esté **healthy** (Docker corre `pg_isready` adentro del contenedor
   cada 5 segundos) antes de arrancar el backend. Esto es la cláusula
   `depends_on: condition: service_healthy` del `docker-compose.yml` — sin ella, el backend
   podría arrancar antes de que Postgres esté listo para aceptar conexiones y fallar en el
   primer intento de Hikari/Flyway.
3. Construye la imagen del backend (si no existía) y la levanta. Al arrancar, Spring Boot
   ejecuta Flyway, que aplica las migraciones pendientes contra la base (ver §4).

### 3.3 Verificar que está sano

```bash
docker compose ps
```

La columna `STATUS` del backend debe decir `healthy` (puede tardar unos segundos:
el `HEALTHCHECK` del `Dockerfile` empieza a chequear recién después de un
`start_period` de 25 s, para darle tiempo a Flyway y a Spring de terminar de arrancar).

Para confirmar contra la API misma:

```bash
curl http://localhost:8080/api/health
# {"status":"UP"}
```

Este endpoint no depende de la base de datos (ver `HealthController`): si responde `200`,
el proceso de Java está vivo, independientemente del estado de Postgres.

### 3.4 Cargar datos de prueba (opcional)

El seed (`db/dml/seed.sql`) **no se carga automáticamente** — es un dato de desarrollo, no
algo que tenga sentido forzar en todos los entornos (por ejemplo, no tendría sentido en un
entorno de staging). Se carga a demanda con un *profile* de Compose:

```bash
docker compose --profile seed up seed
```

Esto levanta un contenedor efímero que ejecuta `psql -f seed.sql` contra el Postgres del
compose y termina solo (código de salida `0` si todo salió bien). Podés repetirlo las veces
que quieras mientras la base esté vacía; si ya cargaste el seed una vez, volver a correrlo
va a fallar por violación de las restricciones `UNIQUE` (email, DNI, etc.) — es el
comportamiento esperado, no un bug.

### 3.5 Ver logs

```bash
docker compose logs -f backend
```

Ahí se ve, entre otras cosas, la línea de Flyway indicando cuántas migraciones aplicó al
arrancar (o que no había ninguna pendiente, si ya estaban todas aplicadas).

### 3.6 Detener el entorno

```bash
docker compose down
```

Apaga y elimina los **contenedores**, pero el volumen `vitalys_pg_data` queda intacto: la
próxima vez que hagas `docker compose up`, tus datos siguen ahí.

```bash
docker compose down -v
```

La bandera `-v` además **borra el volumen**, o sea, borra todos los datos de la base. Usalo
cuando quieras arrancar de cero (por ejemplo, para probar que el flujo completo funciona
desde un estado vacío) — no hay forma de deshacerlo.

---

## 4. Qué es Flyway (para quien nunca usó una herramienta de migraciones)

### 4.1 El problema que resuelve

Sin una herramienta de migraciones, el esquema de una base de datos es "lo que alguien
ejecutó a mano en algún momento". Si dos personas del equipo corrieron el mismo script una
vez, sus bases quedan iguales — pero en el momento en que el esquema necesita un cambio
(agregar una columna, una tabla nueva), no hay ningún mecanismo que garantice que todos
apliquen ese cambio, en el mismo orden, en todos los entornos (la máquina de cada
integrante, CI, producción). Es fácil que una base quede "un paso atrás" sin que nadie lo
note hasta que algo falla en producción con un error de columna inexistente.

### 4.2 El modelo de migraciones versionadas

Flyway resuelve esto tratando al esquema de la base de datos igual que el código: como una
secuencia de cambios versionados e inmutables. En vez de un único script gigante que se
edita cada vez que hace falta un cambio, cada cambio de esquema es un **archivo nuevo**,
numerado en orden:

```
db/migration/
├── V1__esquema_inicial.sql                 esquema aprobado el 21/09
├── V2__reglas_gimnasio.sql                 grilla, cupo y validaciones de gym
├── V3__excepciones_morosidad.sql           tabla que faltaba
├── V4__fecha_inicio_membresia.sql          columna en personas
├── V5__ensanchar_excl_turnos_overlap.sql   AUSENTE y COMPLETADO bloquean
├── V6__tolerancia_morosidad.sql            umbral de períodos impagos
├── V7__notificacion_morosidad.sql          avisos de deuda y suspensión
├── V8__ocupacion_por_inicio_del_turno.sql  el lugar se ocupa si el turno empezó
├── V9__grilla_gym_hora_de_cierre.sql       21:00 y 12:00 son hora de cierre
├── V10__feriados_gimnasio.sql              calendario oficial de feriados
├── V11__validaciones_pendientes.sql        las cinco validaciones que faltaban
└── V12__cancelacion_por_profesional.sql    cancelación en cascada por disponibilidad
```

> El orden lo da el **número de versión**, no el orden alfabético. `V10` va después de
> `V9`, aunque un `ls` del shell lo ponga entre `V1` y `V2`.

El nombre sigue una convención estricta: `V<número>__<descripción>.sql` (dos guiones bajos
después del número). Flyway lee esa carpeta, mira qué versiones ya se aplicaron contra la
base actual, y ejecuta — **en orden, y una sola vez cada una** — las que todavía no se
aplicaron. Esto pasa automáticamente cada vez que arranca la aplicación Spring Boot, no hace
falta correr nada a mano.

### 4.3 La tabla `flyway_schema_history`

Flyway necesita saber qué migraciones ya corrieron contra una base en particular. Para eso,
la primera vez que se conecta, crea una tabla propia: `flyway_schema_history`. Cada fila de
esa tabla es una migración aplicada, con su número de versión, su descripción, un checksum
del contenido del archivo, cuándo se aplicó, y si tuvo éxito. Podés inspeccionarla como
cualquier otra tabla:

```bash
docker exec vitalys-postgres psql -U vitalys -d vitalys -c "SELECT version, description, success FROM flyway_schema_history;"
```

Esa tabla es, en los hechos, la fuente de verdad de "en qué versión de esquema está esta
base puntual". Es lo primero que Flyway consulta al arrancar: compara esa tabla contra los
archivos que encuentra en `db/migration`, y decide qué falta aplicar.

### 4.4 Por qué las migraciones aplicadas son inmutables

Una vez que una migración corrió contra una base — cualquier base, incluso la de tu
máquina — **no se edita nunca más**. Esto no es una convención arbitraria: Flyway lo hace
cumplir activamente mediante el checksum guardado en `flyway_schema_history`. Si alguien
edita el contenido de `V1__esquema_inicial.sql` después de que ya se aplicó, el checksum
calculado en el próximo arranque no va a coincidir con el que quedó guardado, y Flyway va a
rechazar arrancar con un error de **validación de checksum** (ver troubleshooting, §6.1).

La razón de fondo: si las migraciones pudieran editarse, dos bases que corrieron "la misma"
migración en distintos momentos podrían terminar con esquemas distintos sin que nadie se dé
cuenta — exactamente el problema que Flyway existe para evitar. La única forma correcta de
corregir algo que ya se aplicó es agregar una migración **nueva** que haga la corrección
(`ALTER TABLE`, etc.), nunca tocar la anterior.

---

## 5. Por qué lo adoptamos en Vitalys (motivos concretos, no genéricos)

Tres razones puntuales, no un argumento de manual:

**1. El esquema era un script de ejecución manual.** `db/ddl/vitalys_ddl.sql` se pegaba a
mano en el SQL Editor de Supabase (ver `runbook-deploy.md`) o en cualquier cliente local.
Cada integrante tenía que acordarse de volver a correrlo si el archivo cambiaba, y no había
manera automática de detectar si alguien se había quedado con una versión vieja. Con Flyway,
el esquema se aplica solo al arrancar la aplicación — no depende de que nadie se acuerde de
nada.

**2. La tutora aprobó el esquema el 21/09** (ver `docs/02-diseno/rfc-002-motor-base-de-datos.md`,
estado "✅ APROBADA"). Ya identificamos correcciones pendientes sobre ese esquema aprobado
(la tabla `excepciones_morosidad`, un campo `fecha_inicio_membresia` en `personas`, ajustar
el `EXCLUDE` de solapamiento de turnos). Sin migraciones, aplicar esas correcciones
significaría **editar el archivo que la tutora ya aprobó**, perdiendo el registro histórico
de qué era exactamente lo aprobado en esa fecha. Con Flyway, `V1__esquema_inicial.sql` queda
congelado tal cual se aprobó — es el registro histórico — y las correcciones llegan como
`V2`, `V3`, etc., sin tocarlo nunca. **Eso ya ocurrió:** las correcciones de la devolución se
aplicaron como `V3`, `V4` y `V5`, y `V1` sigue byte a byte como se aprobó.

**3. `docker compose up` converge desde cualquier estado, no solo desde cero.** Antes, "crear
la base" y "tenerla al día" eran la misma operación manual repetida. Ahora son dos cosas
separadas que Flyway resuelve solo: si la base no existe, aplica todo desde `V1`; si ya
existe con `V1` aplicado y aparecen `V2` a `V5`, aplica solo esas cuatro. El comando para
levantar el entorno es siempre el mismo, sin importar en qué estado esté la base de cada uno.
Esto se verificó: una base que llevaba horas corriendo con `V1` recibió `V2` a `V5` al
reiniciar el backend, sin borrar el volumen y sin perder datos.

---

## 6. Cómo agregar una migración nueva

Cuando una futura funcionalidad necesite un cambio de esquema (una tabla, una columna, un
índice):

1. Mirá cuál es la versión más alta que existe en `db/migration/` (hoy, `V5`).
2. Creá un archivo nuevo con la **siguiente** versión: `V6__descripcion_corta.sql`. La
   descripción va en minúsculas, con guiones bajos en vez de espacios (ej.
   `V6__agregar_tabla_reportes.sql`).
3. Escribí ahí, y **solo ahí**, el `ALTER TABLE` / `CREATE TABLE` / lo que corresponda.
4. Al próximo arranque de la aplicación (local, CI o Docker), Flyway detecta el archivo
   nuevo, ve que no está en `flyway_schema_history`, y lo aplica automáticamente — no hace
   falta ningún comando manual ni configuración adicional.
5. **Nunca edites `V1__esquema_inicial.sql` ni ningún `V<n>` ya aplicado.** Si necesitás
   corregir algo de una migración anterior, la corrección es una migración nueva.

No hace falta editar `backend/pom.xml` ni `docker-compose.yml` para que esto funcione: el
`location` de Flyway (`classpath:db/migration`) y el resource extra declarado en el `pom.xml`
ya apuntan a la carpeta `db/migration/` completa — cualquier archivo `V<n>__*.sql` que
agregues ahí se empaqueta y se ejecuta automáticamente.

---

## 7. Las migraciones que ya existen

| Versión | Qué hace |
|---------|----------|
| `V1__esquema_inicial.sql` | Esquema tal como se aprobó el 21/09. **Congelado**, no se edita nunca. |
| `V2__reglas_gimnasio.sql` | Grilla de turnos de gym (60 min en punto, L-V 07-21, sáb 09-12), tabla `configuracion_gym` con el cupo por franja, un turno por persona y día, y validación de que sea socio activo. |
| `V3__excepciones_morosidad.sql` | Tabla `excepciones_morosidad`, que figuraba en todos los documentos pero no en el esquema. |
| `V4__fecha_inicio_membresia.sql` | Columna `personas.fecha_inicio_membresia`, necesaria para saber desde qué mes se adeudan cuotas. |
| `V5__ensanchar_excl_turnos_overlap.sql` | La restricción de solapamiento pasa a bloquear también `AUSENTE` y `COMPLETADO`. |
| `V6__tolerancia_morosidad.sql` | Parámetro `configuracion_gym.meses_tolerancia_morosidad` (6 por defecto): períodos impagos que se toleran antes de suspender al socio. Relevado en el Centro Deportivo Jerárquicos. |
| `V7__notificacion_morosidad.sql` | Valores `AVISO_DEUDA` y `AVISO_SUSPENSION` en el enum `tipo_notificacion`, para el aviso de estado de cuenta (RF-37). |
| `V8__ocupacion_por_inicio_del_turno.sql` | Función `fn_turno_ocupa_lugar`: el lugar se libera si la cancelación llegó antes del inicio del turno, y queda bloqueado si llegó con la franja ya empezada. Reemplaza la lista de estados en el `EXCLUDE`, en el cupo de gimnasio y en el índice de un turno por persona y día. |
| `V9__grilla_gym_hora_de_cierre.sql` | El horario del gimnasio se lee de apertura a cierre: última franja 20:00–21:00 de lunes a viernes y 11:00–12:00 los sábados. Antes se aceptaba un turno que empezaba a la hora de cierre y terminaba una hora después. |
| `V10__feriados_gimnasio.sql` | Tabla `feriados` y validación en el trigger del gimnasio. La puebla el importador contra el dataset oficial del Ministerio del Interior (RF-38); nunca se consulta la API al reservar. |
| `V12__cancelacion_por_profesional.sql` | Estado `CANCELADO_POR_PROFESIONAL`: cuando un profesional reduce su disponibilidad, los turnos futuros afectados se cancelan en cascada (RN-24) y quedan distinguibles de una cancelación del paciente. `fn_turno_ocupa_lugar` no necesitó cambios. |
| `V11__validaciones_pendientes.sql` | Cierra las cinco validaciones que la base aceptaba: pago de sesión sobre un turno de gimnasio o a nombre de otra persona, turno para alguien dado de baja, turnos superpuestos de la misma persona, y excepción de morosidad apuntando al turno de otro. Además invierte el sentido de `excepciones_morosidad.turno_id`: pasa a registrar qué turno consumió la excepción (RN-23). |

> **Ojo con el orden al aplicarlas a mano.** Flyway ordena por número de versión, pero un `ls db/migration/V*.sql` del shell ordena alfabéticamente y pone `V10` entre `V1` y `V2`. Si las corrés sueltas, usá `ls db/migration/V*.sql | sort -V`. Con `docker compose` no hace falta: lo resuelve Flyway.

Ninguna de estas tocó `V1`, el `Dockerfile` ni el `docker-compose.yml`: cada una es un
archivo nuevo y nada más. Esa es exactamente la propiedad por la que se adoptó Flyway.

---

## 8. Troubleshooting

### 8.1 Error de validación de checksum

Síntoma típico al arrancar:

```
FlywayException: Validate failed: Migrations have failed validation
Migration checksum mismatch for migration version 1
-> Applied to database : -779553494
-> Resolved locally    : 123456789
```

**Qué significa:** el contenido de `V1__esquema_inicial.sql` (o el que corresponda) cambió
*después* de que esa migración ya se había aplicado contra esa base puntual. Flyway lo
detecta comparando el checksum guardado en `flyway_schema_history` contra el que calcula del
archivo actual, y se niega a arrancar — es la protección descripta en §4.4, funcionando
como se espera.

**Cómo recuperarse en desarrollo:** normalmente pasa porque alguien (vos mismo, sin querer)
editó una migración que ya estaba aplicada en tu Postgres local. Como en desarrollo los datos
no importan, la salida más simple es tirar el volumen y arrancar de cero:

```bash
docker compose down -v
docker compose up -d
```

**Esto NO es válido en producción** — ahí el problema real es que alguien editó una
migración ya aplicada, y hay que revertir esa edición y, si el cambio era necesario, agregarlo
como una migración nueva (ver §6).

### 8.2 El backend arranca antes de que Postgres esté listo

Con el `docker-compose.yml` de este repo esto no debería pasar, porque `depends_on` usa
`condition: service_healthy` (no el `depends_on` simple, que solo espera a que el contenedor
exista, no a que el servicio esté listo). Si de todas formas ves en los logs del backend
algo como `Connection to postgres:5432 refused`, revisá:

- Que el `healthcheck` del servicio `postgres` en `docker-compose.yml` no se haya tocado.
- Que no estés levantando el backend con `docker compose up backend` (sin el resto), que
  Docker Compose interprete distinto la dependencia.

### 8.3 Relación con `setup-wsl-testcontainers.md`

Ese documento describe un problema puntual y distinto: en Windows con Docker Desktop, la
librería `docker-java` que usan los **tests de integración con Testcontainers** no logra
hablar con el daemon de Docker por los named pipes, aunque el CLI de Docker sí puede. La
solución ahí es correr los tests desde WSL.

**Ese problema no afecta nada de este documento.** Lo que se describe acá (`docker compose
up`, `docker compose build`, etc.) es el **CLI de Docker y Docker Compose**, que en esa misma
máquina Windows funciona perfectamente — el problema reportado en
`setup-wsl-testcontainers.md` es específico de la librería Java que usa Testcontainers para
hablar con el daemon mediante programación, no del CLI. Podés levantar el entorno de este
documento sin ningún problema aunque `mvn verify` (que sí usa Testcontainers) siga fallando
en esa misma máquina.

---

## 9. Referencia rápida de comandos

| Acción | Comando |
|---|---|
| Levantar todo | `docker compose up -d` |
| Ver estado / salud | `docker compose ps` |
| Ver logs del backend | `docker compose logs -f backend` |
| Cargar el seed | `docker compose --profile seed up seed` |
| Parar (conserva datos) | `docker compose down` |
| Parar y borrar datos | `docker compose down -v` |
| Reconstruir la imagen tras un cambio de código | `docker compose up -d --build backend` |
| Ver migraciones aplicadas | `docker exec vitalys-postgres psql -U vitalys -d vitalys -c "SELECT version, description, success FROM flyway_schema_history;"` |
