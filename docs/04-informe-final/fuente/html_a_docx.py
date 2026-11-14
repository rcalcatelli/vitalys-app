"""
Genera Informe-Final-Vitalys.docx a partir de informe.html, sobre la plantilla de la cátedra
(plantilla/plantilla-catedra.docx): conserva su carátula, encabezado, pie con número de página y
estilos, y reemplaza el cuerpo por el contenido del informe.

Uso (desde la raíz del repo):
    python docs/04-informe-final/fuente/html_a_docx.py

Necesita python-docx y beautifulsoup4. Cubre solo las etiquetas que usa el informe.
"""

import copy
import os
import re

from bs4 import BeautifulSoup, NavigableString
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Pt

AQUI = os.path.dirname(os.path.abspath(__file__))
PLANTILLA = os.path.join(AQUI, "plantilla", "plantilla-catedra.docx")
SALIDA = os.path.join(os.path.dirname(AQUI), "Informe-Final-Vitalys.docx")
ANCHO_DXA = 9360  # ancho útil de la plantilla (carta con márgenes de 2,54 cm)
ANCHO_UTIL = Cm(16.5)

# Listas de la plantilla (numbering.xml): numId 2 = viñetas; numId 3 y 4 = numeradas "1."
NUM_VINETA = 2
NUMERADAS = iter([3, 4])

# Bordes y márgenes de las tablas de la plantilla
TBL_PR = (
    '<w:tblPr %s><w:tblW w:w="%d" w:type="dxa"/><w:tblBorders>'
    '<w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
    '<w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
    '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
    '<w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
    '<w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
    '<w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
    '</w:tblBorders><w:tblLayout w:type="fixed"/>'
    '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>'
    '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
    "</w:tblPr>"
)


def sombrear(celda, color):
    tc_pr = celda._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tc_pr.append(shd)


def hipervinculo(parrafo, url, texto, tam=None):
    rel = parrafo.part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    h = OxmlElement("w:hyperlink")
    h.set(qn("r:id"), rel)
    r = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    if tam:
        sz = OxmlElement("w:sz")
        sz.set(qn("w:val"), str(int(tam * 2)))
        rpr.append(sz)
    r.append(rpr)
    t = OxmlElement("w:t")
    t.text = texto
    t.set(qn("xml:space"), "preserve")
    r.append(t)
    h.append(r)
    parrafo._p.append(h)


def en_linea(parrafo, nodo, negrita=False, cursiva=False, codigo=False, resaltado=False, tam=None):
    for hijo in nodo.children:
        if isinstance(hijo, NavigableString):
            texto = re.sub(r"\s+", " ", str(hijo))
            if not texto.strip() and not parrafo.runs:
                continue
            run = parrafo.add_run(texto)
            run.bold = negrita or None
            run.italic = cursiva or None
            if tam:
                run.font.size = Pt(tam)
            if codigo:
                run.font.name = "Consolas"
                run.font.size = Pt(min(tam or 11, 9))
            if resaltado:
                run.font.highlight_color = WD_COLOR_INDEX.YELLOW
            continue
        nombre = hijo.name
        if nombre == "br":
            parrafo.add_run().add_break()
        elif nombre in ("b", "strong"):
            en_linea(parrafo, hijo, True, cursiva, codigo, resaltado, tam)
        elif nombre in ("i", "em"):
            en_linea(parrafo, hijo, negrita, True, codigo, resaltado, tam)
        elif nombre == "code":
            en_linea(parrafo, hijo, negrita, cursiva, True, resaltado, tam)
        elif nombre == "a" and hijo.get("href", "").startswith("http"):
            hipervinculo(parrafo, hijo["href"], hijo.get_text(), tam)
        elif nombre == "span" and "pendiente" in (hijo.get("class") or []):
            en_linea(parrafo, hijo, negrita, cursiva, codigo, True, tam)
        else:
            en_linea(parrafo, hijo, negrita, cursiva, codigo, resaltado, tam)


def parrafo_normal(doc, justificado=True, despues=6):
    p = doc.add_paragraph()
    if justificado:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(despues)
    return p


def tabla(doc, nodo):
    filas = nodo.find_all("tr")
    columnas = max(len(f.find_all(["td", "th"])) for f in filas)
    anchos = []
    for celda in filas[0].find_all(["td", "th"]):
        estilo = celda.get("style", "")
        anchos.append(float(estilo.split("width:")[1].split("%")[0]) if "width:" in estilo else None)
    resto = 100 - sum(a for a in anchos if a)
    libres = sum(1 for a in anchos if not a) or 1
    anchos = [a if a else resto / libres for a in anchos]
    dxa = [int(ANCHO_DXA * a / 100) for a in anchos]
    dxa[-1] = ANCHO_DXA - sum(dxa[:-1])

    t = doc.add_table(rows=0, cols=columnas)
    tbl = t._tbl
    tbl.remove(tbl.tblPr)
    tbl.insert(0, parse_xml(TBL_PR % (nsdecls("w"), ANCHO_DXA)))
    for grid, ancho in zip(tbl.tblGrid.findall(qn("w:gridCol")), dxa):
        grid.set(qn("w:w"), str(ancho))
    for i, fila in enumerate(filas):
        celdas = fila.find_all(["td", "th"])
        row = t.add_row()
        encabezado = celdas[0].name == "th"
        if encabezado:
            tr_pr = row._tr.get_or_add_trPr()
            for tag in ("w:tblHeader", "w:cantSplit"):
                el = OxmlElement(tag)
                tr_pr.append(el)
        else:
            row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
        for j, c in enumerate(celdas):
            cell = row.cells[j]
            cell.width = Cm(dxa[j] / 567)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.space_before = Pt(1)
            if encabezado:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                sombrear(cell, "F2F2F2")
                p.paragraph_format.keep_with_next = True
            en_linea(p, c, negrita=encabezado, tam=9)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def figura(doc, nodo):
    img = nodo.find("img")
    ruta = os.path.join(AQUI, img["src"])
    ancho = ANCHO_UTIL
    estilo = img.get("style", "")
    if "max-width:" in estilo:
        ancho = int(ANCHO_UTIL * float(estilo.split("max-width:")[1].split("%")[0]) / 100)
    if "captura-socio-inicio-movil" in ruta:
        ancho = Cm(5.5)
    elif "captura-" in ruta:
        ancho = Cm(15)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_after = Pt(4)
    p.add_run().add_picture(ruta, width=ancho)
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(8)
    en_linea(cap, nodo.find("figcaption"), cursiva=True, tam=9)


def lista(doc, nodo, numerada):
    num_id = next(NUMERADAS) if numerada else NUM_VINETA
    for li in nodo.find_all("li", recursive=False):
        p = doc.add_paragraph(style="List Paragraph")
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(3)
        num_pr = p._p.get_or_add_pPr().get_or_add_numPr()
        num_pr.get_or_add_ilvl().val = 0
        num_pr.get_or_add_numId().val = num_id
        en_linea(p, li)


def indice(doc, nodo):
    titulo = doc.add_paragraph()
    titulo.paragraph_format.space_after = Pt(6)
    run = titulo.add_run(nodo.find(class_="titulo-indice").get_text())
    run.bold = True
    run.font.size = Pt(14)
    for item in nodo.find_all("p"):
        p = doc.add_paragraph(item.get_text())
        p.paragraph_format.left_indent = Cm(0.635)
        p.paragraph_format.space_after = Pt(3)
    doc.add_paragraph().paragraph_format.space_after = Pt(12)


def bloque(doc, nodo):
    for hijo in nodo.children:
        if isinstance(hijo, NavigableString):
            continue
        n = hijo.name
        if n == "h1":
            doc.add_heading(hijo.get_text(), level=1)
        elif n == "h2":
            doc.add_heading(hijo.get_text(), level=2)
        elif n == "h3":
            p = parrafo_normal(doc, despues=4)
            p.paragraph_format.keep_with_next = True
            p.add_run(hijo.get_text()).bold = True
        elif n == "p" or (n == "div" and "nota" in (hijo.get("class") or [])):
            en_linea(parrafo_normal(doc), hijo)
        elif n == "ul":
            lista(doc, hijo, False)
        elif n == "ol":
            lista(doc, hijo, True)
        elif n == "table":
            tabla(doc, hijo)
        elif n == "figure":
            figura(doc, hijo)
        elif n == "section" and "indice" in (hijo.get("class") or []):
            indice(doc, hijo)
        elif n in ("section", "div"):
            bloque(doc, hijo)


def caratula(doc, soup):
    """Ajusta los datos variables de la carátula de la plantilla sin tocar su formato."""
    portada = soup.find("section", class_="portada")
    subtitulo = portada.find(class_="subtitulo").get_text(" ").replace("  ", " ").strip()
    grupo = next(d.get_text() for d in portada.find_all(class_="dato") if d.get_text().startswith("Grupo"))
    for p in doc.paragraphs[:14]:
        if p.text.startswith("Plataforma integral"):
            p.runs[0].text = subtitulo
            for r in p.runs[1:]:
                r.text = ""
        elif p.text.startswith("Grupo N."):
            p.runs[0].text = "Grupo N.º: "
            p.runs[1].text = grupo.split(":", 1)[1].strip()
            p.runs[1].bold = True
            p.runs[1].font.highlight_color = None


def vaciar_cuerpo(doc):
    """Borra todo lo que sigue a la carátula, salvo la sección final (encabezado y pie)."""
    body = doc.element.body
    hijos = list(body)
    fin_caratula = next(i for i, el in enumerate(hijos) if el.tag == qn("w:p") and el.find(".//" + qn("w:sectPr")) is not None)
    for el in hijos[fin_caratula + 1:]:
        if el.tag != qn("w:sectPr"):
            body.remove(el)


def main():
    with open(os.path.join(AQUI, "informe.html"), encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    doc = Document(PLANTILLA)
    caratula(doc, soup)
    vaciar_cuerpo(doc)
    cuerpo = soup.body
    for hijo in list(cuerpo.children):
        if isinstance(hijo, NavigableString) or (hijo.name == "section" and "portada" in hijo.get("class", [])):
            continue
        envoltorio = BeautifulSoup("<div></div>", "html.parser").div
        envoltorio.append(copy.copy(hijo))
        bloque(doc, envoltorio)
    # Las imágenes del contenido original de la plantilla ya no se referencian: se quitan del paquete.
    xml = doc.element.xml
    for rid, rel in list(doc.part.rels.items()):
        if rel.reltype.endswith("/image") and f'"{rid}"' not in xml:
            doc.part.drop_rel(rid)
    doc.core_properties.title = "Proyecto Final — Vitalys App"
    doc.save(SALIDA)
    print("OK", SALIDA)


if __name__ == "__main__":
    main()
