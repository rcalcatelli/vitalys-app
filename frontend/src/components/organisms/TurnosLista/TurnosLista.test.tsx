import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unProfesional } from "../../../test/profesionalFixture";
import { unTurno, unTurnoGym } from "../../../test/turnoFixture";
import { TurnosLista } from "./TurnosLista";

const AHORA = new Date("2026-10-26T13:00:00Z"); // lunes 10:00 en Buenos Aires

function seccion(nombre: string) {
  return within(screen.getByRole("heading", { name: nombre }).closest("section")!);
}

describe("TurnosLista", () => {
  it("separa próximos (cancelables) de historial y muestra la nota de plazos", async () => {
    const onCancelar = vi.fn();
    const futuro = unTurno({ id: 1 });
    render(
      <TurnosLista
        turnos={[
          futuro,
          unTurno({ id: 2, inicio: "2026-10-20T10:00:00-03:00", estado: "COMPLETADO" }),
          unTurnoGym({ id: 3 }),
        ]}
        profesionales={[unProfesional()]}
        ahora={AHORA}
        onCancelar={onCancelar}
      />,
    );
    expect(
      screen.getByText("En término: gimnasio hasta 2 h antes · consultorio hasta 24 h antes"),
    ).toBeInTheDocument();
    const proximos = seccion("Próximos");
    expect(proximos.getAllByRole("listitem")).toHaveLength(2);
    expect(proximos.getByText("Consulta de Nutrición")).toBeInTheDocument();
    expect(proximos.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(proximos.getByText("Gimnasio")).toBeInTheDocument();
    expect(seccion("Historial").getByText("Completado")).toBeInTheDocument();
    expect(seccion("Historial").queryByRole("button")).not.toBeInTheDocument();

    await userEvent.click(proximos.getByRole("button", { name: /Cancelar turno Consulta/ }));
    expect(onCancelar).toHaveBeenCalledWith(futuro);
  });

  it("ordena los próximos del más cercano al más lejano", () => {
    render(
      <TurnosLista
        turnos={[
          unTurno({ id: 1, inicio: "2026-10-30T10:00:00-03:00", fin: "2026-10-30T10:30:00-03:00" }),
          unTurno({ id: 2, inicio: "2026-10-28T10:00:00-03:00", fin: "2026-10-28T10:30:00-03:00" }),
        ]}
        profesionales={[unProfesional()]}
        ahora={AHORA}
        onCancelar={vi.fn()}
      />,
    );
    const items = seccion("Próximos").getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Mié 28/10");
    expect(items[1]).toHaveTextContent("Vie 30/10");
  });

  it("un turno reservado que ya empezó va al historial", () => {
    render(
      <TurnosLista
        turnos={[
          unTurno({ inicio: "2026-10-26T09:00:00-03:00", fin: "2026-10-26T09:30:00-03:00" }),
        ]}
        profesionales={[unProfesional()]}
        ahora={AHORA}
        onCancelar={vi.fn()}
      />,
    );
    expect(seccion("Historial").getByText("Reservado")).toBeInTheDocument();
    expect(screen.getByText("No tenés turnos próximos.")).toBeInTheDocument();
  });

  it("cancelado por el centro muestra el motivo; sin motivo no", () => {
    render(
      <TurnosLista
        turnos={[
          unTurno({
            id: 1,
            estado: "CANCELADO_POR_PROFESIONAL",
            motivoCancelacion: "El profesional no atiende ese día",
          }),
          unTurno({ id: 2, estado: "CANCELADO_POR_PROFESIONAL", motivoCancelacion: null }),
        ]}
        profesionales={[unProfesional()]}
        ahora={AHORA}
        onCancelar={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Cancelado por el centro")).toHaveLength(2);
    expect(screen.getAllByText(/Motivo:/)).toHaveLength(1);
    expect(screen.getByText("Motivo: El profesional no atiende ese día")).toBeInTheDocument();
  });

  it("si el profesional no figura usa la etiqueta de respaldo y muestra el vacío", () => {
    render(
      <TurnosLista
        turnos={[unTurno({ profesionalId: 99 })]}
        profesionales={[]}
        ahora={AHORA}
        onCancelar={vi.fn()}
      />,
    );
    expect(screen.getByText("Profesional no disponible")).toBeInTheDocument();
    expect(screen.getByText("Todavía no tenés turnos en el historial.")).toBeInTheDocument();
  });
});
