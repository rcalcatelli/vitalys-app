"""
Renderiza los diagramas Mermaid de diagramas/*.mmd a PNG en img/, con Chrome headless.

Uso (desde la raíz del repo):
    python docs/04-informe-final/fuente/render_diagramas.py

Necesita Google Chrome instalado y conexión a internet (Mermaid se carga desde jsDelivr).
"""

import html
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops

AQUI = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
ANCHO = {"01-er": 2800, "02-estados": 1300, "03-arquitectura": 1400, "04-reserva-gym": 2200, "05-operar-como": 2200}

PLANTILLA = """<!doctype html><html><head><meta charset="utf-8">
<style>body{{margin:0;background:#fff;font-family:arial}} #d{{padding:24px;width:{ancho}px}}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
</head><body><div id="d"><pre class="mermaid">{codigo}</pre></div>
<script>
{config}
mermaid.initialize({{startOnLoad:true, theme:"base", securityLevel:"loose",
  themeVariables:{{fontFamily:"Arial, Helvetica, sans-serif", fontSize:"15px",
  primaryColor:"#e8f1fb", primaryBorderColor:"#1f4e79", primaryTextColor:"#1a1a1a",
  lineColor:"#3c3c3c", secondaryColor:"#f3f6f9", tertiaryColor:"#ffffff",
  noteBkgColor:"#fff7e0", noteBorderColor:"#c9a227", actorBkg:"#e8f1fb", actorBorder:"#1f4e79"}},
  er:{{useMaxWidth:false}}, flowchart:{{useMaxWidth:false}}, sequence:{{useMaxWidth:false}},
  state:{{useMaxWidth:false}}}});
{fin}
</script></body></html>"""


def recortar(ruta):
    img = Image.open(ruta).convert("RGB")
    fondo = Image.new("RGB", img.size, (255, 255, 255))
    caja = ImageChops.difference(img, fondo).getbbox()
    if caja:
        margen = 20
        caja = (max(caja[0] - margen, 0), max(caja[1] - margen, 0),
                min(caja[2] + margen, img.width), min(caja[3] + margen, img.height))
        img = img.crop(caja)
    img.save(ruta, optimize=True)


def main():
    carpeta = os.path.join(AQUI, "diagramas")
    salida = os.path.join(AQUI, "img")
    os.makedirs(salida, exist_ok=True)
    for nombre in sorted(os.listdir(carpeta)):
        if not nombre.endswith(".mmd"):
            continue
        base = nombre[:-4]
        with open(os.path.join(carpeta, nombre), encoding="utf-8") as f:
            codigo = html.escape(f.read())
        ancho = ANCHO.get(base, 1300)
        with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
            # Un .mmd que trae su propia directiva %%{init}%% usa el tema por defecto de Mermaid.
            propio = codigo.lstrip().startswith("%%{init")
            tmp.write(PLANTILLA.format(codigo=codigo, ancho=ancho,
                                       config="if (false) {" if propio else "",
                                       fin="} else { mermaid.initialize({startOnLoad:true, flowchart:{useMaxWidth:false}, sequence:{useMaxWidth:false}}); }" if propio else ""))
        png = os.path.join(salida, f"diagrama-{base}.png")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=2", f"--window-size={ancho + 60},3200",
                        "--virtual-time-budget=15000", f"--screenshot={png}",
                        "file:///" + tmp.name.replace("\\", "/")],
                       check=True, capture_output=True)
        os.unlink(tmp.name)
        recortar(png)
        print("OK", png)


if __name__ == "__main__":
    sys.exit(main())
