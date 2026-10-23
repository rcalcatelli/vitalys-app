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
      dni="38100002"
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
  it("muestra nombre y DNI de la persona", () => {
    montar();
    expect(screen.getByText(/Juan García · DNI/)).toBeInTheDocument();
    expect(screen.getByText("38100002")).toBeInTheDocument();
  });

  it("PU-19 cuota: sugiere el primer período impago y rotula el estado de cada opción", () => {
    montar();
    const periodo = screen.getByLabelText("Período");
    expect(periodo).toHaveValue("2026-10-01");
    expect(screen.getByRole("option", { name: "Septiembre 2026 · pagado" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Octubre 2026 · impago · sugerido" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Noviembre 2026 · pendiente" })).toBeEnabled();
    // Pago adelantado: dos meses después del último período.
    expect(screen.getByRole("option", { name: "Diciembre 2026 · pendiente" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Enero 2027 · pendiente" })).toBeEnabled();
    expect(
      screen.getByText(
        "Sugerido: octubre 2026, el primer período impago. Un pago no cancela otro mes salteado.",
      ),
    ).toBeInTheDocument();
  });

  it("sin impagos sugiere el próximo período a pagar", () => {
    montar({
      estado: unEstadoCuenta({
        periodos: [unPeriodo({ periodo: "2026-10-01", estado: "PENDIENTE", pago: null })],
        sesiones: [],
      }),
    });
    expect(
      screen.getByText("Sugerido: octubre 2026, el próximo período a pagar."),
    ).toBeInTheDocument();
  });

  it("PU-20 el botón queda deshabilitado y los errores aparecen al tocar cada campo", async () => {
    const { onConfirmar } = montar();
    const registrar = screen.getByRole("button", { name: "Registrar pago" });
    expect(registrar).toBeDisabled();
    expect(screen.queryByText("Ingresá el monto.")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Monto"), "0");
    expect(screen.getByText("El monto tiene que ser mayor a 0.")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Monto"));
    expect(screen.getByText("Ingresá el monto.")).toBeInTheDocument();

    const medio = screen.getByLabelText("Medio de pago");
    await userEvent.selectOptions(medio, "EFECTIVO");
    await userEvent.selectOptions(medio, "");
    expect(screen.getByText("Elegí un medio de pago.")).toBeInTheDocument();
    expect(registrar).toBeDisabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("el monto lleva el prefijo $ y descarta lo que no es número", async () => {
    montar();
    expect(screen.getByText("$")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Monto"), "1a5b0,50");
    expect(screen.getByLabelText("Monto")).toHaveValue("150,50");
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
    const { onConfirmar } = montar({
      profesionalDe: (id) => (id === 1 ? "Lic. Valentina Méndez" : null),
    });
    await userEvent.click(screen.getByRole("button", { name: "Sesión de consultorio" }));

    const opciones = screen
      .getAllByRole("option")
      .filter((o) => /· \d\d:\d\d/.test(o.textContent ?? ""));
    expect(opciones).toHaveLength(2);
    // Más reciente primero; el ya pagado queda deshabilitado.
    expect(opciones[0]).toHaveTextContent("Jue 29/10/2026 · 11:00 · Lic. Valentina Méndez");
    expect(opciones[1]).toBeDisabled();
    expect(opciones[1]).toHaveTextContent("· ya pagado");
    expect(screen.getByText("No se muestran los turnos cancelados.")).toBeInTheDocument();

    const turno = screen.getByLabelText("Turno de consultorio");
    await userEvent.selectOptions(turno, "51");
    await userEvent.selectOptions(turno, "");
    expect(screen.getByText("Elegí el turno que se paga.")).toBeInTheDocument();

    await userEvent.selectOptions(turno, "51");
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
    expect(
      screen.getByText(
        /Juan García no es socio\/a del gimnasio, así que no tiene cuotas mensuales/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Período")).not.toBeInTheDocument();
  });

  it("una persona dada de baja tampoco genera cuotas", () => {
    montar({ dadaDeBaja: true });
    expect(screen.getByRole("button", { name: "Cuota mensual" })).toBeDisabled();
    expect(
      screen.getByText(/tiene el gimnasio dado de baja, así que no genera cuotas mensuales/),
    ).toBeInTheDocument();
  });

  it("PU-24 muestra el error del servidor y bloquea el doble envío", async () => {
    const { onConfirmar } = montar({ error: "Ese período ya está pagado", enviando: true });
    expect(screen.getByText("No se pudo registrar el pago")).toBeInTheDocument();
    expect(screen.getByText("Ese período ya está pagado")).toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Registrando pago…" });
    expect(boton).toBeDisabled();
    await userEvent.click(boton);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("estados de la lista de turnos: cargando, sin turnos y error de carga", async () => {
    const base = unEstadoCuenta({ esSocioGym: false, periodos: [], umbral: 0 });
    const { unmount } = render(
      <RegistrarPagoDialog
        nombre="Ana"
        dni="1"
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
        dni="1"
        estado={base}
        turnos={[TURNOS[2]]}
        onConfirmar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        /No tiene turnos de consultorio para cobrar\. Los turnos cancelados no se pueden cobrar\./,
      ),
    ).toBeInTheDocument();
    vacio.unmount();

    render(
      <RegistrarPagoDialog
        nombre="Ana"
        dni="1"
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

  it("cancelar cierra sin enviar, y con todo pagado sugiere el primer adelanto", async () => {
    const { onCancelar, onConfirmar } = montar({
      estado: unEstadoCuenta({
        periodos: [unPeriodo({ periodo: "2026-12-01" })],
        sesiones: [],
      }),
    });
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
    expect(
      screen.getByText("Elegí el período que se paga.", { selector: "span" }),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Monto"), "100");
    await userEvent.selectOptions(screen.getByLabelText("Medio de pago"), "CREDITO");
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("elegir un período y volver a vaciarlo marca el campo", async () => {
    montar();
    const periodo = screen.getByLabelText("Período");
    await userEvent.selectOptions(periodo, "");
    expect(screen.getAllByText("Elegí el período que se paga.").length).toBeGreaterThan(0);
  });
});
