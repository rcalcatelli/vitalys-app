import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("muestra el wordmark 'Vitalys'", () => {
    render(<Logo />);
    expect(screen.getByText("Vitalys")).toBeInTheDocument();
  });

  it("variant brand usa texto blanco fijo (panel de marca)", () => {
    render(<Logo variant="brand" size="lg" />);
    expect(screen.getByText("Vitalys")).toHaveClass("text-white");
  });

  it("variant surface (default) usa el color de texto del tema", () => {
    render(<Logo />);
    expect(screen.getByText("Vitalys")).toHaveClass("text-ink");
  });
});
