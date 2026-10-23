import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { unaPersona } from "../../../test/personaFixture";
import { PersonasTable } from "./PersonasTable";

function renderTabla(overrides: Partial<Parameters<typeof PersonasTable>[0]> = {}) {
  const props = {
    personas: [
      unaPersona({ especialidades: ["PSICOLOGIA"] }),
      unaPersona({
        id: 6,
        nombre: "Pedro",
        apellido: "Gómez",
        dni: "38100006",
        estado: "INACTIVO",
        esSocioGym: false,
        cuota: null,
        fechaBaja: "2026-05-31",
      }),
      unaPersona({ id: 7, nombre: "Sofía", apellido: "Luna", tieneUsuarioSocio: false }),
    ],
    onEditar: vi.fn(),
    onBaja: vi.fn(),
    onReactivar: vi.fn(),
    onOperarComo: vi.fn(),
    ...overrides,
  };
  render(<PersonasTable {...props} />);
  return props;
}

async function abrirMenu(user: ReturnType<typeof userEvent.setup>, id: number, nombre: string) {
  const fila = within(screen.getByTestId(`persona-${id}`));
  await user.click(fila.getByRole("button", { name: `Más acciones de ${nombre}` }));
  return fila;
}

describe("PersonasTable", () => {
  it("muestra nombre, servicios y cuota de cada persona", () => {
    renderTabla();
    const juan = within(screen.getByTestId("persona-1"));
    expect(juan.getByText("Juan García")).toBeInTheDocument();
    expect(juan.getByText("Gimnasio")).toBeInTheDocument();
    expect(juan.getByText("Psicología")).toBeInTheDocument();
    expect(juan.getByText("Al día")).toBeInTheDocument();
    const pedro = within(screen.getByTestId("persona-6"));
    expect(pedro.getByText("Dado de baja")).toBeInTheDocument();
    expect(pedro.queryByText("Gimnasio")).not.toBeInTheDocument();
  });

  it("PU-33: muestra los impagos sobre el umbral", () => {
    renderTabla({
      personas: [
        unaPersona({
          cuota: { periodosImpagos: 1, umbral: 6, suspendido: false, excepcionHasta: null },
        }),
      ],
    });
    expect(screen.getByText("1 de 6 impagos")).toBeInTheDocument();
  });

  it("'Operar como' solo se ofrece a quien tiene usuario de socio activo", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    await user.click(screen.getByRole("button", { name: "Operar como Juan García" }));
    expect(props.onOperarComo).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    // Pedro está dado de baja y Sofía no tiene usuario vinculado.
    expect(screen.queryByRole("button", { name: "Operar como Pedro Gómez" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Operar como Sofía Luna" })).toBeNull();
  });

  it("una persona inactiva solo ofrece reactivar", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    const pedro = await abrirMenu(user, 6, "Pedro Gómez");
    expect(pedro.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    await user.click(pedro.getByRole("button", { name: "Reactivar" }));
    expect(props.onReactivar).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }));
  });

  it("la baja pide confirmación y se puede cancelar", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    let juan = await abrirMenu(user, 1, "Juan García");

    await user.click(juan.getByRole("button", { name: "Dar de baja" }));
    expect(props.onBaja).not.toHaveBeenCalled();
    await user.click(juan.getByRole("button", { name: "No" }));
    expect(juan.getByRole("button", { name: "Más acciones de Juan García" })).toBeInTheDocument();

    juan = await abrirMenu(user, 1, "Juan García");
    await user.click(juan.getByRole("button", { name: "Dar de baja" }));
    await user.click(juan.getByRole("button", { name: "Sí, dar de baja" }));
    expect(props.onBaja).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("editar entrega la persona de la fila y el fondo del menú lo cierra", async () => {
    const user = userEvent.setup();
    const props = renderTabla();
    let juan = await abrirMenu(user, 1, "Juan García");
    await user.click(screen.getAllByRole("presentation")[0]);
    expect(juan.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();

    juan = await abrirMenu(user, 1, "Juan García");
    await user.click(juan.getByRole("button", { name: "Editar" }));
    expect(props.onEditar).toHaveBeenCalledWith(expect.objectContaining({ dni: "38100002" }));
  });

  it("sin resultados muestra el mensaje vacío", () => {
    renderTabla({ personas: [] });
    expect(screen.getByText("No hay personas que coincidan.")).toBeInTheDocument();
  });
});
