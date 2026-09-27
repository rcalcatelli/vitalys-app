import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError } from "./FieldError";

describe("FieldError", () => {
  it("renderiza el mensaje con role=alert para que lo anuncien los lectores de pantalla", () => {
    render(<FieldError>Email o contraseña incorrectos</FieldError>);

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Email o contraseña incorrectos");
  });

  it("acepta un id para asociarse vía aria-describedby", () => {
    render(<FieldError id="form-error">Las contraseñas no coinciden</FieldError>);

    expect(screen.getByRole("alert")).toHaveAttribute("id", "form-error");
  });
});
