# Informe final

- [`Informe-Final-Vitalys.pdf`](Informe-Final-Vitalys.pdf): versión de entrega.
- [`Informe-Final-Vitalys.docx`](Informe-Final-Vitalys.docx): la misma versión, editable. Para editarla en Google Docs, subirla a Drive y elegir "Abrir con > Documentos de Google".

Ambos siguen la plantilla de la cátedra ([`fuente/plantilla/plantilla-catedra.docx`](fuente/plantilla/plantilla-catedra.docx)): tamaño carta, carátula con el logo de la UTN, encabezado con logo y "Tecnicatura Universitaria en Programación a Distancia", número de página abajo a la derecha desde el índice, Calibri y tablas con encabezado gris claro. El DOCX se arma sobre esa plantilla; el PDF reproduce el mismo formato desde el HTML.

La fuente es [`fuente/informe.html`](fuente/informe.html). Las imágenes están en `fuente/img/`: los diagramas salen de `fuente/diagramas/*.mmd` y las capturas se tomaron de la aplicación con los datos de `db/dml/seed.sql`.

## Regenerar

Desde la raíz del repositorio, con Google Chrome instalado:

```bash
# Diagramas (Mermaid se descarga de jsDelivr)
python docs/04-informe-final/fuente/render_diagramas.py

# PDF
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --no-pdf-header-footer \
  --print-to-pdf=docs/04-informe-final/Informe-Final-Vitalys.pdf docs/04-informe-final/fuente/informe.html

# DOCX (requiere python-docx y beautifulsoup4)
python docs/04-informe-final/fuente/html_a_docx.py
```
