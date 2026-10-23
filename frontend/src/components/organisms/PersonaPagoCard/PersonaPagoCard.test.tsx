import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unaPersona } from "../../../test/personaFixture";
import { PersonaPagoCard } from "./PersonaPagoCard";

const persona = unaPersona({
  nombre: "María",
  apellido: "Pérez",
  dni: "38100001",
  especialidades: ["NUTRICION"],
});

describe("PersonaPagoCard", () => {
  it("muestra iniciales, nombre, DNI y los chips de servicio", () => {
    render(<PersonaPagoCard persona={persona} onCambiar={vi.fn()} onRegistrarPago={vi.fn()} />);
    expect(screen.getByText("MP")).toBeInTheDocument();
    expect(screen.getByText("María Pérez")).toBeInTheDocument();
    expect(screen.getByText("38100001")).toBeInTheDocument();
    expect(screen.getByText("Gimnasio")).toBeInTheDocument();
    expect(screen.getByText("Nutrición")).toBeInTheDocument();
  });

  it("'Cambiar persona' y 'Registrar pago' avisan; sin excepción no hay botón de excepción", async () => {
    const onCambiar = vi.fn();
    const onRegistrarPago = vi.fn();
    render(
      <PersonaPagoCard persona={persona} onCambiar={onCambiar} onRegistrarPago={onRegistrarPago} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cambiar persona" }));
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(onCambiar).toHaveBeenCalledOnce();
    expect(onRegistrarPago).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Autorizar excepción" })).not.toBeInTheDocument();
  });

  it("ofrece 'Autorizar excepción' solo si el contenedor lo pide y deshabilita el pago si hace falta", async () => {
    const onAutorizarExcepcion = vi.fn();
    render(
      <PersonaPagoCard
        persona={persona}
        onCambiar={vi.fn()}
        onRegistrarPago={vi.fn()}
        onAutorizarExcepcion={onAutorizarExcepcion}
        pagoDeshabilitado
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Autorizar excepción" }));
    expect(onAutorizarExcepcion).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();
  });
});
