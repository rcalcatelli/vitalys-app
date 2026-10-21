import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unProfesional } from "../../../test/profesionalFixture";
import type { Impacto } from "../../../types/profesional";
import { BajaProfesionalDialog } from "./BajaProfesionalDialog";

const turno = (id: number) => ({
  turnoId: id,
  personaId: id,
  paciente: `Paciente ${id}`,
  inicio: "2026-10-21T16:30:00Z",
  fin: "2026-10-21T17:00:00Z",
});

function renderDialog(
  impacto: Impacto | null,
  extra: Partial<Parameters<typeof BajaProfesionalDialog>[0]> = {},
) {
  const onConfirmar = vi.fn();
  const onVolver = vi.fn();
  render(
    <BajaProfesionalDialog
      profesional={unProfesional()}
      impacto={impacto}
      onConfirmar={onConfirmar}
      onVolver={onVolver}
      {...extra}
    />,
  );
  return { onConfirmar, onVolver };
}

describe("BajaProfesionalDialog", () => {
  it("sin turnos futuros confirma directo con 'Dar de baja'", async () => {
    const user = userEvent.setup();
    const { onConfirmar, onVolver } = renderDialog({ cantidad: 0, turnos: [] });

    expect(screen.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(screen.getByText("Nutrición · 30 min")).toBeInTheDocument();
    expect(screen.queryByText(/turnos? futuros?/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    expect(onConfirmar).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(onVolver).toHaveBeenCalled();
  });

  it("con un turno lista el afectado y avisa que se notifica por email", () => {
    renderDialog({ cantidad: 1, turnos: [turno(1)] });

    expect(screen.getByText("Tiene 1 turno futuro que se va a cancelar:")).toBeInTheDocument();
    expect(screen.getByText("Paciente 1")).toBeInTheDocument();
    expect(screen.getByText("Se notificará a cada paciente por email.")).toBeInTheDocument();
    expect(screen.getByText("Los turnos pasados no se modifican.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar 1 turno y dar de baja" }),
    ).toBeInTheDocument();
  });

  it("con varios turnos pluraliza los textos", () => {
    renderDialog({ cantidad: 2, turnos: [turno(1), turno(2)] });

    expect(screen.getByText("Tiene 2 turnos futuros que se van a cancelar:")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar 2 turnos y dar de baja" }),
    ).toBeInTheDocument();
  });

  it("mientras consulta el impacto no deja confirmar; con error lo muestra", () => {
    renderDialog(null);
    expect(screen.getByText("Revisando turnos futuros…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeDisabled();
  });

  it("muestra el error y el estado de baja en curso", () => {
    renderDialog({ cantidad: 0, turnos: [] }, { error: "Algo falló", cargando: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Algo falló");
    expect(screen.getByRole("button", { name: "Dando de baja…" })).toBeDisabled();
  });
});
