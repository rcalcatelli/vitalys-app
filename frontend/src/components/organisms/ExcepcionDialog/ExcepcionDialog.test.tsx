import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExcepcionDialog, type ExcepcionDialogProps } from "./ExcepcionDialog";

function montar(props: Partial<ExcepcionDialogProps> = {}) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <ExcepcionDialog
      nombre="Juan García"
      periodosImpagos={7}
      hoy="2026-10-26"
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />,
  );
  return { onConfirmar, onCancelar };
}

const fecha = (valor: string) =>
  fireEvent.change(screen.getByLabelText("Válida hasta"), { target: { value: valor } });

describe("ExcepcionDialog", () => {
  it("explica a quién habilita y que queda registrada", () => {
    montar();
    expect(screen.getByText(/Habilita a/)).toHaveTextContent(
      "Habilita a Juan García a reservar el gimnasio aunque tenga 7 períodos impagos. Queda registrada con tu usuario, fecha y motivo.",
    );
    expect(screen.getByLabelText("Válida hasta")).toHaveAttribute("min", "2026-10-26");
  });

  it("PI-136 envía motivo, vencimiento y la modalidad elegida", async () => {
    const { onConfirmar } = montar();
    await userEvent.type(screen.getByLabelText("Motivo"), "  Pagará el viernes  ");
    fecha("2026-11-05");
    expect(screen.getByRole("button", { name: "Hasta el vencimiento" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Una sola reserva" }));
    await userEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      motivo: "Pagará el viernes",
      validaHasta: "2026-11-05",
      unSoloUso: true,
    });
  });

  it("valida: sin motivo ni fecha no se envía y el botón queda deshabilitado", async () => {
    const { onConfirmar } = montar();
    expect(screen.getByRole("button", { name: "Autorizar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Motivo"), "x");
    await userEvent.clear(screen.getByLabelText("Motivo"));
    expect(screen.getByText("Indicá el motivo de la excepción.")).toBeInTheDocument();

    fecha("2026-11-05");
    fecha("");
    expect(screen.getByText("Elegí hasta cuándo vale la excepción.")).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("no acepta una fecha pasada", async () => {
    montar();
    await userEvent.type(screen.getByLabelText("Motivo"), "x");
    fecha("2026-10-25");
    expect(screen.getByText("La fecha no puede ser anterior a hoy.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Autorizar" })).toBeDisabled();

    fecha("2026-10-26");
    expect(screen.getByRole("button", { name: "Autorizar" })).toBeEnabled();
  });

  it("limita el motivo a 500 caracteres", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "a".repeat(501) } });
    expect(screen.getByText("El motivo no puede superar los 500 caracteres.")).toBeInTheDocument();
  });

  it("muestra el error del servidor y bloquea mientras se guarda", () => {
    montar({ error: "La persona no está suspendida", enviando: true });
    expect(screen.getByText("No se pudo autorizar la excepción")).toBeInTheDocument();
    expect(screen.getByText("La persona no está suspendida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Autorizando…" })).toBeDisabled();
  });

  it("cancelar cierra sin enviar", async () => {
    const { onCancelar, onConfirmar } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("no envía dos veces mientras se guarda", async () => {
    const { onConfirmar } = montar({ enviando: true });
    await userEvent.type(screen.getByLabelText("Motivo"), "x");
    fecha("2026-11-05");
    await userEvent.click(screen.getByRole("button", { name: "Autorizando…" }));
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
