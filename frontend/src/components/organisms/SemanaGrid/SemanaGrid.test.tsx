import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SemanaGrid } from "./SemanaGrid";

describe("SemanaGrid", () => {
  it("dibuja un bloque por franja en la columna de su día, con la posición proporcional a la hora", () => {
    render(
      <SemanaGrid
        filas={[
          { clave: "a", diaSemana: 1, horaInicio: "09:00", horaFin: "12:00" },
          { clave: "b", diaSemana: 2, horaInicio: "07:00", horaFin: "08:00" },
          { clave: "c", diaSemana: 2, horaInicio: "10:00", horaFin: "09:00" },
        ]}
        errores={{}}
        duracionTurnoMinutos={30}
      />,
    );

    expect(screen.getByText("Consultas de 30 min")).toBeInTheDocument();
    const lunes = within(screen.getByTestId("dia-1")).getByTestId("bloque");
    expect(lunes).toHaveTextContent("09:0012:00");
    expect(lunes).toHaveStyle({ top: "60px", height: "90px" });
    // La franja invertida (fin <= inicio) no se dibuja.
    expect(within(screen.getByTestId("dia-2")).getAllByTestId("bloque")).toHaveLength(1);
  });

  it("marca en rojo las franjas con error y suma el domingo si hay una franja ese día", () => {
    render(
      <SemanaGrid
        filas={[{ clave: "a", diaSemana: 7, horaInicio: "09:00", horaFin: "10:00" }]}
        errores={{ a: "x" }}
        duracionTurnoMinutos={45}
      />,
    );

    expect(within(screen.getByTestId("dia-7")).getByTestId("bloque")).toHaveClass("border-bad");
  });
});
