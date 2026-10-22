import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unProfesional } from "../../../test/profesionalFixture";
import { unTurno, unTurnoGym } from "../../../test/turnoFixture";
import { CancelarTurnoDialog } from "./CancelarTurnoDialog";

const AHORA = new Date("2026-10-26T13:00:00Z"); // lunes 10:00 en Buenos Aires

function montar(turno = unTurno(), onConfirmar = vi.fn(), onVolver = vi.fn(), cargando = false) {
  render(
    <CancelarTurnoDialog
      turno={turno}
      profesionales={[unProfesional()]}
      ahora={AHORA}
      cargando={cargando}
      onConfirmar={onConfirmar}
      onVolver={onVolver}
    />,
  );
  return { onConfirmar, onVolver };
}

describe("CancelarTurnoDialog", () => {
  it("consultorio a más de 24 h: en término, con las horas que faltan", () => {
    montar(unTurno({ inicio: "2026-10-28T10:00:00-03:00" })); // faltan 48 h
    expect(screen.getByText("Cancelación en término")).toBeInTheDocument();
    expect(screen.getByText("Faltan 48 h; el límite es 24 h antes del turno.")).toBeInTheDocument();
    expect(screen.getByText("Consulta de Nutrición · Lic. Valentina Méndez")).toBeInTheDocument();
  });

  it("consultorio a menos de 24 h: fuera de término", () => {
    montar(unTurno({ inicio: "2026-10-27T09:00:00-03:00" })); // faltan 23 h
    expect(screen.getByText("Cancelación fuera de término")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Faltan menos de 24 h. El turno queda registrado como “cancelado fuera de término”.",
      ),
    ).toBeInTheDocument();
  });

  it("gimnasio: el límite es 2 h", () => {
    montar(unTurnoGym({ inicio: "2026-10-26T11:00:00-03:00", fin: "2026-10-26T12:00:00-03:00" })); // 1 h
    expect(screen.getByText("Cancelación fuera de término")).toBeInTheDocument();
    expect(screen.getByText(/Faltan menos de 2 h/)).toBeInTheDocument();
    expect(screen.getByText("Gimnasio")).toBeInTheDocument();
  });

  it("gimnasio justo en el límite de 2 h es en término", () => {
    montar(unTurnoGym({ inicio: "2026-10-26T12:00:00-03:00", fin: "2026-10-26T13:00:00-03:00" })); // 2 h
    expect(screen.getByText("Cancelación en término")).toBeInTheDocument();
  });

  it("sin motivo no confirma y muestra el error", async () => {
    const { onConfirmar } = montar();
    await userEvent.type(screen.getByLabelText("Motivo"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Escribí el motivo de la cancelación.");
  });

  it("con motivo confirma (recortado) y limpia el error previo", async () => {
    const { onConfirmar } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    await userEvent.type(screen.getByLabelText("Motivo"), " No puedo ir ");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(onConfirmar).toHaveBeenCalledWith("No puedo ir");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Volver cierra y cargando deshabilita la confirmación", async () => {
    const { onVolver } = montar(unTurno(), vi.fn(), vi.fn(), true);
    expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onVolver).toHaveBeenCalled();
  });
});
