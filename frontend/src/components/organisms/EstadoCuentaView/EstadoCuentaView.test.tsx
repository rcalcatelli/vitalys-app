import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unEstadoCuenta, unPeriodo, unaSesion } from "../../../test/pagoFixture";
import { EstadoCuentaView } from "./EstadoCuentaView";

function stubAncho(ancho: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: ancho,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

const IMPAGO = unPeriodo({
  periodo: "2026-07-01",
  vence: "2026-08-01",
  limite: "2026-08-11",
  estado: "IMPAGO",
  pago: null,
});

afterEach(() => vi.unstubAllGlobals());

describe("EstadoCuentaView", () => {
  it("PU-13 suspendido: avisa el límite de períodos impagos con el medidor lleno", () => {
    render(
      <EstadoCuentaView
        vista="socio"
        estado={unEstadoCuenta({ suspendido: true, periodosImpagos: 3, periodos: [IMPAGO] })}
      />,
    );
    expect(screen.getByText("Reserva de gimnasio suspendida")).toBeInTheDocument();
    expect(screen.getByText("Reserva suspendida")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 de 3 períodos impagos" })).toBeInTheDocument();
    expect(screen.getByText("3 de 3 períodos impagos")).toBeInTheDocument();
    expect(screen.getByText(/Llegaste a 3 períodos impagos/)).toBeInTheDocument();
    expect(screen.getByText("Impago")).toBeInTheDocument();
    expect(screen.getByText(/Venció el/)).toBeInTheDocument();
    expect(screen.getByText(/tolerancia hasta el 11\/08\/2026/)).toBeInTheDocument();
  });

  it("con más impagos que el umbral, dice cuál es el límite", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({ suspendido: true, periodosImpagos: 4, periodos: [IMPAGO] })}
      />,
    );
    expect(screen.getByText("4 períodos impagos · el límite es 3")).toBeInTheDocument();
    expect(
      screen.getByText("Tiene 4 períodos impagos. Las consultas siguen habilitadas."),
    ).toBeInTheDocument();
  });

  it("PU-14 excepción vigente (socio): muestra hasta cuándo y el texto en voseo", () => {
    render(
      <EstadoCuentaView
        vista="socio"
        estado={unEstadoCuenta({
          periodosImpagos: 3,
          excepcion: {
            validaHasta: "2026-11-15",
            motivo: "Plan de pagos acordado",
            autorizadaPor: "Laura Benítez",
            otorgadaEl: "2026-10-20T12:00:00-03:00",
          },
        })}
      />,
    );
    expect(screen.getByText("Excepción vigente")).toBeInTheDocument();
    expect(screen.getByText("15/11/2026")).toBeInTheDocument();
    expect(
      screen.getByText("Recepción autorizó que reserves el gimnasio hasta esa fecha."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Plan de pagos acordado/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Mientras la excepción esté vigente podés reservar/),
    ).toBeInTheDocument();
  });

  it("PI-136 excepción vigente (admin): quién la autorizó, cuándo y el motivo", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({
          periodosImpagos: 3,
          excepcion: {
            validaHasta: "2026-11-15",
            motivo: "Plan de pagos acordado",
            autorizadaPor: "Laura Benítez",
            otorgadaEl: "2026-10-20T12:00:00-03:00",
          },
        })}
      />,
    );
    expect(
      screen.getByText("Autorizada por Laura Benítez el 20/10/2026 · “Plan de pagos acordado”"),
    ).toBeInTheDocument();
  });

  it("una excepción sin autor ni fecha cae en Recepción", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({
          periodosImpagos: 3,
          excepcion: {
            validaHasta: "2026-11-15",
            motivo: "x",
            autorizadaPor: null,
            otorgadaEl: null,
          },
        })}
      />,
    );
    expect(screen.getByText("Autorizada por Recepción · “x”")).toBeInTheDocument();
  });

  it("PU-15 al día: períodos pagados con monto y medio; indicadores en pesos", () => {
    render(<EstadoCuentaView vista="socio" estado={unEstadoCuenta()} />);
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getByText("Reserva habilitada")).toBeInTheDocument();
    expect(screen.queryByText(/Excepción vigente/)).not.toBeInTheDocument();
    const periodos = screen.getByRole("region", { name: "Períodos de cuota" });
    expect(within(periodos).getByText("Octubre 2026")).toBeInTheDocument();
    expect(within(periodos).getAllByText("Pagado")).toHaveLength(2);
    expect(within(periodos).getAllByText("$ 15.000")).toHaveLength(2);
    expect(within(periodos).getAllByText(/Efectivo/)).toHaveLength(2);
    const tiles = within(screen.getByRole("region", { name: "Indicadores de pagos" }));
    // Total pagado y Cuotas coinciden: no hubo sesiones.
    expect(tiles.getAllByText("$ 30.000")).toHaveLength(2);
    expect(tiles.getByText("2 pagos registrados")).toBeInTheDocument();
    expect(tiles.getByText("2 períodos pagados")).toBeInTheDocument();
    expect(tiles.getByText("0 sesiones pagadas")).toBeInTheDocument();
    expect(tiles.getByText("Con 3 se suspende la reserva")).toBeInTheDocument();
    expect(screen.getByText("No hay períodos pendientes.")).toBeInTheDocument();
  });

  it("el período más reciente va primero", () => {
    render(<EstadoCuentaView vista="socio" estado={unEstadoCuenta()} />);
    const meses = within(screen.getByRole("region", { name: "Períodos de cuota" }))
      .getAllByText(/2026$/)
      .map((n) => n.textContent);
    expect(meses[0]).toBe("Octubre 2026");
  });

  it("al día con un período pendiente avisa cuándo vence", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({
          periodos: [unPeriodo({ estado: "PENDIENTE", pago: null })],
        })}
      />,
    );
    expect(
      screen.getByText(
        "La cuota de octubre 2026 vence el 01/11/2026 (tolerancia hasta el 11/11/2026).",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("deuda parcial: puede seguir reservando y se nombra el período más antiguo", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({ periodosImpagos: 1, periodos: [IMPAGO] })}
      />,
    );
    expect(screen.getByText("Con períodos impagos (1 de 3)")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Puede seguir reservando\. Con 3 períodos impagos la reserva se suspende\. El más antiguo es julio 2026\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Reserva habilitada")).toBeInTheDocument();
  });

  it("deuda parcial (socio): voseo", () => {
    render(
      <EstadoCuentaView
        vista="socio"
        estado={unEstadoCuenta({ periodosImpagos: 1, periodos: [IMPAGO] })}
      />,
    );
    expect(screen.getByText(/Podés seguir reservando el gimnasio/)).toBeInTheDocument();
  });

  it("PU-16 no socio: sin cuota, sin medidor y con sus sesiones pagadas", () => {
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
    expect(screen.getByText("Sin cuota de gimnasio")).toBeInTheDocument();
    expect(screen.getByText("Solo consultorio")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Cuotas")).not.toBeInTheDocument();
    expect(
      screen.getByText("No sos socio/a del gimnasio, así que no tenés cuotas mensuales."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mar/)).toBeInTheDocument();
    expect(screen.getByText(/20\/10\/2026 · 10:00/)).toBeInTheDocument();
    expect(screen.getByText(/Lic\. Valentina Méndez · Nutrición/)).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();
  });

  it("vista admin habla en tercera persona y muestra los vacíos", () => {
    const base = unEstadoCuenta({ periodos: [], sesiones: [], esSocioGym: false, umbral: 0 });
    const { rerender } = render(<EstadoCuentaView vista="admin" estado={base} />);
    expect(
      screen.getByText("No es socio/a del gimnasio: solo paga las sesiones de consultorio."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No es socio/a del gimnasio, así que no tiene cuotas mensuales."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Todavía no tiene sesiones de consultorio pagadas."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cómo funciona la mora")).not.toBeInTheDocument();

    rerender(<EstadoCuentaView vista="admin" estado={{ ...base, esSocioGym: true, umbral: 3 }} />);
    expect(screen.getByText("Todavía no hay períodos.")).toBeInTheDocument();
    expect(screen.getByText("Al día")).toBeInTheDocument();
  });

  it("dada de baja: título propio y sin cuota", () => {
    render(<EstadoCuentaView vista="admin" dadaDeBaja estado={unEstadoCuenta({ periodos: [] })} />);
    expect(screen.getByText("Gimnasio dado de baja")).toBeInTheDocument();
    expect(screen.getByText("Dado de baja")).toBeInTheDocument();
    expect(screen.getByText("El servicio de gimnasio está dado de baja.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("dada de baja (socio): voseo", () => {
    render(<EstadoCuentaView vista="socio" dadaDeBaja estado={unEstadoCuenta({ periodos: [] })} />);
    expect(screen.getByText(/Tu servicio de gimnasio está dado de baja/)).toBeInTheDocument();
  });

  it("solo el socio ve 'Cómo funciona la mora'", () => {
    render(<EstadoCuentaView vista="socio" estado={unEstadoCuenta()} />);
    expect(screen.getByText("Cómo funciona la mora")).toBeInTheDocument();
  });

  it("socio sin sesiones lo dice en voseo", () => {
    render(
      <EstadoCuentaView vista="socio" estado={unEstadoCuenta({ periodos: [], sesiones: [] })} />,
    );
    expect(
      screen.getByText("Todavía no tenés sesiones de consultorio pagadas."),
    ).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay períodos.")).toBeInTheDocument();
  });

  it("una sesión sin turno ni profesional conocidos muestra rayas", () => {
    render(
      <EstadoCuentaView
        vista="admin"
        estado={unEstadoCuenta({
          sesiones: [unaSesion({ fechaTurno: null, profesional: null, especialidad: null })],
        })}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  describe("ancho (>= 1000px): tablas", () => {
    it("períodos con encabezados y fecha/monto/medio en columnas", () => {
      stubAncho(true);
      render(
        <EstadoCuentaView
          vista="admin"
          estado={unEstadoCuenta({ periodos: [unPeriodo(), IMPAGO] })}
        />,
      );
      const periodos = within(screen.getByRole("region", { name: "Períodos de cuota" }));
      for (const h of ["Período", "Estado", "Fecha de pago", "Monto", "Medio"]) {
        expect(periodos.getByText(h)).toBeInTheDocument();
      }
      expect(periodos.getByText("03/10/2026")).toBeInTheDocument();
      expect(periodos.getByText("Efectivo")).toBeInTheDocument();
      expect(periodos.getByText(/Venció el/)).toBeInTheDocument();
      expect(periodos.getByText("—", { selector: "span.font-mono" })).toBeInTheDocument();
    });

    it("sesiones con profesional, especialidad y fecha de pago", () => {
      stubAncho(true);
      render(
        <EstadoCuentaView vista="admin" estado={unEstadoCuenta({ sesiones: [unaSesion()] })} />,
      );
      const sesiones = within(
        screen.getByRole("region", { name: "Sesiones de consultorio pagadas" }),
      );
      for (const h of ["Fecha del turno", "Profesional", "Monto", "Medio"]) {
        expect(sesiones.getByText(h)).toBeInTheDocument();
      }
      expect(sesiones.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
      expect(sesiones.getByText("Nutrición")).toBeInTheDocument();
      expect(sesiones.getByText("20/10/2026")).toBeInTheDocument();
      expect(sesiones.getByText("$ 8.000")).toBeInTheDocument();
    });

    it("sin períodos no dibuja su encabezado; las sesiones vacías sí (como el diseño)", () => {
      stubAncho(true);
      render(
        <EstadoCuentaView vista="admin" estado={unEstadoCuenta({ periodos: [], sesiones: [] })} />,
      );
      expect(screen.queryByText("Fecha de pago")).not.toBeInTheDocument();
      expect(screen.getByText("Fecha del turno")).toBeInTheDocument();
    });
  });
});
