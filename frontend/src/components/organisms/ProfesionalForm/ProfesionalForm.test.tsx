import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unProfesional } from "../../../test/profesionalFixture";
import { ProfesionalForm } from "./ProfesionalForm";

function renderForm(props: Partial<Parameters<typeof ProfesionalForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<ProfesionalForm onSubmit={onSubmit} onCancel={onCancel} {...props} />);
  return { onSubmit, onCancel };
}

describe("ProfesionalForm", () => {
  it("en el alta pide contraseña inicial con su ayuda y deja crear solo si es válido", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    expect(
      screen.getByText("Compartila con el profesional por un medio seguro."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear profesional" })).toBeDisabled();

    await user.type(screen.getByLabelText("Nombre"), " Ana ");
    await user.type(screen.getByLabelText("Apellido"), "Paz");
    await user.type(
      screen.getByLabelText("Email · será su usuario de acceso"),
      "Ana.Paz@Vitalys.com",
    );
    await user.type(screen.getByLabelText("Contraseña inicial"), "Clave1234");
    await user.click(screen.getByRole("button", { name: "Crear profesional" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "ana.paz@vitalys.com",
      contrasena: "Clave1234",
      datos: {
        nombre: "Ana",
        apellido: "Paz",
        especialidad: "NUTRICION",
        duracionTurnoMinutos: 30,
      },
    });
  });

  it("muestra los errores inline una vez tocado el campo", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Nombre"), "A");
    await user.clear(screen.getByLabelText("Nombre"));
    expect(screen.getByText("Campo obligatorio.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email · será su usuario de acceso"), "no-es-email");
    expect(screen.getByText("Ingresá un email válido.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Contraseña inicial"), "corta");
    expect(screen.getByText("Mínimo 8 caracteres.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Apellido"), "x");
    await user.clear(screen.getByLabelText("Apellido"));
    await user.clear(screen.getByLabelText("Email · será su usuario de acceso"));
    expect(screen.getAllByText("Campo obligatorio.").length).toBeGreaterThanOrEqual(2);
  });

  it("autocompleta la duración al cambiar la especialidad y deja ajustarla", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Especialidad"), "PSICOLOGIA");
    expect(screen.getByLabelText("Duración del turno (min)")).toHaveValue("50");
    expect(
      screen.getByText("Sugerido para Psicología: 50 min. Podés ajustarlo."),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Especialidad"), "KINESIOLOGIA");
    expect(screen.getByLabelText("Duración del turno (min)")).toHaveValue("45");

    await user.clear(screen.getByLabelText("Duración del turno (min)"));
    expect(screen.getByText("Campo obligatorio.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Duración del turno (min)"), "0");
    expect(screen.getByText("La duración debe ser mayor a 0.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Duración del turno (min)"));
    await user.type(screen.getByLabelText("Duración del turno (min)"), "999");
    expect(screen.getByText("La duración no puede superar 240 minutos.")).toBeInTheDocument();
  });

  it("en la edición no pide contraseña y el email queda de solo lectura", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      profesional: unProfesional({ especialidad: "PSICOLOGIA", duracionTurnoMinutos: 50 }),
    });

    expect(screen.queryByLabelText("Contraseña inicial")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email · será su usuario de acceso")).toBeDisabled();
    expect(screen.getByLabelText("Duración del turno (min)")).toHaveValue("50");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        datos: {
          nombre: "Valentina",
          apellido: "Méndez",
          especialidad: "PSICOLOGIA",
          duracionTurnoMinutos: 50,
        },
      }),
    );
  });

  it("muestra el error del servidor, el estado de carga y permite cancelar", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm({
      profesional: unProfesional(),
      error: "Ya existe un usuario con ese email",
      cargando: true,
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Ya existe un usuario con ese email");
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("no envía si hay errores (submit por teclado)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.type(screen.getByLabelText("Nombre"), "Ana{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
