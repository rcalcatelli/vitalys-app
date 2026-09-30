#!/usr/bin/env python3
"""
Verifica que toda ruta de la API citada en la definición de pruebas esté declarada en el
documento de módulos.

Origen: devolución de la 2.ª entrega (punto 11). La prueba PI-06 usaba
`GET /api/admin/personas`, una ruta de administración de personas que no figura en
`modulos.md`. El caso pasaba igual —el filtro de seguridad rechaza por prefijo antes de
resolver el controller—, así que daba verde sin demostrar nada.

Uso:
    python scripts/verificar-rutas-docs.py

No necesita Docker ni red. Devuelve 0 si está todo bien, 1 si encuentra una ruta huérfana.
"""

import glob
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODULOS = os.path.join(RAIZ, "docs", "02-diseno", "modulos.md")
FUENTES = ["docs/metodologia/definicion-pruebas.md"]

METODOS = "GET|POST|PUT|PATCH|DELETE"

# Fila de tabla de endpoints: | POST | `/api/...` | descripción | roles |
DECLARACION = re.compile(rf"^\|\s*({METODOS})\s*\|\s*`([^`]+)`", re.M)
# Mención en las pruebas: "POST /api/auth/login" o "POST `/api/auth/login`"
MENCION = re.compile(rf"\b({METODOS})\s+`?(/api/[A-Za-z0-9/{{}}_.*-]+)")

# Un texto puede citar una ruta justamente para decir que NO existe — por ejemplo al
# documentar por qué se corrigió una prueba. Se marca con esa frase en la misma línea
# para que la verificación no la cuente.
NEGACION = re.compile(r"que no existe")


def a_regex(ruta):
    """Convierte `/api/personas/{id}` en un patrón, y `/api/admin/**` en un prefijo."""
    if ruta.endswith("/**"):
        return "^" + re.escape(ruta[:-3]) + "(/.*)?$"
    partes = [r"[^/]+" if p.startswith("{") and p.endswith("}") else re.escape(p)
              for p in ruta.split("/")]
    return "^" + "/".join(partes) + "$"


def main():
    with open(MODULOS, encoding="utf-8") as f:
        texto = f.read()

    declaradas = [(m.group(1), m.group(2).split("?")[0]) for m in DECLARACION.finditer(texto)]
    print(f"{len(declaradas)} rutas declaradas en {os.path.relpath(MODULOS, RAIZ)}")

    def declarada(metodo, ruta):
        for dm, dr in declaradas:
            # Un prefijo con ** cubre cualquier método.
            if dr.endswith("/**") and re.match(a_regex(dr), ruta):
                return True
            if dm == metodo and re.match(a_regex(dr), ruta):
                return True
        return False

    huerfanas = {}
    total = 0
    for patron in FUENTES:
        for ruta_archivo in glob.glob(os.path.join(RAIZ, patron), recursive=True):
            rel = os.path.relpath(ruta_archivo, RAIZ)
            with open(ruta_archivo, encoding="utf-8") as f:
                lineas = f.read().split("\n")
            for n, linea in enumerate(lineas, 1):
                negada = NEGACION.search(linea) is not None
                for m in MENCION.finditer(linea):
                    metodo, ruta = m.group(1), m.group(2).split("?")[0]
                    total += 1
                    if not declarada(metodo, ruta) and not negada:
                        huerfanas.setdefault((metodo, ruta), []).append(f"{rel}:{n}")

    print(f"{total} menciones de rutas revisadas\n")

    if not huerfanas:
        print("Todas las rutas citadas en las pruebas están declaradas en modulos.md.")
        return 0

    print(f"{len(huerfanas)} rutas citadas que NO están declaradas:\n")
    for (metodo, ruta), ubicaciones in sorted(huerfanas.items()):
        print(f"  {metodo} {ruta}")
        for u in ubicaciones:
            print(f"      {u}")
    print("\nDeclarala en modulos.md, o corregí la prueba para que apunte a una ruta real. "
          "Una prueba contra una ruta inexistente puede pasar sin probar nada.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
