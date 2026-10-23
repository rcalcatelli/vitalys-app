import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { unaNotificacion } from "../../../test/notificacionFixture";
import { NotificacionesFallidas } from "./NotificacionesFallidas";

describe("NotificacionesFallidas", () => {
  it("lista las tarjetas, la nota y el pie 'Avisale al paciente…'", () => {
    render(
      <NotificacionesFallidas
        notificaciones={[unaNotificacion(), unaNotificacion({ id: 2, pacienteNombre: "Ana Paz" })]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Notificaciones fallidas" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "La reserva o la cancelación ya quedó registrada; lo que falló es el aviso al socio.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen.getByText("Avisale al paciente por teléfono o en recepción."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No hay notificaciones fallidas.")).not.toBeInTheDocument();
  });

  it("sin fallidas muestra el estado vacío y no el pie", () => {
    render(<NotificacionesFallidas notificaciones={[]} />);

    expect(screen.getByText("No hay notificaciones fallidas.")).toBeInTheDocument();
    expect(screen.queryByText(/Avisale al paciente/)).not.toBeInTheDocument();
  });
});
