import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unProfesional } from "../../../test/profesionalFixture";
import { ProfesionalesTable } from "./ProfesionalesTable";

function renderTabla(overrides: Partial<Parameters<typeof ProfesionalesTable>[0]> = {}) {
  const props = {
    profesionales: [
      unProfesional(),
      unProfesional({
        id: 2,
        nombre: "Pablo",
        apellido: "Ruiz",
        especialidad: "PSICOLOGIA",
        duracionTurnoMinutos: 50,
        activo: false,
      }),
    ],
    onDisponibilidad: vi.fn(),
    onEditar: vi.fn(),
    onBaja: vi.fn(),
    onReactivar: vi.fn(),
    ...overrides,
  };
  render(<ProfesionalesTable {...props} />);
  return props;
}

describe("ProfesionalesTable", () => {
  it("muestra nombre, email, especialidad, duración y estado", () => {
    renderTabla();
    const val = within(screen.getByTestId("profesional-1"));
    expect(val.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(val.getByText("valentina.mendez@vitalys.com")).toBeInTheDocument();
    expect(val.getByText("Nutrición")).toBeInTheDocument();
    expect(val.getByText(/30 min/)).toBeInTheDocument();
    expect(val.getByText("Activo")).toBeInTheDocument();
    expect(within(screen.getByTestId("profesional-2")).getByText("Inactivo")).toBeInTheDocument();
  });

  it("dispara Disponibilidad y Editar sobre el profesional elegido", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    const val = within(screen.getByTestId("profesional-1"));

    await user.click(val.getByRole("button", { name: "Disponibilidad de Lic. Valentina Méndez" }));
    await user.click(val.getByRole("button", { name: "Editar Lic. Valentina Méndez" }));

    expect(props.onDisponibilidad).toHaveBeenCalledWith(props.profesionales[0]);
    expect(props.onEditar).toHaveBeenCalledWith(props.profesionales[0]);
  });

  it("el menú ⋯ ofrece Dar de baja y se cierra al elegirla", async () => {
    const user = userEvent.setup();
    const props = renderTabla();

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" }));
    await user.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(props.onBaja).toHaveBeenCalledWith(props.profesionales[0]);
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("el menú se cierra al tocar afuera y al volver a tocar ⋯", async () => {
    const user = userEvent.setup();
    renderTabla();
    const abrir = screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" });

    await user.click(abrir);
    await user.click(screen.getByRole("presentation"));
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();

    await user.click(abrir);
    await user.click(abrir);
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("un profesional inactivo tiene Disponibilidad deshabilitada y el menú ofrece Reactivar", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    const pablo = within(screen.getByTestId("profesional-2"));
    expect(pablo.getByRole("button", { name: "Disponibilidad de Lic. Pablo Ruiz" })).toBeDisabled();

    await user.click(pablo.getByRole("button", { name: "Más acciones de Lic. Pablo Ruiz" }));
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reactivar" }));

    expect(props.onReactivar).toHaveBeenCalledWith(props.profesionales[1]);
    expect(props.onBaja).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Reactivar" })).not.toBeInTheDocument();
  });

  it("deshabilita las acciones mientras hay una operación en curso", () => {
    renderTabla({ ocupado: true });
    expect(screen.getByRole("button", { name: "Editar Lic. Valentina Méndez" })).toBeDisabled();
  });

  it("avisa cuando no hay resultados", () => {
    renderTabla({ profesionales: [] });
    expect(screen.getByText("No hay profesionales que coincidan.")).toBeInTheDocument();
  });
});
