import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as personasApi from "../api/personasApi";
import { renderWithRouter } from "../test/renderWithRouter";
import { unaPersona } from "../test/personaFixture";
import { PersonasPage } from "./PersonasPage";

vi.mock("../api/personasApi", async (importOriginal) => {
  const real = await importOriginal<typeof personasApi>();
  return {
    ...real,
    listarPersonas: vi.fn(),
    crearPersona: vi.fn(),
    actualizarPersona: vi.fn(),
    darDeBajaPersona: vi.fn(),
    reactivarPersona: vi.fn(),
  };
});

const juan = unaPersona();
const pedro = unaPersona({ id: 6, nombre: "Pedro", apellido: "Gómez", dni: "38100006", estado: "INACTIVO", esSocioGym: false, fechaInicioMembresia: null, fechaBaja: "2026-05-31" });

describe("PersonasPage", () => {
  beforeEach(() => {
    vi.mocked(personasApi.listarPersonas).mockResolvedValue([juan, pedro]);
  });

  it("lista las personas y filtra por estado", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PersonasPage />);

    expect(await screen.findByText("García, Juan")).toBeInTheDocument();
    expect(personasApi.listarPersonas).toHaveBeenLastCalledWith("TODOS", "");

    await user.click(screen.getByRole("button", { name: "Inactivos" }));
    await waitFor(() => expect(personasApi.listarPersonas).toHaveBeenLastCalledWith("INACTIVOS", ""));
    expect(screen.getByRole("button", { name: "Inactivos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("busca por texto", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PersonasPage />);
    await screen.findByText("García, Juan");

    await user.type(screen.getByLabelText("Buscar por nombre, apellido o DNI"), "381");
    await waitFor(() => expect(personasApi.listarPersonas).toHaveBeenLastCalledWith("TODOS", "381"));
  });

  it("da de alta una persona y refresca el listado", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.crearPersona).mockResolvedValue(unaPersona({ id: 9, nombre: "Ana", apellido: "López" }));
    renderWithRouter(<PersonasPage />);
    await screen.findByText("García, Juan");

    await user.click(screen.getByRole("button", { name: "+ Nueva persona" }));
    const form = within(screen.getByRole("form", { name: "Nueva persona" }));
    await user.type(form.getByLabelText("Email"), "ana@mail.com");
    await user.type(form.getByLabelText("Contraseña inicial"), "Clave1234");
    await user.type(form.getByLabelText("Nombre"), "Ana");
    await user.type(form.getByLabelText("Apellido"), "López");
    await user.type(form.getByLabelText("DNI"), "40000001");
    await user.click(form.getByRole("button", { name: "Dar de alta" }));

    expect(await screen.findByRole("status")).toHaveTextContent("López, Ana se agregó a Personas.");
    expect(screen.queryByRole("form", { name: "Nueva persona" })).not.toBeInTheDocument();
    expect(personasApi.crearPersona).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@mail.com" }));
  });

  it("muestra el 409 del servidor dentro del formulario", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.actualizarPersona).mockRejectedValue(
      new ApiError(409, "Ya existe otra persona con el DNI 38100006"),
    );
    renderWithRouter(<PersonasPage />);

    await user.click(within(await screen.findByTestId("persona-1")).getByRole("button", { name: "Editar" }));
    const form = within(screen.getByRole("form", { name: "Editar persona" }));
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(await form.findByRole("alert")).toHaveTextContent("Ya existe otra persona con el DNI 38100006");
    await user.click(form.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("guarda la edición", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.actualizarPersona).mockResolvedValue(juan);
    renderWithRouter(<PersonasPage />);

    await user.click(within(await screen.findByTestId("persona-1")).getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Se guardaron los cambios de García, Juan.");
    expect(personasApi.actualizarPersona).toHaveBeenCalledWith(1, expect.objectContaining({ dni: "38100002" }));
  });

  it("da de baja con confirmación y reactiva", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.darDeBajaPersona).mockResolvedValue({ ...juan, estado: "INACTIVO" });
    vi.mocked(personasApi.reactivarPersona).mockResolvedValue({ ...pedro, estado: "ACTIVO" });
    renderWithRouter(<PersonasPage />);

    const fila = within(await screen.findByTestId("persona-1"));
    await user.click(fila.getByRole("button", { name: "Baja" }));
    await user.click(fila.getByRole("button", { name: "Sí, dar de baja" }));
    expect(await screen.findByRole("status")).toHaveTextContent("García, Juan quedó dada de baja.");

    await user.click(within(screen.getByTestId("persona-6")).getByRole("button", { name: "Reactivar" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Gómez, Pedro volvió a estar activa."));
  });

  it("informa un 403 y un error de red al listar", async () => {
    vi.mocked(personasApi.listarPersonas).mockRejectedValueOnce(new ApiError(403, "x"));
    const { unmount } = renderWithRouter(<PersonasPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("no tiene permiso");
    unmount();

    vi.mocked(personasApi.listarPersonas).mockRejectedValueOnce(new Error("red"));
    renderWithRouter(<PersonasPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la operación");
  });

  it("si falla una baja, lo muestra", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.darDeBajaPersona).mockRejectedValue(new ApiError(409, "La persona ya está dada de baja"));
    renderWithRouter(<PersonasPage />);

    const fila = within(await screen.findByTestId("persona-1"));
    await user.click(fila.getByRole("button", { name: "Baja" }));
    await user.click(fila.getByRole("button", { name: "Sí, dar de baja" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La persona ya está dada de baja");
  });
});
