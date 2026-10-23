import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("mide 44px en formularios y 46px con alto auth", () => {
    const { rerender } = render(<Input aria-label="Campo" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Campo")).toHaveClass("h-11");
    rerender(<Input aria-label="Campo" alto="auth" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Campo")).toHaveClass("h-[46px]");
  });

  it("llama a onChange con el valor (no con el evento crudo)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input aria-label="Email" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText("Email"), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("propaga atributos nativos como type y required", () => {
    render(<Input aria-label="Contraseña" type="password" required value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toBeRequired();
  });
});
