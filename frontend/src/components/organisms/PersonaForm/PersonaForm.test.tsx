import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unaPersona } from "../../../test/personaFixture";
import { PersonaForm } from "./PersonaForm";

async function completarAlta(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ana@mail.com");
  await user.type(screen.getByLabelText("Contraseña inicial"), "Clave1234");
  await user.type(screen.getByLabelText("Nombre"), "Ana");
  await user.type(screen.getByLabelText("Apellido"), "López");
  await user.type(screen.getByLabelText("DNI"), "40.000.001");
}

describe("PersonaForm", () => {
  it("alta: envía credenciales y datos, con el DNI sin puntos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PersonaForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await completarAlta(user);
    await user.click(screen.getByRole("button", { name: "Dar de alta" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "ana@mail.com",
      contrasena: "Clave1234",
      datos: {
        nombre: "Ana",
        apellido: "López",
        dni: "40000001",
        telefono: null,
        fechaNacimiento: null,
        esSocioGym: false,
        fechaInicioMembresia: null,
      },
    });
  });

  it("un socio del gimnasio necesita fecha de inicio de membresía", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PersonaForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await completarAlta(user);
    await user.click(screen.getByLabelText("Socio del gimnasio"));
    await user.click(screen.getByRole("button", { name: "Dar de alta" }));

    expect(screen.getByRole("alert")).toHaveTextContent("fecha de inicio de membresía");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ["sin email", { email: "" }, "email válido"],
    ["contraseña corta", { contrasena: "123" }, "8 caracteres"],
    ["DNI corto", { dni: "123" }, "entre 7 y 9 dígitos"],
  ])("valida %s", async (_caso, cambio, mensaje) => {
    const user = userEvent.setup();
    render(<PersonaForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const valores = { email: "a@b.c", contrasena: "Clave1234", dni: "40000001", ...cambio };
    if (valores.email) await user.type(screen.getByLabelText("Email"), valores.email);
    await user.type(screen.getByLabelText("Contraseña inicial"), valores.contrasena);
    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "López");
    await user.type(screen.getByLabelText("DNI"), valores.dni);
    await user.click(screen.getByRole("button", { name: "Dar de alta" }));
    expect(screen.getByRole("alert")).toHaveTextContent(mensaje);
  });

  it("edición: precarga los datos, no pide credenciales y al dejar de ser socio limpia la fecha", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PersonaForm persona={unaPersona()} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByLabelText("DNI")).toHaveValue("38100002");
    await user.click(screen.getByLabelText("Socio del gimnasio"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit.mock.calls[0][0].datos).toMatchObject({
      esSocioGym: false,
      fechaInicioMembresia: null,
    });
  });

  it("muestra el error del servidor y permite cancelar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <PersonaForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
        error="Ya existe una persona con el DNI 38100002"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Ya existe una persona");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
