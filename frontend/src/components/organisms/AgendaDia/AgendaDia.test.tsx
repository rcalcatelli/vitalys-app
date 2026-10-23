import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unTurnoAgenda } from "../../../test/turnoFixture";
import { AgendaDia } from "./AgendaDia";

// Lunes 26/10/2026. El turno base es a las 11:00 BA = 14:00Z.
const HOY = "2026-10-26";

function montar(ahoraIso: string, turnos = [unTurnoAgenda()], ocupadoId: number | null = null) {
  const onAtendido = vi.fn();
  const onAusente = vi.fn();
  render(
    <AgendaDia
      turnos={turnos}
      ahora={new Date(ahoraIso)}
      hoy={HOY}
      ocupadoId={ocupadoId}
      onAtendido={onAtendido}
      onAusente={onAusente}
    />,
  );
  return { onAtendido, onAusente };
}

describe("AgendaDia", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("muestra hora, paciente, DNI y el título del día", () => {
    montar("2026-10-26T12:00:00Z"); // 09:00 BA
    expect(screen.getByText("11:00")).toBeInTheDocument();
    expect(screen.getByText("11:30")).toBeInTheDocument();
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("30111222")).toBeInTheDocument();
    expect(screen.getByText(/^DNI/)).toBeInTheDocument();
  });

  it("faltan 30 min: Atendido y Ausente deshabilitados con la ayuda de ambos horarios", () => {
    montar("2026-10-26T13:30:00Z"); // 10:30 BA
    expect(screen.getByRole("button", { name: "Atendido: Juan García" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ausente: Juan García" })).toBeDisabled();
    expect(
      screen.getByText(
        "Atendido: disponible desde las 10:45 (15 min antes). Ausente: desde las 11:00 (inicio del turno).",
      ),
    ).toBeInTheDocument();
  });

  it("faltan 10 min: Atendido habilitado y Ausente no", async () => {
    const { onAtendido, onAusente } = montar("2026-10-26T13:50:00Z"); // 10:50 BA
    expect(screen.getByRole("button", { name: "Ausente: Juan García" })).toBeDisabled();
    expect(
      screen.getByText("Ausente: disponible desde las 11:00 (inicio del turno)."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atendido: Juan García" }));
    expect(onAtendido).toHaveBeenCalledWith(unTurnoAgenda());
    expect(onAusente).not.toHaveBeenCalled();
  });

  it("faltan exactamente 15 min: Atendido ya se habilita", () => {
    montar("2026-10-26T13:45:00Z"); // 10:45 BA
    expect(screen.getByRole("button", { name: "Atendido: Juan García" })).toBeEnabled();
  });

  it("turno iniciado: ambos habilitados, sin ayuda, y Ausente funciona", async () => {
    const { onAusente } = montar("2026-10-26T14:00:00Z"); // 11:00 BA
    expect(screen.getByRole("button", { name: "Atendido: Juan García" })).toBeEnabled();
    expect(screen.queryByText(/disponible desde/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ausente: Juan García" }));
    expect(onAusente).toHaveBeenCalled();
  });

  it("mientras se marca, los botones de ese turno quedan deshabilitados", () => {
    montar("2026-10-26T14:30:00Z", [unTurnoAgenda()], 1);
    expect(screen.getByRole("button", { name: "Atendido: Juan García" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ausente: Juan García" })).toBeDisabled();
  });

  it("un turno ya resuelto muestra el chip (COMPLETADO como Atendido) y no botones", () => {
    montar("2026-10-26T15:00:00Z", [
      unTurnoAgenda({ id: 1, estado: "COMPLETADO" }),
      unTurnoAgenda({
        id: 2,
        persona: "Ana Pérez",
        estado: "AUSENTE",
        inicio: "2026-10-26T12:00:00-03:00",
        fin: "2026-10-26T12:30:00-03:00",
      }),
    ]);
    expect(screen.getByText("Atendido")).toBeInTheDocument();
    expect(screen.getByText("Ausente")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("agrupa por día, ordena y rotula sin 'hoy' los demás días", () => {
    montar("2026-10-26T12:00:00Z", [
      unTurnoAgenda({
        id: 2,
        inicio: "2026-10-28T09:00:00-03:00",
        fin: "2026-10-28T09:30:00-03:00",
      }),
      unTurnoAgenda({ id: 1 }),
    ]);
    const titulos = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(titulos).toEqual(["Miércoles 28 de octubre"]);
    const segundo = screen.getByRole("region", { name: "Miércoles 28 de octubre" });
    expect(within(segundo).getByText("09:00")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Hoy" })).getByText("11:00"),
    ).toBeInTheDocument();
  });

  it("hoy muestra el resumen, los huecos libres y el turno en curso resaltado", () => {
    const huecos = [
      { inicio: "2026-10-26T09:00:00-03:00", fin: "2026-10-26T09:30:00-03:00" },
      { inicio: "2026-10-26T12:00:00-03:00", fin: "2026-10-26T12:30:00-03:00" },
    ];
    render(
      <AgendaDia
        turnos={[
          unTurnoAgenda({
            id: 1,
            inicio: "2026-10-26T08:00:00-03:00",
            fin: "2026-10-26T08:30:00-03:00",
            estado: "COMPLETADO",
          }),
          unTurnoAgenda({
            id: 2,
            inicio: "2026-10-26T10:30:00-03:00",
            fin: "2026-10-26T11:00:00-03:00",
          }),
        ]}
        ahora={new Date("2026-10-26T13:40:00Z")} // 10:40 BA
        hoy={HOY}
        huecos={huecos}
        duracionTurnoMinutos={30}
        onAtendido={vi.fn()}
        onAusente={vi.fn()}
      />,
    );
    expect(screen.getByText("pacientes").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("huecos libres").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("atendidos").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("por consulta").previousSibling).toHaveTextContent("30 min");
    expect(screen.getByText("Hueco libre (pasado)")).toBeInTheDocument();
    expect(screen.getByText("Libre")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    const filas = within(screen.getByRole("list", { name: "Hoy" })).getAllByRole("listitem");
    expect(filas).toHaveLength(4);
    expect(filas[0]).toHaveTextContent("08:00");
    expect(filas[2]).toHaveClass("bg-clin-soft");
    expect(filas[2]).toHaveAttribute("aria-current", "time");
  });

  it("sin disponibilidad no muestra huecos ni minutos por consulta", () => {
    montar("2026-10-26T12:00:00Z");
    expect(screen.queryByText("huecos libres")).not.toBeInTheDocument();
    expect(screen.queryByText("por consulta")).not.toBeInTheDocument();
  });

  it("un turno cancelado no figura en la agenda", () => {
    montar("2026-10-26T12:00:00Z", [
      unTurnoAgenda({ id: 1, estado: "CANCELADO_EN_TIEMPO" }),
      unTurnoAgenda({ id: 2, persona: "Ana Pérez" }),
    ]);
    expect(screen.queryByText("Juan García")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  it("hoy sin turnos pero con otros días no rompe y lo avisa", () => {
    montar("2026-10-26T12:00:00Z", [
      unTurnoAgenda({ inicio: "2026-10-28T09:00:00-03:00", fin: "2026-10-28T09:30:00-03:00" }),
    ]);
    expect(screen.getByText("No tenés turnos hoy.")).toBeInTheDocument();
  });

  it("sin turnos muestra el estado vacío", () => {
    montar("2026-10-26T12:00:00Z", []);
    expect(screen.getByText("No tenés turnos en los próximos 7 días.")).toBeInTheDocument();
  });
});
