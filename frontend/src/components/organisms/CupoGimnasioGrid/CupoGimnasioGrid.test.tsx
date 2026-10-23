import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FranjaGym } from "../../../types/turno";
import { CupoGimnasioGrid } from "./CupoGimnasioGrid";

const AHORA = new Date("2026-10-26T12:30:00Z"); // 09:30 en Buenos Aires

function franja(hora: number, ocupados: number, cupo = 20): FranjaGym {
  const h = String(hora).padStart(2, "0");
  const f = String(hora + 1).padStart(2, "0");
  return {
    inicio: `2026-10-26T${h}:00:00-03:00`,
    fin: `2026-10-26T${f}:00:00-03:00`,
    cupo,
    ocupados,
    disponibles: cupo - ocupados,
  };
}

describe("CupoGimnasioGrid", () => {
  it("muestra horarios y lugares libres, y deja elegir una franja libre", async () => {
    const onElegir = vi.fn();
    render(
      <CupoGimnasioGrid
        franjas={[franja(12, 19), franja(13, 5)]}
        ahora={AHORA}
        tuTurno={null}
        seleccionada={null}
        onElegir={onElegir}
      />,
    );
    expect(screen.getByText("1 lugar libre")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /13:00 – 14:00/ }));
    expect(onElegir).toHaveBeenCalledWith("2026-10-26T13:00:00-03:00");
  });

  it("bloquea las franjas pasadas y las del día con turno propio", () => {
    render(
      <CupoGimnasioGrid
        franjas={[franja(8, 3), franja(12, 0), franja(13, 0)]}
        ahora={AHORA}
        tuTurno="2026-10-26T13:00:00-03:00"
        seleccionada={null}
        onElegir={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /08:00 – 09:00/ })).toBeDisabled();
    expect(screen.getByText("Ya pasó")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /12:00 – 13:00/ })).toBeDisabled();
    expect(screen.getByText("Ya tenés turno este día")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /13:00 – 14:00/ })).toBeDisabled();
    expect(screen.getByText("Tu turno")).toBeInTheDocument();
  });

  it("sin turno propio, la franja sin cupo dice Cupo completo y no es clickeable", () => {
    render(
      <CupoGimnasioGrid
        franjas={[franja(12, 20)]}
        ahora={AHORA}
        tuTurno={null}
        seleccionada={null}
        onElegir={vi.fn()}
      />,
    );
    expect(screen.getByText("Cupo completo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /12:00 – 13:00/ })).toBeDisabled();
  });

  it("marca la franja seleccionada", () => {
    render(
      <CupoGimnasioGrid
        franjas={[franja(12, 2)]}
        ahora={AHORA}
        tuTurno={null}
        seleccionada="2026-10-26T12:00:00-03:00"
        onElegir={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /12:00 – 13:00/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("muestra ocupados/cupo y cierra la franja a menos de 1 h de su inicio", () => {
    render(
      <CupoGimnasioGrid
        franjas={[franja(10, 7), franja(11, 4)]}
        ahora={AHORA}
        tuTurno={null}
        seleccionada={null}
        onElegir={vi.fn()}
      />,
    );
    expect(screen.getByText("7/20")).toBeInTheDocument();
    // 09:30: la de 10:00 cierra a las 09:00; la de 11:00 sigue abierta.
    expect(screen.getByText("Cierra 1 h antes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /10:00 – 11:00/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /11:00 – 12:00/ })).toBeEnabled();
  });
});
