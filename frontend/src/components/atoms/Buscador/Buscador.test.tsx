import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Buscador } from "./Buscador";

describe("Buscador", () => {
  it("entrega el texto ya desempaquetado", async () => {
    const onChange = vi.fn();
    render(<Buscador aria-label="Buscar" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Buscar"), "ab");
    expect(onChange).toHaveBeenLastCalledWith("ab");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("usa clin y 44px por defecto", () => {
    render(<Buscador aria-label="Buscar" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Buscar")).toHaveClass("h-11", "focus:border-clin");
  });

  it("acepta el acento de gimnasio y la altura de Ingreso", () => {
    render(<Buscador aria-label="Buscar" onChange={vi.fn()} acento="gym" alto="lg" />);
    expect(screen.getByLabelText("Buscar")).toHaveClass("h-[46px]", "focus:border-gym");
  });
});
