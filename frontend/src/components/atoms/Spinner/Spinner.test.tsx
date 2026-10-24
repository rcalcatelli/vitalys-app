import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it.each([
    ["sm", "size-4"],
    ["md", "size-6"],
    ["lg", "size-8"],
  ] as const)("tamaño %s", (tamano, clase) => {
    render(<Spinner tamano={tamano} />);
    expect(screen.getByTestId("spinner")).toHaveClass(clase);
  });

  it("es decorativo por defecto: aria-hidden y sin rol de estado", () => {
    render(<Spinner />);
    expect(screen.getByTestId("spinner")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("gira y, con reduce-motion, late en lugar de girar", () => {
    render(<Spinner />);
    expect(screen.getByTestId("spinner")).toHaveClass(
      "animate-vt-spin",
      "motion-reduce:animate-vt-pulse",
    );
  });

  it("trazo teal por defecto y color del texto sobre un fondo de color", () => {
    const { rerender } = render(<Spinner />);
    expect(screen.getByTestId("spinner")).toHaveClass("border-t-clin");
    rerender(<Spinner sobreColor />);
    expect(screen.getByTestId("spinner")).toHaveClass("border-t-current");
  });

  it("solo, sin texto: se anuncia con role=status y 'Cargando' oculto", () => {
    render(<Spinner anunciar />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(screen.getByText("Cargando")).toHaveClass("sr-only");
  });
});
