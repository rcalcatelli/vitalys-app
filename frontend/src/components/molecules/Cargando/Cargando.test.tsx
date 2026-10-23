import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cargando } from "./Cargando";

describe("Cargando", () => {
  it("sección: role=status, aria-live polite, spinner md y el texto visible", () => {
    render(<Cargando texto="Cargando agenda…" />);
    const estado = screen.getByRole("status");
    expect(estado).toHaveAttribute("aria-live", "polite");
    expect(estado).toHaveTextContent("Cargando agenda…");
    expect(estado).toHaveStyle({ minHeight: "120px" });
    expect(screen.getByTestId("spinner")).toHaveClass("size-6");
  });

  it("sección: respeta el alto mínimo pedido", () => {
    render(<Cargando altoMin={220} />);
    expect(screen.getByRole("status")).toHaveStyle({ minHeight: "220px" });
  });

  it("el texto por defecto es 'Cargando…'", () => {
    render(<Cargando />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
  });

  it("pantalla: spinner lg centrado en el área de contenido", () => {
    render(<Cargando variante="pantalla" />);
    expect(screen.getByRole("status")).toHaveClass("min-h-[calc(100vh-180px)]");
    expect(screen.getByTestId("spinner")).toHaveClass("size-8");
  });

  it("línea: spinner sm junto al texto, sin tarjeta", () => {
    render(<Cargando variante="linea" texto="Cargando cuota…" />);
    expect(screen.getByRole("status")).not.toHaveClass("border");
    expect(screen.getByTestId("spinner")).toHaveClass("size-4");
  });
});
