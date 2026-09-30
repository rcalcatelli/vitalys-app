# Runbook de despliegue — Vitalys App

> **3.ª Entrega — Trabajo Final Integrador**
> Tecnicatura Universitaria en Programación · UTN · 2026
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

Este documento es una guía manual, paso a paso, para dejar Vitalys funcionando en producción:
**Supabase** (base de datos) + **Render** (backend) + **Vercel** (frontend).

No es un script automatizado: los pasos de creación de cuentas/proyectos y la carga de secretos
los ejecuta una persona (Pablo o Renzo) con sus propias credenciales. Ningún valor real de
contraseña, cadena de conexión o secreto se escribe en este repositorio — solo los **nombres**
de las variables de entorno que hay que cargar en cada plataforma.

---

## 1. Supabase (base de datos)

1. Crear una cuenta / iniciar sesión en [supabase.com](https://supabase.com).
2. Crear un nuevo proyecto:
   - Elegir nombre (por ejemplo `vitalys-app`) y una contraseña de base de datos (guardarla en un
     gestor de contraseñas, **no** en el repo).
   - Elegir la región más cercana (por ejemplo `South America (São Paulo)`).
3. Esperar a que el proyecto termine de aprovisionarse (unos minutos).
4. Ir a **Project Settings → Database → Connection string**.
5. **Elegir el modo de conexión correcto — este paso es crítico:**

   > ⚠️ **Advertencia sobre el connection pooler de Supabase**
   >
   > Supabase ofrece dos modos de pooler: **Transaction pooler** (puerto 6543) y
   > **Session pooler** (puerto 5432, o la conexión directa a Postgres).
   >
   > Vitalys mapea `usuarios.rol` (y en sprints futuros otras columnas) con ENUMs **nativos**
   > de PostgreSQL vía `@JdbcTypeCode(SqlTypes.NAMED_ENUM)`. Ese mapeo depende de que el driver
   > pueda resolver el *cast* del tipo ENUM (`?::rol_usuario`) dentro de la misma sesión. El
   > **Transaction pooler** rota de conexión física entre transacciones y puede romper esa
   > resolución de cast.
   >
   > **Usar siempre el Session pooler (o la conexión directa), nunca el Transaction pooler.**
   >
   > **Síntoma si te equivocás:** los tests de integración con Testcontainers (que usan un
   > Postgres real en un contenedor, sin pooler) pasan sin problema, pero al desplegar contra
   > Supabase el registro/login falla con un error de cast de tipo ENUM
   > (algo como `operator does not exist: character varying = rol_usuario` o
   > `column "rol" is of type rol_usuario but expression is of type character varying`).
   > Si ves ese error solo en Supabase y nunca en local/CI, revisá el modo de pooler primero.

6. Copiar la cadena de conexión del **Session pooler** (o la conexión directa). Va a tener esta
   forma (sin el valor real de contraseña, que se carga aparte en Render):

   ```
   jdbc:postgresql://<host-de-supabase>:5432/postgres?sslmode=require
   ```

7. Anotar por separado (no en el repo):
   - `DB_URL` → la cadena JDBC de arriba.
   - `DB_USERNAME` → el usuario de Postgres que muestra Supabase (por ejemplo `postgres`).
   - `DB_PASSWORD` → la contraseña elegida en el paso 2.

### 1.1 El esquema lo crea Flyway, no se pega a mano

> **No ejecutes `db/ddl/vitalys_ddl.sql` en Supabase.** Ese archivo es el esquema inicial
> histórico y hoy está incompleto: le faltan las reglas del gimnasio, la tabla
> `excepciones_morosidad`, `personas.fecha_inicio_membresia` y la restricción de solapamiento
> ampliada. Pegarlo dejaría la base en un estado intermedio y, peor, Flyway fallaría después al
> encontrar tablas que él no creó y sin su tabla de historial.

**La base de Supabase queda VACÍA.** Al arrancar, el backend aplica en orden todas las
migraciones de [`db/migration/`](../../db/migration/) y registra cada una en
`flyway_schema_history`. Cada despliegue posterior aplica solo lo que falte.

Para verificarlo después de levantar el backend (paso 2), en **SQL Editor**:

```sql
SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;
```

Deben aparecer todas las versiones con `success = true`, y las tablas en **Table Editor**.

**Datos de prueba (opcional).** Si querés cargarlos, ejecutá `db/dml/seed.sql` en el SQL Editor
**después** de que Flyway haya corrido, nunca antes: el seed asume el esquema ya creado.

> Si alguna vez necesitás aplicar el esquema a mano, ejecutá los archivos de `db/migration/`
> **en orden de versión** (V1, V2, V3…), no el DDL viejo. Ver
> [`entorno-local-docker.md`](entorno-local-docker.md) para el detalle de cómo funciona Flyway.

---

## 2. Render (backend)

1. Crear una cuenta / iniciar sesión en [render.com](https://render.com).
2. **New → Blueprint** y conectar el repositorio de GitHub `vitalys-app`. Render va a detectar
   [`render.yaml`](../../render.yaml) en la raíz y proponer el servicio `vitalys-backend`
   (`runtime: docker`, plan free).

   > **Por qué Docker y no Java.** Render no tiene runtime nativo de Java: los suyos son
   > docker, node, python, ruby, go, rust, elixir y static. Un blueprint con `env: java`
   > se rechaza con `invalid runtime java`. Usar Docker además tiene una ventaja: Render
   > construye **la misma imagen** que corre en local con `docker compose`.
   >
   > El contexto de build es la **raíz del repositorio**, no `backend/`. El Dockerfile hace
   > `COPY db/migration ./db/migration`, y las migraciones viven fuera de `backend/`. Con
   > `rootDir: backend` ese `COPY` no encontraría nada y el build fallaría. Por eso el
   > blueprint usa `dockerContext: .` y `dockerfilePath: ./backend/Dockerfile`, igual que
   > `docker-compose.yml`.
3. Confirmar la creación del servicio. Render va a pedir los valores de las variables marcadas
   como `sync: false` en `render.yaml` — completarlas en el dashboard (**nunca** en el repo):
   - `DB_URL` → la cadena JDBC del paso 1 (Session pooler).
   - `DB_USERNAME` → usuario de Postgres.
   - `DB_PASSWORD` → contraseña de Postgres.
   - `JWT_SECRET` → una clave aleatoria larga (por ejemplo generada con
     `openssl rand -base64 48`). No reutilizar secretos de otros proyectos.
   - `SPRING_PROFILES_ACTIVE` ya viene fijado en `render.yaml` como `prod`. **No lo borres.**
     La configuración del datasource vive en `application-prod.properties`, no en
     `application.properties`: sin perfil activo la aplicación arranca, no encuentra
     `spring.datasource.url` y muere con *"Failed to configure a DataSource"* aunque las
     cuatro variables de arriba estén bien cargadas.
   - `JWT_EXPIRATION_MS` ya viene con un valor por defecto en `render.yaml` (`86400000` = 24 h);
     solo cambiarlo si se decide otra política de expiración.
4. Disparar el primer deploy (Render lo hace automáticamente al crear el Blueprint). El build
   es el del `backend/Dockerfile`: etapa de compilación con Maven y JDK 17, y etapa final con
   JRE 17 corriendo `java -jar /app/app.jar` como usuario sin privilegios.

   **Este arranque es el primero que aplica el esquema contra Supabase.** En los logs de
   Render deberían aparecer las cinco migraciones:

   ```
   Schema history table "public"."flyway_schema_history" does not exist yet
   Creating Schema History table ...
   Migrating schema "public" to version "1 - esquema inicial"
   Migrating schema "public" to version "2 - reglas gimnasio"
   Migrating schema "public" to version "3 - excepciones morosidad"
   Migrating schema "public" to version "4 - fecha inicio membresia"
   Migrating schema "public" to version "5 - ensanchar excl turnos overlap"
   Started VitalysApplication
   ```
5. Una vez que el deploy quede en estado **Live**, verificar `GET /api/health` en la URL pública
   que asigna Render (por ejemplo `https://vitalys-backend.onrender.com/api/health`) — debe
   responder `200` sin necesitar token ni base de datos disponible para ese endpoint puntual.

   > ⏱️ **Cold start del plan free de Render**: si el servicio estuvo inactivo (sin tráfico) por
   > un rato, Render lo "duerme". La primera request después de eso puede tardar **~50 segundos**
   > en responder mientras el contenedor arranca de nuevo. Esto es esperado en el plan free, **no
   > es un bug** — ver la nota en el `README.md` y el checklist de smoke test en
   > `docs/metodologia/definicion-pruebas.md`.

---

## 3. Vercel (frontend)

1. Crear una cuenta / iniciar sesión en [vercel.com](https://vercel.com).
2. **Add New → Project** y conectar el mismo repositorio de GitHub. Elegir el directorio raíz
   del proyecto como `frontend/` (Vercel va a leer `frontend/vercel.json` para el build).
3. Configurar las variables de entorno del frontend (prefijo `VITE_`, ver
   `frontend/vercel.json` / `frontend/src/api/http.ts`):
   - `VITE_API_URL` → la URL pública del backend en Render (paso 2.5), por ejemplo
     `https://vitalys-backend.onrender.com`.
4. Disparar el deploy. Vercel corre `vite build` y sirve el contenido de `dist/`.
5. Una vez deployado, abrir la URL pública y probar el login (ver checklist de smoke test en
   `docs/metodologia/definicion-pruebas.md`, Nivel 3).

---

## 4. Checklist final

- [ ] Proyecto Supabase creado, DDL ejecutado, tablas visibles.
- [ ] Connection string usa el **Session pooler** (no el Transaction pooler).
- [ ] Servicio Render `vitalys-backend` en estado Live, `GET /api/health` responde 200.
- [ ] Variables de entorno cargadas en Render (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`,
      `JWT_SECRET`) — ninguna commiteada en el repo.
- [ ] Proyecto Vercel deployado, `VITE_API_URL` apunta a la URL pública de Render.
- [ ] Smoke test manual (Nivel 3 de `definicion-pruebas.md`) ejecutado contra el entorno real.

Este runbook no despliega nada por sí mismo — cada paso lo ejecuta una persona con sus propias
credenciales en Supabase, Render y Vercel.

---

## Sincronización del calendario de feriados (RF-38)

El backend sincroniza los feriados contra el dataset oficial del Ministerio del Interior
(`datos.gob.ar`) **todos los días a las 03:00 de Argentina**.

No requiere ninguna variable de entorno: los valores por defecto de
`application.properties` ya apuntan a la fuente correcta.

| Propiedad | Valor por defecto | Para qué |
|---|---|---|
| `vitalys.feriados.habilitado` | `true` | Apaga el job sin tocar el código |
| `vitalys.feriados.cron` | `0 0 3 * * *` | Horario de la corrida |
| `vitalys.feriados.zona` | `America/Argentina/Buenos_Aires` | Zona en que se interpreta el cron |
| `vitalys.feriados.anios-a-sincronizar` | `2` | Año en curso y el siguiente |

### Forzar una sincronización

Cuando se declara un feriado por decreto y no puede esperar a las 03:00:

```
POST /api/admin/feriados/sincronizar     (requiere token de ADMIN)
```

Devuelve `200` si sincronizó todos los años y `207` si alguno no se pudo leer. **Un `207`
por el año siguiente es esperable durante buena parte del año**: el Estado publica el
archivo del año que viene recién sobre fin de año. No indica una falla del sistema — el
calendario del año en curso quedó sincronizado igual.

### Verificar que quedó sincronizado

En el log de arranque o de la corrida:

```
Calendario oficial 2026: 34 feriados leídos de https://www.argentina.gob.ar/...
Calendario de feriados actualizado — años=[2026, 2027] altas=31 ... errores=1
```

Y contra la base:

```sql
SELECT tipo, count(*), count(*) FILTER (WHERE cierra_gimnasio) AS cierran
FROM feriados GROUP BY tipo ORDER BY 1;
```

### Nota sobre planes que suspenden el servicio

Un `@Scheduled` solo dispara si el proceso está vivo a esa hora. En un plan que suspende el
servicio por inactividad —como el gratuito de Render— la corrida de las 03:00 puede no
ejecutarse.

Es una limitación **del hosting, no del sistema**: el job está implementado para un servicio
que corre de forma continua, que es como va a operar en producción. Mientras tanto, el
endpoint de sincronización manual cubre cualquier urgencia, y el calendario cargado sigue
siendo válido — un feriado que ya estaba sincronizado no deja de estarlo porque el servicio
se haya dormido.
