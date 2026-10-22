import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unEstadoCuenta, unPeriodo, unaSesion } from "../../../test/pagoFixture";
import { unTurno, unTurnoGym } from "../../../test/turnoFixture";
import type { EstadoCuenta } from "../../../types/pago";
import type { Turno } from "../../../types/turno";
import { RegistrarPagoDialog, type RegistrarPagoDialogProps } from "./RegistrarPagoDialog";

/** Septiembre pagado, octubre y noviembre impagos. */
function conDeuda(): EstadoCuenta {
  return unEstadoCuenta({
    periodosImpagos: 2,
    periodos: [
      unPeriodo({ periodo: "2026-09-01" }),
      unPeriodo({ periodo: "2026-10-01", estado: "IMPAGO", pago: null }),
      unPeriodo({ periodo: "2026-11-01", estado: "PENDIENTE", pago: null }),
    ],
    sesiones: [unaSesion({ turnoId: 50 })],
  });
}

const TURNOS: Turno[] = [
  unTurno({ id: 50, inicio: "2026-10-28T10:00:00-03:00", fin: "2026-10-28T10:30:00-03:00" }),
  unTurno({ id: 51, inicio: "2026-10-29T11:00:00-03:00", fin: "2026-10-29T11:30:00-03:00" }),
  unTurno({ id: 52, estado: "CANCELADO_TARDE", inicio: "2026-10-30T09:00:00-03:00" }),
  unTurno({ id: 53, estado: "CANCELADO_EN_TIEMPO", inicio: "2026-10-31T09:00:00-03:00" }),
  unTurno({ id: 54, estado: "CANCELADO_POR_PROFESIONAL", inicio: "2026-11-02T09:00:00-03:00" }),
  unTurnoGym({ id: 55 }),
];

function montar(props: Partial<RegistrarPagoDialogProps> = {}) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <RegistrarPagoDialog
      nombre="Juan García"
      estado={conDeuda()}
      turnos={TURNOS}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />,
  );
  return { onConfirmar, onCancelar };
}

describe("RegistrarPagoDialog", () => {
  it("PU-19 cuota: sugiere el primer período impago, bloquea los pagados y ofrece adelantos", () => {
    montar();
    const periodo = screen.getByLabelText("Período");
    expect(periodo).toHaveValue("2026-10-01");
    expect(screen.getByRole("option", { name: "Septiembre 2026 (ya pagado)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Octubre 2026" })).toBeEnabled();
    // Pago adelantado: dos meses después del último período.
    expect(screen.getByRole("option", { name: "Diciembre 2026" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Enero 2027" })).toBeEnabled();
  });

  it("PU-20 valida monto y medio antes de enviar", async () => {
    const { onConfirmar } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.getByText(/Ingresá un monto mayor a cero./)).toBeInTheDocument();
    expect(screen.getByText(/Elegí el medio de pago./)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Monto"), "0");
    await userEvent.selectOptions(screen.getByLabelText("Medio de pago"), "EFECTIVO");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.getByText(/Ingresá un monto mayor a cero./)).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("PU-21 envía la cuota con período, monto y medio", async () => {
    const { onConfirmar } = montar();
    await userEvent.selectOptions(screen.getByLabelText("Período"), "2026-12-01");
    await userEvent.type(screen.getByLabelText("Monto"), "15000,50");
    await userEvent.selectOptions(screen.getByLabelText("Medio de pago"), "TRANSFERENCIA");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      concepto: "CUOTA_MENSUAL",
      monto: 15000.5,
      medio: "TRANSFERENCIA",
      periodo: "2026-12-01",
    });
  });

  it("PU-22 sesión: excluye cancelados y gimnasio, marca los ya pagados y envía el turno", async () => {
    const { onConfirmar } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Sesión de consultorio" }));

    const opciones = screen
      .getAllByRole("option")
      .filter((o) => /· \d\d:\d\d/.test(o.textContent ?? ""));
    expect(opciones).toHaveLength(2);
    expect(opciones[0]).toBeDisabled();
    expect(opciones[0]).toHaveTextContent("(ya pagado)");
    expect(screen.getByText("No se muestran los turnos cancelados.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.getByText(/Elegí el turno que se paga./)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Turno de consultorio"), "51");
    await userEvent.type(screen.getByLabelText("Monto"), "8000");
    await userEvent.selectOptions(screen.getByLabelText("Medio de pago"), "DEBITO");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      concepto: "SESION_CONSULTORIO",
      monto: 8000,
      medio: "DEBITO",
      turnoId: 51,
    });
  });

  it("PU-23 persona que no es socia del gimnasio: sin cuota, arranca en sesión", () => {
    montar({
      estado: unEstadoCuenta({ esSocioGym: false, periodos: [], umbral: 0 }),
    });
    expect(screen.getByRole("button", { name: "Cuota mensual" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sesión de consultorio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/No es socio del gimnasio/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Período")).not.toBeInTheDocument();
  });

  it("PU-24 muestra el error del servidor y bloquea el doble envío", async () => {
    const { onConfirmar } = montar({ error: "Ese período ya está pagado", enviando: true });
    expect(screen.getByText("No se pudo registrar el pago")).toBeInTheDocument();
    expect(screen.getByText("Ese período ya está pagado")).toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Registrando…" });
    expect(boton).toBeDisabled();
    await userEvent.click(boton);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("estados de la lista de turnos: cargando, sin turnos y error de carga", async () => {
    const base = unEstadoCuenta({ esSocioGym: false, periodos: [], umbral: 0 });
    const { unmount } = render(
      <RegistrarPagoDialog
        nombre="Ana"
        estado={base}
        turnos={null}
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    expect(screen.getByText("Cargando turnos…")).toBeInTheDocument();
    unmount();

    const vacio = render(
      <RegistrarPagoDialog
        nombre="Ana"
        estado={base}
        turnos={[TURNOS[2]]}
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    expect(screen.getByText("No tiene turnos de consultorio para cobrar.")).toBeInTheDocument();
    vacio.unmount();

    render(
      <RegistrarPagoDialog
        nombre="Ana"
        estado={base}
        turnos={null}
        errorTurnos
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No se pudieron cargar los turnos de consultorio."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando turnos…")).not.toBeInTheDocument();
  });

  it("cancelar cierra sin enviar, y sin períodos sin pagar no sugiere ninguno", async () => {
    const { onCancelar, onConfirmar } = montar({
      estado: unEstadoCuenta({
        periodos: [unPeriodo({ periodo: "2026-12-01" })],
        sesiones: [],
      }),
    });
    // Todo pagado: el primer adelanto (enero) queda como sugerido.
    expect(screen.getByLabelText("Período")).toHaveValue("2027-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("socio con cuota habilitada sin períodos no ofrece opciones y exige elegir", async () => {
    const { onConfirmar } = montar({
      estado: unEstadoCuenta({ periodos: [], sesiones: [] }),
    });
    expect(screen.getByLabelText("Período")).toHaveDisplayValue("Elegí un período");
    await userEvent.type(screen.getByLabelText("Monto"), "100");
    await userEvent.selectOptions(screen.getByLabelText("Medio de pago"), "CREDITO");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.getByText(/Elegí el período que se paga./)).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
