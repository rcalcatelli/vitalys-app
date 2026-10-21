import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("asocia el label con el input y propaga onChange con el valor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();

    await user.type(input, "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("muestra la ayuda y el error inline asociados al input", () => {
    render(
      <FormField
        id="pw"
        label="Contraseña"
        value=""
        onChange={vi.fn()}
        help="Mínimo 8 caracteres"
        error="Campo obligatorio."
      />,
    );

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Mínimo 8 caracteres Campo obligatorio.");
  });
});
