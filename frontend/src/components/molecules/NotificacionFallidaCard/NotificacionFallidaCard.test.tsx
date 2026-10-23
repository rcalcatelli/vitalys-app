import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { unaNotificacion } from "../../../test/notificacionFixture";
import { NotificacionFallidaCard } from "./NotificacionFallidaCard";

describe("NotificacionFallidaCard", () => {
  it("DEFINITIVA: muestra paciente, turno, motivo, chip 'Falló dos veces' e intentos", () => {
    render(<NotificacionFallidaCard notificacion={unaNotificacion()} />);

    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("juan@mail.com")).toBeInTheDocument();
    expect(screen.getByText("Aviso de cancelación")).toBeInTheDocument();
    expect(screen.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(screen.getByText(/Miércoles 21 de octubre/)).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByText("Buzón lleno")).toBeInTheDocument();
    expect(screen.getByText("Falló dos veces")).toBeInTheDocument();
    expect(screen.getByText("2 intentos · último 14:32")).toBeInTheDocument();
    expect(screen.queryByText(/reinicio del sistema/)).not.toBeInTheDocument();
  });

  it("HUERFANA: chip 'Sin confirmar' con la ayuda del reinicio", () => {
    render(
      <NotificacionFallidaCard
        notificacion={unaNotificacion({ tipo: "HUERFANA", intentos: 1, detalleError: null })}
      />,
    );

    expect(screen.getByText("Sin confirmar")).toBeInTheDocument();
    expect(screen.getByText("Quedó pendiente por un reinicio del sistema")).toBeInTheDocument();
    expect(screen.getByText("1 intento · último 14:32")).toBeInTheDocument();
  });

  it("tolera una notificación sin turno ni último intento", () => {
    render(
      <NotificacionFallidaCard
        notificacion={unaNotificacion({
          fecha: null,
          hora: null,
          profesionalNombre: null,
          ultimoIntentoEn: null,
        })}
      />,
    );

    expect(screen.getByText("2 intentos")).toBeInTheDocument();
    expect(screen.queryByText(/octubre/)).not.toBeInTheDocument();
  });

  it("nombra el tipo de aviso y no inventa profesional en un turno de gimnasio", () => {
    render(
      <NotificacionFallidaCard
        notificacion={unaNotificacion({
          tipoNotificacion: "RECORDATORIO",
          profesionalNombre: null,
        })}
      />,
    );
    expect(screen.getByText("Recordatorio")).toBeInTheDocument();
    expect(screen.queryByText("Lic. Valentina Méndez")).not.toBeInTheDocument();
  });

  it("un tipo desconocido se muestra tal cual", () => {
    render(
      <NotificacionFallidaCard
        notificacion={unaNotificacion({ tipoNotificacion: "AVISO_DEUDA" })}
      />,
    );
    expect(screen.getByText("AVISO_DEUDA")).toBeInTheDocument();
  });
});
