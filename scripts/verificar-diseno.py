#!/usr/bin/env python3
"""
Verifica que el mockup exportado de Claude Design no traiga de vuelta elementos que el equipo
sacó a propósito del diseño.

Origen: el "Deshacer" del ingreso al gimnasio se quitó del diseño (PR #27) porque ningún
requerimiento lo pide y no hay endpoint que lo respalde. Una exportación posterior desde Claude
Design lo volvió a traer, junto con textos viejos sobre el bloqueo por cuota vencida. Mientras el
proyecto de Claude Design no esté corregido, cualquier exportación puede reintroducirlos; este
chequeo hace que el CI lo detecte en vez de depender de que alguien lo vea en la revisión.

Uso:
    python scripts/verificar-diseno.py

No necesita Docker ni red. Devuelve 0 si está todo bien, 1 si encuentra algo prohibido.
"""

import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCKUP = os.path.join(RAIZ, "docs", "02-diseno", "design-system", "Vitalys.dc.html")

# (patrón, motivo). Los patrones no distinguen mayúsculas.
PROHIBIDOS = [
    (r"\bDeshacer\b", 'El ingreso al gimnasio no tiene "Deshacer": ver design-system/README.md'),
    (r"\bundo\s*:", 'Lógica del "Deshacer" del ingreso (r.undo)'),
    (r"a los 10 d[ií]as se bloquea", "Regla vieja: el bloqueo es por umbral de períodos impagos (RN-01)"),
    (r"se bloquea en \S+ d[ií]as", "Regla vieja: el bloqueo es por umbral de períodos impagos (RN-01)"),
]


def main() -> int:
    with open(MOCKUP, encoding="utf-8") as f:
        lineas = f.read().splitlines()
    errores = []
    for numero, linea in enumerate(lineas, start=1):
        for patron, motivo in PROHIBIDOS:
            if re.search(patron, linea, re.I):
                errores.append(f"  Vitalys.dc.html:{numero}: {motivo}")
    if errores:
        print("El mockup exportado trae elementos que se sacaron del diseño:")
        print("\n".join(errores))
        print("\nCorregilo también en el proyecto de Claude Design, o la próxima exportación los vuelve a traer.")
        return 1
    print("El mockup no trae elementos retirados del diseño.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
