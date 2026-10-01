#!/usr/bin/env python3
"""
Verifica que todo identificador de base de datos citado en la documentación exista
de verdad en el esquema.

Origen: devolución de la 2.ª entrega (punto 8). El README afirmaba que los nombres
estaban unificados, pero el diccionario y las pruebas citaban `chk_baja_logica`,
`chk_periodo_primer_dia` y `trg_disponibilidad_no_overlap`, que no existen — sus
reglas habían quedado absorbidas dentro de otras restricciones, o el nombre real
era distinto. Nadie lo detectó porque no había forma de detectarlo salvo leyendo.

Este script convierte esa revisión manual en una verificación automática: levanta
un PostgreSQL efímero, aplica todas las migraciones, saca del catálogo la lista
real de restricciones, triggers, índices y funciones, y la contrasta contra cada
identificador citado en los .md, los .sql y el código Java.

Uso:
    python scripts/verificar-nombres-db.py

Requiere Docker. Devuelve 0 si está todo bien, 1 si encuentra un nombre fantasma.
"""

import glob
import os
import re
import subprocess
import sys
import time
import uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Prefijos de la convención de nombres del proyecto.
PATRON = re.compile(r"\b((?:chk|trg|fn|uq|idx|excl)_[a-z0-9_]+)\b")

# Archivos que documentan el pasado: citan objetos que después se reemplazaron.
HISTORICOS = {os.path.join("db", "ddl", "vitalys_ddl.sql")}

# Un texto puede mencionar un nombre justamente para decir que NO existe.
# Se marca con este comentario para que la verificación no lo cuente.
MARCA_INEXISTENTE = re.compile(r"[Nn]o existe (?:una|un) `([a-z0-9_]+)`")


def ordenar_por_version(rutas):
    """Flyway ordena por número de versión; un `ls` del shell pondría V10 entre V1 y V2."""
    def clave(r):
        m = re.search(r"V(\d+)__", os.path.basename(r))
        return int(m.group(1)) if m else 0
    return sorted(rutas, key=clave)


def correr(*args, entrada=None):
    return subprocess.run(args, input=entrada, capture_output=True, text=True, encoding="utf-8")


def nombres_reales():
    """Levanta un Postgres efímero, aplica las migraciones y devuelve el catálogo."""
    contenedor = f"vitalys-nombres-{uuid.uuid4().hex[:8]}"
    correr("docker", "run", "-d", "--name", contenedor,
           "-e", "POSTGRES_PASSWORD=verificacion", "-e", "POSTGRES_DB=vitalys",
           "postgres:16-alpine")
    try:
        # No alcanza con pg_isready: durante initdb el servidor acepta conexiones por
        # socket local y enseguida se reinicia, así que un pg_isready exitoso puede ser
        # del arranque temporal y la migración siguiente falla con "the database system
        # is shutting down". Se espera a que una consulta real funcione dos veces
        # seguidas, con una pausa en el medio.
        exitos = 0
        for _ in range(120):
            if correr("docker", "exec", contenedor, "psql", "-U", "postgres",
                      "-d", "vitalys", "-tAc", "SELECT 1").returncode == 0:
                exitos += 1
                if exitos == 2:
                    break
            else:
                exitos = 0
            time.sleep(1)
        else:
            raise RuntimeError("el contenedor de PostgreSQL nunca terminó de arrancar")

        for ruta in ordenar_por_version(glob.glob(os.path.join(RAIZ, "db", "migration", "V*.sql"))):
            with open(ruta, encoding="utf-8") as f:
                r = correr("docker", "exec", "-i", contenedor, "psql",
                           "-v", "ON_ERROR_STOP=1", "-q", "-U", "postgres", "-d", "vitalys",
                           entrada=f.read())
            if r.returncode != 0:
                raise RuntimeError(f"falló {os.path.basename(ruta)}:\n{r.stderr}")

        consulta = """
            SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace
            UNION ALL SELECT tgname FROM pg_trigger WHERE NOT tgisinternal
            UNION ALL SELECT indexname FROM pg_indexes WHERE schemaname='public'
            UNION ALL SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace
        """
        r = correr("docker", "exec", contenedor, "psql", "-U", "postgres", "-d", "vitalys",
                   "-tAc", consulta)
        if r.returncode != 0:
            raise RuntimeError(f"no se pudo leer el catálogo:\n{r.stderr}")
        return {l.strip() for l in r.stdout.splitlines() if l.strip()}
    finally:
        correr("docker", "rm", "-f", contenedor)


def archivos_a_revisar():
    patrones = ["docs/**/*.md", "*.md", "db/**/*.sql", "backend/src/**/*.java"]
    rutas = []
    for p in patrones:
        rutas += glob.glob(os.path.join(RAIZ, p), recursive=True)
    return sorted(set(rutas))


def main():
    print("Levantando PostgreSQL y aplicando las migraciones...")
    try:
        reales = nombres_reales()
    except (RuntimeError, OSError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2
    print(f"  {len(reales)} identificadores en el catálogo\n")

    fantasmas = {}
    citados = set()
    for ruta in archivos_a_revisar():
        rel = os.path.relpath(ruta, RAIZ)
        if rel in HISTORICOS:
            continue
        with open(ruta, encoding="utf-8", errors="ignore") as f:
            texto = f.read()
        declarados_inexistentes = set(MARCA_INEXISTENTE.findall(texto))
        for nombre in set(PATRON.findall(texto)):
            citados.add(nombre)
            if nombre not in reales and nombre not in declarados_inexistentes:
                fantasmas.setdefault(nombre, set()).add(rel)

    print(f"{len(citados)} identificadores citados en la documentación y el código")

    if not fantasmas:
        print("\nTodos existen en el esquema.")
        return 0

    print(f"\n{len(fantasmas)} identificadores citados que NO existen:\n")
    for nombre in sorted(fantasmas):
        print(f"  {nombre}")
        for rel in sorted(fantasmas[nombre]):
            print(f"      {rel}")
    print("\nTomá el nombre real de las migraciones, o escribí "
          '"no existe una `<nombre>`" si la mención es para aclarar que fue absorbida '
          "por otra restricción.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
