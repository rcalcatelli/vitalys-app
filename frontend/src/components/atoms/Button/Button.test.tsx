import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza los children y dispara onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button type="button" onClick={onClick}>
        INGRESAR
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "INGRESAR" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("respeta disabled: no dispara onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button type="button" onClick={onClick} disabled>
        Creando cuenta…
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Creando cuenta…" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("acepta variant ghost para acciones secundarias", () => {
    render(
      <Button type="button" variant="ghost" aria-label="Mostrar contraseña">
        👁
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeInTheDocument();
  });

  it("acepta variant outline para acciones secundarias con borde (p.ej. toggle de tema)", () => {
    render(
      <Button type="button" variant="outline">
        Modo oscuro
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Modo oscuro" })).toHaveClass("border-border");
  });

  it("acepta variant bad para acciones destructivas", () => {
    render(
      <Button type="button" variant="bad">
        Dar de baja
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Dar de baja" })).toHaveClass("bg-bad");
  });

  it("por defecto mide lo que su texto (44px) y fullWidth lo estira a 48px del login", () => {
    const { rerender } = render(<Button type="button">Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveClass("h-11");
    expect(boton).not.toHaveClass("w-full");

    rerender(
      <Button type="button" size="lg" fullWidth>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass("h-12", "w-full");
  });

  it("outline es chico (38px) salvo que se pida otro tamaño", () => {
    const { rerender } = render(
      <Button type="button" variant="outline">
        Ver
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Ver" })).toHaveClass("h-[38px]");

    rerender(
      <Button type="button" variant="outline" size="md">
        Ver
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Ver" })).toHaveClass("h-11");
  });

  it.each([
    ["gym", "bg-gym"],
    ["ok", "bg-ok"],
    ["tonal-ok", "bg-ok-soft"],
    ["tonal-bad", "bg-bad-soft"],
  ] as const)("variant %s aplica su tono", (variant, clase) => {
    render(
      <Button type="button" variant={variant}>
        Acción
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Acción" })).toHaveClass(clase);
  });
});
