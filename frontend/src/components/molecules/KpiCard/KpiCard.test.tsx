import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("muestra etiqueta, valor y detalle", () => {
    render(<KpiCard etiqueta="Consultas hoy" valor={7} detalle="en consultorio" tono="clin" />);
    expect(screen.getByText("Consultas hoy")).toBeInTheDocument();
    expect(screen.getByText("7")).toHaveClass("text-ink");
    expect(screen.getByText("en consultorio")).toBeInTheDocument();
  });

  it("pinta el número con el tono cuando valorTonal", () => {
    render(<KpiCard etiqueta="Impagos" valor={3} tono="bad" valorTonal />);
    expect(screen.getByText("3")).toHaveClass("text-bad-ink");
  });

  it("el detalle es opcional", () => {
    render(<KpiCard etiqueta="X" valor="-" />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
