import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { unEstadoCuenta, unPeriodo, unaSesion } from "../../../test/pagoFixture";
import { EstadoCuentaView } from "./EstadoCuentaView";

describe("EstadoCuentaView", () => {
  it("PU-13 suspendido: avisa el límite de períodos impagos", () => {
    render(
      <EstadoCuentaView
        vista="socio"
        estado={unEstadoCuenta({
          suspendido: true,
          periodosImpagos: 3,
          periodos: [unPeriodo({ periodo: "2026-07-01", estado: "IMPAGO", pago: null })],
        })}
      />,
    );
    expect(screen.getByText("Tu gimnasio está suspendido")).toBeInTheDocument();
    expect(screen.getByText("3 de 3 períodos impagos")).toBeInTheDocument();
    expect(screen.getByText("Impago")).toBeInTheDocument();
    expect(screen.getByText(/Vence el 01\/11\/2026/)).toBeInTheDocument();
  });

  it("PU-14 excepción vigente: muestra hasta cuándo y el motivo", () => {
    render(
      <EstadoCuentaView
        vista="socio"
        estado={unEstadoCuenta({
          periodosImpagos: 3,
          excepcion: { validaHasta: "2026-11-15", motivo: "Plan de pagos acordado" },
        })}
      />,
    );
    expect(screen.getByText("Excepción vigente hasta 15/11/2026")).toBeInTheDocument();
    expect(screen.getByText("Plan de pagos acordado")).toBeInTheDocument();
    expect(screen.getByText("Tenés cuotas impagas")).toBeInTheDocument();
  });

  it("PU-15 al día: períodos pagados con monto, medio y fecha; sin excepción", () => {
    render(<EstadoCuentaView vista="socio" estado={unEstadoCuenta()} />);
    expect(screen.getByText("Estás al día")).toBeInTheDocument();
    expect(screen.queryByText(/Excepción vigente/)).not.toBeInTheDocument();
    const periodos = screen.getByRole("region", { name: "Períodos de cuota" });
    expect(within(periodos).getByText("Octubre 2026")).toBeInTheDocument();
    expect(within(periodos).getAllByText("Pagado")).toHaveLength(2);
    expect(within(periodos).getAllByText("$ 15.000,00")).toHaveLength(2);
    expect(within(periodos).getAllByText(/Efectivo/)).toHaveLength(2);
    expect(screen.getByText("$ 30.000,00")).toBeInTheDocument();
  });

  it("período pendiente (en gracia) y deuda parcial: puede seguir reservando", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({
          periodosImpagos: 1,
          periodos: [unPeriodo({ estado: "PENDIENTE", pago: null })],
        })}
      />,
    );
    expect(screen.getByText("Tiene cuotas impagas")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText(/Todavía puede reservar/)).toBeInTheDocument();
  });

  it("PU-16 no socio: sin períodos, con sus sesiones pagadas", () => {
    render(
      <EstadoCuentaView
        vista="socio"
        estado={unEstadoCuenta({
          esSocioGym: false,
          periodos: [],
          umbral: 0,
          sesiones: [unaSesion()],
          totales: { cantidadPagos: 1, montoTotal: 8000 },
        })}
      />,
    );
    expect(screen.getByText("No sos socio del gimnasio")).toBeInTheDocument();
    expect(screen.queryByText(/períodos impagos$/)).not.toBeInTheDocument();
    expect(screen.getByText("No tenés cuota mensual de gimnasio.")).toBeInTheDocument();
    expect(screen.getByText("Turno del 20/10/2026 · 10:00")).toBeInTheDocument();
    expect(screen.getByText(/Transferencia/)).toBeInTheDocument();
  });

  it("vista admin habla en tercera persona y muestra los vacíos", () => {
    const base = unEstadoCuenta({ periodos: [], sesiones: [], esSocioGym: false, umbral: 0 });
    const { rerender } = render(<EstadoCuentaView vista="admin" estado={base} />);
    expect(screen.getByText("No es socio del gimnasio")).toBeInTheDocument();
    expect(screen.getByText("No tiene cuota mensual de gimnasio.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay sesiones de consultorio pagadas.")).toBeInTheDocument();

    rerender(<EstadoCuentaView vista="admin" estado={{ ...base, esSocioGym: true, umbral: 3 }} />);
    expect(screen.getByText("Todavía no hay períodos de cuota.")).toBeInTheDocument();
    expect(screen.getByText("Está al día")).toBeInTheDocument();

    rerender(
      <EstadoCuentaView
        vista="admin"
        estado={{ ...base, esSocioGym: true, umbral: 3, suspendido: true }}
      />,
    );
    expect(screen.getByText("Gimnasio suspendido")).toBeInTheDocument();
  });

  it("socio sin sesiones lo dice en voseo", () => {
    render(
      <EstadoCuentaView vista="socio" estado={unEstadoCuenta({ periodos: [], sesiones: [] })} />,
    );
    expect(screen.getByText("Todavía no pagaste sesiones de consultorio.")).toBeInTheDocument();
  });
});
