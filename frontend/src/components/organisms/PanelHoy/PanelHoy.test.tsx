import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { unResumen } from "../../../test/resumenFixture";
import { PanelHoy } from "./PanelHoy";

const AHORA = new Date("2026-10-26T10:20:00-03:00");

describe("PanelHoy", () => {
  it("muestra los cuatro indicadores", () => {
    render(<PanelHoy resumen={unResumen()} ahora={AHORA} />);
    const kpis = within(screen.getByRole("region", { name: "Indicadores del día" }));
    expect(kpis.getByText("En el gimnasio ahora")).toBeInTheDocument();
    expect(kpis.getByText("14")).toBeInTheDocument();
    expect(kpis.getByText("3 franjas · 23% ocupado")).toBeInTheDocument();
    expect(kpis.getByText("1 con reserva suspendida")).toBeInTheDocument();
  });

  it("marca la franja en curso", () => {
    render(<PanelHoy resumen={unResumen()} ahora={AHORA} />);
    const enCurso = screen.getByLabelText("10:00: 8 de 20");
    expect(enCurso).toHaveAttribute("aria-current", "time");
    expect(screen.getByLabelText("09:00: 6 de 20")).not.toHaveAttribute("aria-current");
  });

  it("distingue excepción, suspensión e impagos por debajo del umbral", () => {
    render(<PanelHoy resumen={unResumen()} ahora={AHORA} />);
    const atencion = within(screen.getByRole("region", { name: "Requieren atención" }));
    expect(atencion.getByText("3 personas")).toBeInTheDocument();
    expect(
      atencion.getByText("6 períodos impagos · excepción vigente hasta 20/11/2026"),
    ).toBeInTheDocument();
    expect(
      atencion.getByText("7 períodos impagos · reserva de gimnasio suspendida"),
    ).toBeInTheDocument();
    expect(atencion.getByText("2 de 6 períodos impagos")).toBeInTheDocument();
    expect(atencion.getByText("Excepción")).toBeInTheDocument();
    expect(atencion.getByText("Suspendido")).toBeInTheDocument();
    expect(atencion.getByText("Impagos")).toBeInTheDocument();
  });

  it("día cerrado y sin deudas", () => {
    render(
      <PanelHoy
        resumen={unResumen({
          franjasGym: [],
          turnosGymHoy: 0,
          requierenAtencion: [],
          conDeuda: 0,
          suspendidos: 0,
        })}
        ahora={AHORA}
      />,
    );
    expect(screen.getAllByText(/Hoy el gimnasio no abre/)).toHaveLength(2);
    expect(screen.getByText("Nadie tiene períodos impagos.")).toBeInTheDocument();
  });

  it("una sola persona y un solo impago se dicen en singular", () => {
    render(
      <PanelHoy
        resumen={unResumen({
          requierenAtencion: [
            {
              personaId: 1,
              persona: "Paz, Ana",
              dni: "1",
              periodosImpagos: 1,
              umbral: 6,
              suspendido: true,
              excepcionHasta: null,
            },
          ],
        })}
        ahora={AHORA}
      />,
    );
    expect(screen.getByText("1 persona")).toBeInTheDocument();
    expect(
      screen.getByText("1 período impago · reserva de gimnasio suspendida"),
    ).toBeInTheDocument();
  });
});
