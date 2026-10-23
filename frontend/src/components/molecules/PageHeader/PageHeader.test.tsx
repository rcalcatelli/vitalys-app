import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("muestra eyebrow, título, subtítulo y acciones", () => {
    render(
      <PageHeader
        eyebrow="Recepción"
        titulo="Personas"
        subtitulo="Socios y pacientes del centro."
        acciones={<button type="button">Nueva</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Personas" })).toBeInTheDocument();
    expect(screen.getByText("Recepción")).toBeInTheDocument();
    expect(screen.getByText("Socios y pacientes del centro.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva" })).toBeInTheDocument();
  });

  it("omite eyebrow y subtítulo cuando no se pasan", () => {
    render(<PageHeader titulo="Solo título" />);
    expect(screen.getByRole("heading", { name: "Solo título" })).toBeInTheDocument();
    expect(screen.queryByText("Recepción")).not.toBeInTheDocument();
  });
});
