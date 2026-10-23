import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unTurnoGym } from "../../../test/turnoFixture";
import { IngresoLista } from "./IngresoLista";

const pendiente = unTurnoGym({
  id: 1,
  personaNombre: "Agustín",
  personaApellido: "Ríos",
  personaDni: "42567001",
});
const ingresado = unTurnoGym({
  id: 2,
  personaNombre: "Lucía",
  personaApellido: "Rojas",
  personaDni: "40311852",
  estado: "COMPLETADO",
  completadoEn: "2026-10-26T10:01:00-03:00",
});

function montar(turnos = [pendiente, ingresado], marcandoId: number | null = null) {
  const onMarcar = vi.fn();
  render(
    <IngresoLista turnos={turnos} marcandoId={marcandoId} onMarcar={onMarcar} vacio="Vacío" />,
  );
  return onMarcar;
}

describe("IngresoLista", () => {
  it("los pendientes tienen 'Marcar ingreso' y los ingresados, la hora real", async () => {
    const onMarcar = montar();
    const filas = screen.getAllByRole("listitem");
    expect(within(filas[0]).getByText("Agustín Ríos")).toBeInTheDocument();
    expect(within(filas[0]).getByText("42567001")).toBeInTheDocument();
    await userEvent.click(within(filas[0]).getByRole("button", { name: "Marcar ingreso" }));
    expect(onMarcar).toHaveBeenCalledWith(pendiente);

    expect(within(filas[1]).getByText("Ingresó")).toBeInTheDocument();
    expect(within(filas[1]).getByText("10:01")).toBeInTheDocument();
  });

  it("PI-125 un ingreso anterior a V16 no tiene hora y muestra solo 'Ingresó'", () => {
    montar([{ ...ingresado, completadoEn: null }]);
    expect(screen.getByText("Ingresó")).toBeInTheDocument();
    expect(screen.queryByText(/\d\d:\d\d/)).not.toBeInTheDocument();
  });

  it("no hay 'Deshacer' para un ingreso ya registrado", () => {
    montar([ingresado]);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("un ausente se marca como tal y no ofrece ingreso", () => {
    montar([{ ...pendiente, estado: "AUSENTE" }]);
    expect(screen.getByText("Ausente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar ingreso" })).not.toBeInTheDocument();
  });

  it("deshabilita el botón de quien se está marcando", () => {
    montar([pendiente], 1);
    expect(screen.getByRole("button", { name: "Marcar ingreso" })).toBeDisabled();
  });

  it("sin turnos muestra el texto vacío", () => {
    montar([]);
    expect(screen.getByText("Vacío")).toBeInTheDocument();
  });
});
