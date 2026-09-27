import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegistroForm } from "./RegistroForm";

async function completarFormulario(
  user: ReturnType<typeof userEvent.setup>,
  options: { contrasena?: string; confirmar?: string } = {},
) {
  const { contrasena = "contrasena123", confirmar = contrasena } = options;
  await user.type(screen.getByLabelText("Email"), "nuevo@vitalys.test");
  await user.type(screen.getByLabelText("Contraseña"), contrasena);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirmar);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("RegistroForm", () => {
  it("solo llama a onSubmit(email, contrasena) cuando las contraseñas coinciden", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RegistroForm onSubmit={onSubmit} onGoToLogin={vi.fn()} error={null} cargando={false} />,
    );
    await completarFormulario(user);

    expect(onSubmit).toHaveBeenCalledWith("nuevo@vitalys.test", "contrasena123");
  });

  it("si las contraseñas no coinciden, no llama a onSubmit y muestra el error localmente", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RegistroForm onSubmit={onSubmit} onGoToLogin={vi.fn()} error={null} cargando={false} />,
    );
    await completarFormulario(user, { contrasena: "contrasena123", confirmar: "otra12345" });

    expect(screen.getByRole("alert")).toHaveTextContent("Las contraseñas no coinciden");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("muestra el error del backend recibido por props (409/400)", () => {
    render(
      <RegistroForm
        onSubmit={vi.fn()}
        onGoToLogin={vi.fn()}
        error="El email ya está registrado"
        cargando={false}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("El email ya está registrado");
  });

  it('"Ingresá" llama a onGoToLogin — el organismo no conoce react-router', async () => {
    const user = userEvent.setup();
    const onGoToLogin = vi.fn();

    render(
      <RegistroForm onSubmit={vi.fn()} onGoToLogin={onGoToLogin} error={null} cargando={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Ingresá" }));

    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });

  it("no renderiza campos de Nombre, Apellido, DNI ni selector de rol/servicio", () => {
    render(<RegistroForm onSubmit={vi.fn()} onGoToLogin={vi.fn()} error={null} cargando={false} />);

    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/apellido/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/dni/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/rol/i)).not.toBeInTheDocument();
  });
});
