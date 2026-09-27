import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandPanel } from "./BrandPanel";

describe("BrandPanel", () => {
  it("muestra el logo, el titular, la leyenda y el pie del centro", () => {
    render(<BrandPanel />);

    expect(screen.getByText("Vitalys")).toBeInTheDocument();
    expect(
      screen.getByText("Tu salud y tu entrenamiento, en una sola cuenta."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Gimnasio · lun a vie 07–22 · sáb 09–13/)).toBeInTheDocument();
    expect(
      screen.getByText(/Consultorios · Nutrición, Psicología, Kinesiología/),
    ).toBeInTheDocument();
    expect(screen.getByText("Centro de salud Vitalys")).toBeInTheDocument();
  });

  it("está oculto en mobile y visible desde md: (RN de layout, no @media manual)", () => {
    const { container } = render(<BrandPanel />);
    expect(container.firstChild).toHaveClass("hidden", "md:flex");
  });
});
