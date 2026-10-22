import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unaPersona } from "../../../test/personaFixture";
import { PersonasTable } from "./PersonasTable";

function renderTabla(overrides: Partial<Parameters<typeof PersonasTable>[0]> = {}) {
  const props = {
    personas: [
      unaPersona(),
      unaPersona({
        id: 6,
        nombre: "Pedro",
        apellido: "Gómez",
        dni: "38100006",
        estado: "INACTIVO",
        esSocioGym: false,
        fechaBaja: "2026-05-31",
      }),
    ],
    onEditar: vi.fn(),
    onBaja: vi.fn(),
    onReactivar: vi.fn(),
    ...overrides,
  };
  render(<PersonasTable {...props} />);
  return props;
}

describe("PersonasTable", () => {
  it("muestra estado y gimnasio de cada persona", () => {
    renderTabla();
    const juan = screen.getByTestId("persona-1");
    expect(within(juan).getByText("García, Juan")).toBeInTheDocument();
    expect(within(juan).getByText("Socio gym")).toBeInTheDocument();
    expect(within(juan).getByText("Activo")).toBeInTheDocument();
    const pedro = within(screen.getByTestId("persona-6"));
    expect(pedro.getByText("Inactivo")).toBeInTheDocument();
    expect(pedro.getByText("Baja el 31/05/2026")).toBeInTheDocument();
  });

  it("una persona inactiva solo ofrece reactivar", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    const pedro = within(screen.getByTestId("persona-6"));
    expect(pedro.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    await user.click(pedro.getByRole("button", { name: "Reactivar" }));
    expect(props.onReactivar).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }));
  });

  it("la baja pide confirmación y se puede cancelar", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    const juan = within(screen.getByTestId("persona-1"));

    await user.click(juan.getByRole("button", { name: "Baja" }));
    expect(props.onBaja).not.toHaveBeenCalled();
    await user.click(juan.getByRole("button", { name: "No" }));
    expect(juan.getByRole("button", { name: "Baja" })).toBeInTheDocument();

    await user.click(juan.getByRole("button", { name: "Baja" }));
    await user.click(juan.getByRole("button", { name: "Sí, dar de baja" }));
    expect(props.onBaja).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("editar entrega la persona de la fila", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    await user.click(
      within(screen.getByTestId("persona-1")).getByRole("button", { name: "Editar" }),
    );
    expect(props.onEditar).toHaveBeenCalledWith(expect.objectContaining({ dni: "38100002" }));
  });

  it("sin resultados muestra el mensaje vacío", () => {
    renderTabla({ personas: [] });
    expect(screen.getByText("No hay personas que coincidan.")).toBeInTheDocument();
  });
});
