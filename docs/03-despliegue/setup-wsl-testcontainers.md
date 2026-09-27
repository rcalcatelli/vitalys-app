# Correr los tests de integración en Windows (WSL + Testcontainers)

> Guía de entorno de desarrollo. No es parte del despliegue productivo.
> Aplica a quien trabaje en Windows con Docker Desktop.

## 1. El problema

Los tests de integración (`*IT.java`) usan **Testcontainers**, que levanta un
PostgreSQL real en un contenedor. Para eso necesita hablar con el daemon de Docker
por HTTP.

En Windows con **Docker Desktop 4.75 y backend WSL2**, la librería `docker-java`
que usa Testcontainers no logra comunicarse con el daemon a través de los named
pipes, aunque el CLI de Docker sí lo haga.

Síntoma:

```
mvn test     -> BUILD SUCCESS (11 tests unitarios)
mvn verify   -> BUILD FAILURE
                IllegalStateException: Could not find a valid Docker environment
```

El gate de cobertura de JaCoCo (0.90) nunca llega a ejecutarse, así que la
cobertura queda **sin medir**, no reprobada.

## 2. Qué NO es (descartado con evidencia)

Antes de perder tiempo repitiendo estas pruebas:

| Hipótesis | Cómo se descartó |
|-----------|------------------|
| Docker no está corriendo | `docker ps` y `docker info` funcionan; `ServerVersion 29.5.2` |
| Pipe equivocado | `docker_engine`, `dockerDesktopLinuxEngine` y `docker_cli` devuelven el mismo stub vacío con HTTP 400 |
| `DOCKER_HOST` no llega al JVM | Con la variable puesta, Testcontainers sí ejecuta `EnvironmentAndSystemPropertyClientProviderStrategy` |
| Versión de API incompatible | Forzando `DOCKER_API_VERSION=1.44` y `=1.54` falla igual. Server API 1.54, mínimo 1.40 |
| Versión vieja de Testcontainers | 1.20.6 y 1.21.3 fallan idéntico |
| Política corporativa de Docker | No existe `admin-settings.json` |
| Pipes bloqueados por Docker Desktop | `docker --host npipe:////./pipe/docker_engine info` responde `29.5.2` correctamente |

La última fila es la clave: **los pipes están abiertos**. El CLI entra sin problema
por el mismo pipe donde `docker-java` recibe un objeto vacío. Es una
incompatibilidad de la librería, no de la configuración ni del código del proyecto.

**No intentar** exponer el daemon en `tcp://localhost:2375` sin TLS. Eso deja el
daemon de Docker accesible a cualquier proceso local sin autenticación, y no es
necesario.

## 3. La solución: una distro WSL propia

Dentro de Linux, Testcontainers usa el socket Unix nativo y el problema desaparece.

### Paso 1 — Instalar Ubuntu

Desde **PowerShell o CMD** (no desde un agente ni un script: el instalador pide
usuario y contraseña de forma interactiva):

```powershell
wsl --install -d Ubuntu-24.04
```

Al terminar te pide crear un usuario UNIX y su contraseña.

> Se recomienda **24.04 LTS**: la integración con Docker Desktop está más probada
> que en 26.04.

### Paso 2 — Activar la integración en Docker Desktop

`Docker Desktop` → `Settings` → **`Resources`** → **`WSL Integration`** →
tildar `Ubuntu-24.04` → `Apply & Restart`.

> Es **Resources → WSL Integration**, no `Advanced`. En `Advanced` solo hay CPU,
> memoria y disco.

Verificar desde Ubuntu:

```bash
docker info --format '{{.ServerVersion}}'
```

Si devuelve la versión, la integración quedó activa.

### Paso 3 — Instalar el toolchain

La distro viene sin Java ni Maven:

```bash
sudo apt update && sudo apt install -y openjdk-17-jdk maven
java -version    # debe decir 17, no 21
```

> En Windows podés tener JDK 21 en el `PATH`. Dentro de Ubuntu usamos **17**,
> que es lo que declara el `pom.xml`. No mezclar.

### Paso 4 — Correr los tests

```bash
cd /mnt/c/Users/<usuario>/Desktop/TuP/Trabajo\ Final/vitalys-app/backend
mvn verify
```

Debe levantar un PostgreSQL real, correr los 6 `*IT.java` y ejecutar el gate de
JaCoCo.

## 4. Si WSL queda trabado

Si lanzaste `wsl --install` desde un proceso que no puede recibir input (un script,
una tarea en background, un agente), el instalador queda esperando el usuario para
siempre y **bloquea todo el subsistema WSL**: cualquier comando `wsl` posterior se
cuelga, incluido `wsl --terminate`.

Desde una terminal nueva:

```powershell
wsl --shutdown
```

Apaga todas las instancias, incluida la trabada. Después:

```powershell
wsl -d Ubuntu-24.04
```

Ahora sí pide usuario y contraseña de forma interactiva.

> `wsl --shutdown` también apaga la distro interna `docker-desktop`, así que
> **Docker Desktop se reinicia** y los contenedores que tengas corriendo se frenan.
> Vuelven a levantar solos.

`--shutdown` y `--terminate` NO borran nada. El comando destructivo es
`wsl --unregister`, que elimina la distro y todos sus datos: no usarlo por error.

## 5. Nota de rendimiento

Trabajar sobre `/mnt/c/...` desde WSL2 pasa por una capa de traducción y es
**notablemente más lento**. Para una corrida puntual se tolera; si vas a trabajar
seguido desde Linux, cloná el repositorio dentro del sistema de archivos de la
distro (`~/vitalys-app`) en vez de usar el disco de Windows.

## 6. Alternativa sin configurar nada

El workflow `.github/workflows/backend-ci.yml` corre en `ubuntu-latest`, donde
Docker es nativo y nada de esto aplica. Un `push` alcanza para que el CI ejecute
los tests de integración y mida el gate de cobertura.

Configurar WSL sirve para tener feedback local rápido. Para saber si la cobertura
cumple el 0.90, el CI ya es suficiente.
