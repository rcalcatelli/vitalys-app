import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stepper } from "./Stepper";

describe("Stepper", () => {
  it("el primer paso está activo y el segundo todavía no", () => {
    render(<Stepper pasos={["Especialidad", "Horario"]} actual={1} />);
    expect(screen.getByText("1")).toHaveClass("bg-clin");
    expect(screen.getByText("2")).toHaveClass("bg-surface-2");
    expect(screen.getByText("Especialidad").closest("span")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("con el paso 2 alcanzado ambos se pintan activos", () => {
    render(<Stepper pasos={["Especialidad", "Horario"]} actual={2} />);
    expect(screen.getByText("1")).toHaveClass("bg-clin");
    expect(screen.getByText("2")).toHaveClass("bg-clin");
  });
});
