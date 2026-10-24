import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonasTableSkeleton } from "./PersonasTableSkeleton";

describe("PersonasTableSkeleton", () => {
  it("se anuncia como estado con el texto oculto 'Cargando personas…'", () => {
    render(<PersonasTableSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando personas…");
    expect(screen.getByText("Cargando personas…")).toHaveClass("sr-only");
  });

  it("dibuja la cabecera de la tabla y las barras de las filas", () => {
    const { container } = render(<PersonasTableSkeleton />);
    for (const h of ["Nombre", "DNI", "Servicios", "Cuota"]) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
    expect(container.querySelectorAll(".animate-vt-shimmer").length).toBeGreaterThan(30);
  });
});
