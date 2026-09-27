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
});
