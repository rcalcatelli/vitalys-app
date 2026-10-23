import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unResumen } from "../../../test/resumenFixture";
import { PanelHoy } from "./PanelHoy";

const AHORA = new Date("2026-10-26T10:20:00-03:00");

function montar(resumen = unResumen(), ahora = AHORA, onIrAPagos = vi.fn()) {
  render(<PanelHoy resumen={resumen} ahora={ahora} onIrAPagos={onIrAPagos} />);
  return onIrAPagos;
}

describe("PanelHoy", () => {
  it("muestra los cuatro indicadores con sus rótulos reales", () => {
    montar();
    const kpis = within(screen.getByRole("region", { name: "Indicadores del día" }));
    expect(kpis.getByText("En el gimnasio ahora")).toBeInTheDocument();
    expect(kpis.getByText("franja 10:00 · de 20 lugares")).toBeInTheDocument();
    expect(kpis.getByText("Turnos de gym hoy")).toBeInTheDocument();
    expect(kpis.getByText("14")).toBeInTheDocument();
    expect(kpis.getByText("3 franjas · 23% ocupado")).toBeInTheDocument();
    expect(kpis.getByText("Consultas hoy")).toBeInTheDocument();
    expect(kpis.getByText("en consultorio")).toBeInTheDocument();
  });

  it("PI-138: el cuarto indicador cuenta personas con impagos, no períodos", () => {
    montar();
    const kpis = within(screen.getByRole("region", { name: "Indicadores del día" }));
    expect(kpis.getByText("Socios con impagos")).toBeInTheDocument();
    expect(kpis.queryByText("Períodos impagos")).not.toBeInTheDocument();
    expect(kpis.getByText("2")).toBeInTheDocument();
    expect(kpis.getByText("1 con reserva suspendida")).toBeInTheDocument();
  });

  it("fuera de una franja en curso no inventa una", () => {
    montar(unResumen(), new Date("2026-10-26T07:00:00-03:00"));
    expect(screen.getByText("sin franja en curso")).toBeInTheDocument();
  });

  it("marca la franja en curso y dibuja las futuras punteadas", () => {
    montar();
    const enCurso = screen.getByLabelText("10:00: 8 de 20");
    expect(enCurso).toHaveAttribute("aria-current", "time");
    expect(screen.getByLabelText("09:00: 6 de 20")).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("11:00: 0 de 20").querySelector(".border-dashed")).not.toBeNull();
    expect(screen.getByLabelText("09:00: 6 de 20").querySelector(".border-dashed")).toBeNull();
  });

  it("explica las barras con la leyenda y la línea de cupo", () => {
    montar();
    const grafico = within(
      screen.getByRole("region", { name: "Ocupación del gimnasio por franja" }),
    );
    expect(grafico.getByText("Pasadas")).toBeInTheDocument();
    expect(grafico.getByText("En curso")).toBeInTheDocument();
    expect(grafico.getByText("Reservadas")).toBeInTheDocument();
    expect(grafico.getByText("Cupo 20")).toBeInTheDocument();
  });

  it("distingue excepción, suspensión e impagos por debajo del umbral, con Nombre Apellido", () => {
    montar();
    const atencion = within(screen.getByRole("region", { name: "Requieren atención" }));
    expect(atencion.getByText("3 personas")).toBeInTheDocument();
    expect(atencion.getByText("Juan García")).toBeInTheDocument();
    expect(atencion.getByText("Pablo Ruiz")).toBeInTheDocument();
    expect(
      atencion.getByText("Excepción vigente hasta 20/11/2026 · 6 períodos impagos"),
    ).toBeInTheDocument();
    expect(
      atencion.getByText("7 períodos impagos · reserva de gimnasio suspendida"),
    ).toBeInTheDocument();
    expect(atencion.getByText("2 de 6 períodos impagos")).toBeInTheDocument();
    expect(atencion.getByText("Excepción")).toBeInTheDocument();
    expect(atencion.getByText("Suspendido")).toBeInTheDocument();
    expect(atencion.getByText("Impagos")).toBeInTheDocument();
  });

  it("si el backend no separó el nombre, muestra el texto que mandó", () => {
    const resumen = unResumen();
    resumen.requierenAtencion = [
      { ...resumen.requierenAtencion[0], nombrePila: "", apellido: "", persona: "García, Juan" },
    ];
    montar(resumen);
    expect(screen.getByText("García, Juan")).toBeInTheDocument();
  });

  it("'Ir a Pagos' avisa al contenedor", async () => {
    const user = userEvent.setup();
    const onIrAPagos = montar();
    await user.click(screen.getByRole("button", { name: "Ir a Pagos" }));
    expect(onIrAPagos).toHaveBeenCalledOnce();
  });

  it("día cerrado y sin deudas", () => {
    montar(
      unResumen({
        franjasGym: [],
        turnosGymHoy: 0,
        requierenAtencion: [],
        conDeuda: 0,
        suspendidos: 0,
      }),
    );
    expect(screen.getAllByText(/Hoy el gimnasio no abre/)).toHaveLength(2);
    expect(screen.getByText("Nadie tiene períodos impagos.")).toBeInTheDocument();
  });

  it("una sola persona y un solo impago se dicen en singular", () => {
    montar(
      unResumen({
        requierenAtencion: [
          {
            personaId: 1,
            persona: "Paz, Ana",
            nombrePila: "Ana",
            apellido: "Paz",
            dni: "1",
            periodosImpagos: 1,
            umbral: 6,
            suspendido: true,
            excepcionHasta: null,
          },
        ],
      }),
    );
    expect(screen.getByText("1 persona")).toBeInTheDocument();
    expect(
      screen.getByText("1 período impago · reserva de gimnasio suspendida"),
    ).toBeInTheDocument();
  });
});
