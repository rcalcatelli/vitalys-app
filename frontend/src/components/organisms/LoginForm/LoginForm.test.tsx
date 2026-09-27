import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

function setup(overrides: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  const props = {
    onSubmit: vi.fn(),
    onForgotPassword: vi.fn(),
    onGoToRegister: vi.fn(),
    error: null,
    cargando: false,
    ...overrides,
  };
  render(<LoginForm {...props} />);
  return props;
}

describe("LoginForm", () => {
  it("llama a onSubmit con el identificador (DNI o email) y la contraseña", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText("DNI o email"), "38100001");
    await user.type(screen.getByLabelText("Contraseña"), "contrasena123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(onSubmit).toHaveBeenCalledWith("38100001", "contrasena123");
  });

  it("muestra el error recibido por props con role=alert", () => {
    setup({ error: "Credenciales inválidas" });
    expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
  });

  it("mientras cargando, deshabilita el submit y cambia su texto", () => {
    setup({ cargando: true });
    const button = screen.getByRole("button", { name: "Ingresando…" });
    expect(button).toBeDisabled();
  });

  it('"¿Olvidaste tu contraseña?" llama a onForgotPassword, sin conocer react-router', async () => {
    const user = userEvent.setup();
    const { onForgotPassword } = setup();

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));

    expect(onForgotPassword).toHaveBeenCalledOnce();
  });

  it('"Registrate" llama a onGoToRegister, sin conocer react-router', async () => {
    const user = userEvent.setup();
    const { onGoToRegister } = setup();

    await user.click(screen.getByRole("button", { name: "Registrate" }));

    expect(onGoToRegister).toHaveBeenCalledOnce();
  });

  it("muestra las cuentas de demostración del seed", () => {
    setup();
    expect(screen.getByText("Cuentas de demostración")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /María Pérez/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Juan García/ })).toBeInTheDocument();
  });

  it("al hacer clic en una cuenta de demostración, autocompleta el formulario sin enviarlo", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.click(screen.getByRole("button", { name: /María Pérez/ }));

    expect(screen.getByLabelText("DNI o email")).toHaveValue("38100001");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("Admin1234!");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
