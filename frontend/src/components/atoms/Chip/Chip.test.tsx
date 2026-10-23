import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it.each([
    ["ok", "bg-ok-soft"],
    ["warn", "bg-warn-soft"],
    ["bad", "bg-bad-soft"],
    ["clin", "bg-clin-soft"],
    ["gym", "bg-gym-soft"],
    ["neutral", "bg-surface-2"],
  ] as const)("tono %s", (tone, clase) => {
    render(<Chip tone={tone}>Texto</Chip>);
    expect(screen.getByText("Texto")).toHaveClass(clase);
  });

  it("es neutro por defecto y sin punto", () => {
    const { container } = render(<Chip>Sin punto</Chip>);
    expect(screen.getByText("Sin punto")).toHaveClass("bg-surface-2");
    expect(container.querySelector("span span")).toBeNull();
  });

  it("dibuja el punto cuando se pide", () => {
    const { container } = render(<Chip dot>Con punto</Chip>);
    expect(container.querySelector("span span")).toHaveClass("bg-current");
  });

  it.each([
    ["md", "h-6"],
    ["sm", "py-[3px]"],
    ["lg", "text-caption"],
    ["etiqueta", "rounded-sm"],
  ] as const)("tamaño %s", (tamano, clase) => {
    render(<Chip tamano={tamano}>Texto</Chip>);
    expect(screen.getByText("Texto")).toHaveClass(clase);
  });
});
