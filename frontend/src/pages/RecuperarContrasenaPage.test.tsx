import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../test/renderWithRouter";
import { RecuperarContrasenaPage } from "./RecuperarContrasenaPage";

describe("RecuperarContrasenaPage", () => {
  it("es honesta: dice que la recuperación no está disponible todavía, sin fingir un formulario", () => {
    renderWithRouter(<RecuperarContrasenaPage />, { path: "/recuperar-contrasena" });

    expect(screen.getByRole("heading", { name: "Recuperar contraseña" })).toBeInTheDocument();
    expect(screen.getByText(/no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
  });

  it("permite volver al login", () => {
    renderWithRouter(<RecuperarContrasenaPage />, { path: "/recuperar-contrasena" });
    expect(screen.getByRole("link", { name: "Volver a ingresar" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
