import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TurnosListaSkeleton } from "./TurnosListaSkeleton";

describe("TurnosListaSkeleton", () => {
  it("se anuncia como estado con el texto oculto 'Cargando tus turnos…'", () => {
    render(<TurnosListaSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando tus turnos…");
    expect(screen.getByText("Cargando tus turnos…")).toHaveClass("sr-only");
  });

  it("dibuja la cabecera de la tabla y las barras, todas ocultas para el lector", () => {
    const { container } = render(<TurnosListaSkeleton />);
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Servicio")).toBeInTheDocument();
    const barras = container.querySelectorAll(".animate-vt-shimmer");
    expect(barras.length).toBeGreaterThan(20);
    barras.forEach((b) => expect(b).toHaveAttribute("aria-hidden", "true"));
  });
});
