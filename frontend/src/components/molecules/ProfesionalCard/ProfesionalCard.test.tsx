import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProximaAgenda } from "../../../types/turno";
import { ProfesionalCard, textoProximaAgenda } from "./ProfesionalCard";

function agenda(o: Partial<ProximaAgenda> = {}): ProximaAgenda {
  return {
    profesionalId: 1,
    nombre: "Valentina",
    apellido: "Méndez",
    especialidad: "NUTRICION",
    duracionTurnoMinutos: 30,
    fecha: "2026-09-29",
    libres: 2,
    ...o,
  };
}

describe("ProfesionalCard", () => {
  it("muestra especialidad, duración, nombre y la próxima agenda", async () => {
    const onElegir = vi.fn();
    render(
      <ProfesionalCard agenda={agenda()} hoy="2026-09-29" activo={false} onElegir={onElegir} />,
    );
    expect(screen.getByText("Nutrición")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(screen.getByText("Próxima agenda: hoy, mar 29 sep · 2 libres")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    expect(onElegir).toHaveBeenCalledWith(1);
  });

  it("sin agenda no se puede elegir", () => {
    render(
      <ProfesionalCard
        agenda={agenda({ fecha: null, libres: 0 })}
        hoy="2026-09-29"
        activo={false}
        onElegir={vi.fn()}
      />,
    );
    expect(screen.getByText("Sin agenda próxima")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("la tarjeta activa queda marcada", () => {
    render(<ProfesionalCard agenda={agenda()} hoy="2026-09-29" activo onElegir={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("dice 1 libre en singular y la fecha relativa", () => {
    expect(textoProximaAgenda(agenda({ fecha: "2026-09-30", libres: 1 }), "2026-09-29")).toBe(
      "Próxima agenda: mañana, mié 30 sep · 1 libre",
    );
    expect(textoProximaAgenda(agenda({ fecha: "2026-10-02", libres: 4 }), "2026-09-29")).toBe(
      "Próxima agenda: en 3 días, vie 2 oct · 4 libres",
    );
  });
});
