import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstadoChip } from "./EstadoChip";

describe("EstadoChip", () => {
  it.each([
    ["RESERVADO", "Reservado", "bg-clin-soft"],
    ["COMPLETADO", "Completado", "bg-ok-soft"],
    ["AUSENTE", "Ausente", "bg-bad-soft"],
    ["CANCELADO_EN_TIEMPO", "Cancelado en término", "bg-surface-2"],
    ["CANCELADO_TARDE", "Cancelado fuera de término", "bg-warn-soft"],
    ["CANCELADO_POR_PROFESIONAL", "Cancelado por el centro", "bg-surface-2"],
  ] as const)("%s se lee con su texto y tono", (estado, texto, clase) => {
    render(<EstadoChip estado={estado} />);
    expect(screen.getByText(texto)).toHaveClass(clase);
  });

  it("en vista de profesional COMPLETADO se lee Atendido", () => {
    render(<EstadoChip estado="COMPLETADO" vistaProfesional />);
    expect(screen.getByText("Atendido")).toBeInTheDocument();
  });
});
