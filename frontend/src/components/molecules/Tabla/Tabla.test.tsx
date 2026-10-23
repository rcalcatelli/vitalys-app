import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilaTabla, Tabla } from "./Tabla";

describe("Tabla", () => {
  it("renderiza cabecera y filas con la misma grilla", () => {
    render(
      <Tabla columnas="1fr 100px" encabezados={["Persona", "Estado"]} etiqueta="Personas">
        <FilaTabla columnas="1fr 100px">
          <span>Ana</span>
          <span>Al día</span>
        </FilaTabla>
      </Tabla>,
    );
    const tabla = screen.getByRole("table", { name: "Personas" });
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Persona", "Estado"]);
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(2);
    expect(filas[1]).toHaveStyle({ gridTemplateColumns: "1fr 100px" });
    expect(within(filas[1]).getByText("Ana")).toBeInTheDocument();
  });
});
