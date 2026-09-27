import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("arranca oculta y el botón alterna type y su nombre accesible", async () => {
    const user = userEvent.setup();

    render(
      <PasswordInput id="password" label="Contraseña" value="secreta123" onChange={vi.fn()} />,
    );

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("propaga onChange con el valor tipeado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PasswordInput id="password" label="Contraseña" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText("Contraseña"), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("el botón queda superpuesto DENTRO del input (no al lado), con padding derecho reservado", () => {
    render(
      <PasswordInput id="password" label="Contraseña" value="secreta123" onChange={vi.fn()} />,
    );

    const input = screen.getByLabelText("Contraseña");
    const button = screen.getByRole("button", { name: "Mostrar contraseña" });

    // El input reserva espacio a la derecha (`pr-12`, ver `hasTrailingIcon`)
    // para que el texto no quede tapado por el botón.
    expect(input).toHaveClass("pr-12");
    // El botón se posiciona absoluto dentro del mismo contenedor relativo del
    // input, no como un hermano flotando afuera del recuadro.
    expect(button).toHaveClass("absolute", "right-0");
    expect(button.parentElement).toBe(input.parentElement);
  });

  it("usa SVG (no emoji) para el ícono, oculto para lectores de pantalla", () => {
    render(
      <PasswordInput id="password" label="Contraseña" value="secreta123" onChange={vi.fn()} />,
    );

    const button = screen.getByRole("button", { name: "Mostrar contraseña" });
    const svg = button.querySelector("svg");

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(button.textContent).not.toMatch(/[\u{1F440}-\u{1FAFF}\u{1F300}-\u{1F5FF}]/u);
  });
});
