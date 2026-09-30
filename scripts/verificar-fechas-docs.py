#!/usr/bin/env python3
"""
Verifica que cada fecha citada en la documentación con su día de la semana sea
consistente con el calendario real.

Origen: devolución de la 2.ª entrega (punto 9). Los wireframes W-02 y W-03 mostraban
"lun 28/10/2026" y "MAR 28/10" cuando el 28/10/2026 es miércoles, y "JUE 30/10" cuando
era viernes. Es un error invisible: nadie calcula días de la semana mientras lee.

Detecta dos formas:
    · con año explícito   ->  "lun 28/10/2026", "Miércoles 28/10/2026"
    · sin año             ->  "MAR 27/10"  (toma el último año citado antes en el archivo)

Uso:
    python scripts/verificar-fechas-docs.py

No necesita Docker ni red. Devuelve 0 si está todo bien, 1 si encuentra una fecha que no
cae en el día que dice.
"""

import datetime
import glob
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

# Abreviaturas y nombres completos, como aparecen en los wireframes.
INDICE_DIA = {
    "lun": 0, "lunes": 0,
    "mar": 1, "martes": 1,
    "mie": 2, "mié": 2, "miercoles": 2, "miércoles": 2,
    "jue": 3, "jueves": 3,
    "vie": 4, "viernes": 4,
    "sab": 5, "sáb": 5, "sabado": 5, "sábado": 5,
    "dom": 6, "domingo": 6,
}

NOMBRES = "|".join(sorted(INDICE_DIA, key=len, reverse=True))
CON_ANIO = re.compile(rf"\b({NOMBRES})\.?\s+(\d{{1,2}})/(\d{{1,2}})/(\d{{4}})\b", re.I)
SIN_ANIO = re.compile(rf"\b({NOMBRES})\.?\s+(\d{{1,2}})/(\d{{1,2}})(?!/\d)", re.I)
ANIO_SUELTO = re.compile(r"\b(20\d{2})\b")


def revisar(ruta):
    """Devuelve la lista de inconsistencias encontradas en un archivo."""
    with open(ruta, encoding="utf-8", errors="ignore") as f:
        lineas = f.read().split("\n")

    problemas = []
    anio_vigente = None

    for n, linea in enumerate(lineas, 1):
        # El año más reciente citado sirve de contexto para las fechas sin año.
        anios = ANIO_SUELTO.findall(linea)
        if anios:
            anio_vigente = int(anios[-1])

        encontradas = set()
        for m in CON_ANIO.finditer(linea):
            encontradas.add((m.group(0), m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4))))
        for m in SIN_ANIO.finditer(linea):
            if anio_vigente is None:
                continue
            # Evita contar dos veces lo que ya matcheó con año.
            if any(m.group(0) in t[0] for t in encontradas):
                continue
            encontradas.add((m.group(0), m.group(1), int(m.group(2)), int(m.group(3)), anio_vigente))

        for texto, nombre, dia, mes, anio in encontradas:
            try:
                real = datetime.date(anio, mes, dia).weekday()
            except ValueError:
                problemas.append((n, texto, f"{dia:02d}/{mes:02d}/{anio} no es una fecha válida"))
                continue
            esperado = INDICE_DIA[nombre.lower()]
            if real != esperado:
                problemas.append(
                    (n, texto, f"el {dia:02d}/{mes:02d}/{anio} cae {DIAS[real]}, no {DIAS[esperado]}"))
    return problemas


def main():
    patrones = ["docs/**/*.md", "*.md", "db/**/*.sql"]
    rutas = []
    for p in patrones:
        rutas += glob.glob(os.path.join(RAIZ, p), recursive=True)

    total = 0
    revisados = 0
    for ruta in sorted(set(rutas)):
        revisados += 1
        problemas = revisar(ruta)
        if problemas:
            rel = os.path.relpath(ruta, RAIZ)
            for n, texto, detalle in problemas:
                print(f"{rel}:{n}")
                print(f"    dice : {texto}")
                print(f"    pero : {detalle}")
                total += 1

    print(f"\n{revisados} archivos revisados")
    if total == 0:
        print("Todas las fechas con día de la semana son consistentes.")
        return 0
    print(f"{total} inconsistencias entre el día de la semana y la fecha.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
