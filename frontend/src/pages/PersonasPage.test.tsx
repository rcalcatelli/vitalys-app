import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as personasApi from "../api/personasApi";
import { renderWithRouter } from "../test/renderWithRouter";
import { unaPersona } from "../test/personaFixture";
import { PersonasPage } from "./PersonasPage";

// El AdminNav consulta las notificaciones fallidas: sin esto dispararía un fetch real.
vi.mock(
  "../api/notificacionesApi",
  async () => (await import("../test/notificacionesApiMock")).notificacionesApiVacia,
);

vi.mock("../api/personasApi", async (importOriginal) => {
  const real = await importOriginal<typeof personasApi>();
  return {
    ...real,
    listarPersonas: vi.fn(),
    crearPersona: vi.fn(),
    actualizarPersona: vi.fn(),
    darDeBajaPersona: vi.fn(),
    reactivarPersona: vi.fn(),
    vincularPersona: vi.fn(),
  };
});

const juan = unaPersona();
const pedro = unaPersona({
  id: 6,
  nombre: "Pedro",
  apellido: "Gómez",
  dni: "38100006",
  estado: "INACTIVO",
  esSocioGym: false,
  fechaInicioMembresia: null,
  fechaBaja: "2026-05-31",
});

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
    await waitFor(() =>
      expect(personasApi.listarPersonas).toHaveBeenLastCalledWith("INACTIVOS", ""),
    );
    expect(screen.getByRole("button", { name: "Inactivos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("busca por texto", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PersonasPage />);
    await screen.findByText("García, Juan");

    await user.type(screen.getByLabelText("Buscar por nombre, apellido o DNI"), "381");
    await waitFor(() =>
      expect(personasApi.listarPersonas).toHaveBeenLastCalledWith("TODOS", "381"),
    );
  });

  it("da de alta una persona y refresca el listado", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.crearPersona).mockResolvedValue(
      unaPersona({ id: 9, nombre: "Ana", apellido: "López" }),
    );
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
    expect(personasApi.crearPersona).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@mail.com" }),
    );
  });

  it("muestra el 409 del servidor dentro del formulario", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.actualizarPersona).mockRejectedValue(
      new ApiError(409, "Ya existe otra persona con el DNI 38100006"),
    );
    renderWithRouter(<PersonasPage />);

    await user.click(
      within(await screen.findByTestId("persona-1")).getByRole("button", { name: "Editar" }),
    );
    const form = within(screen.getByRole("form", { name: "Editar persona" }));
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(await form.findByRole("alert")).toHaveTextContent(
      "Ya existe otra persona con el DNI 38100006",
    );
    await user.click(form.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("guarda la edición", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.actualizarPersona).mockResolvedValue(juan);
    renderWithRouter(<PersonasPage />);

    await user.click(
      within(await screen.findByTestId("persona-1")).getByRole("button", { name: "Editar" }),
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Se guardaron los cambios de García, Juan.",
    );
    expect(personasApi.actualizarPersona).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ dni: "38100002" }),
    );
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

    await user.click(
      within(screen.getByTestId("persona-6")).getByRole("button", { name: "Reactivar" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Gómez, Pedro volvió a estar activa."),
    );
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
    vi.mocked(personasApi.darDeBajaPersona).mockRejectedValue(
      new ApiError(409, "La persona ya está dada de baja"),
    );
    renderWithRouter(<PersonasPage />);

    const fila = within(await screen.findByTestId("persona-1"));
    await user.click(fila.getByRole("button", { name: "Baja" }));
    await user.click(fila.getByRole("button", { name: "Sí, dar de baja" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La persona ya está dada de baja");
  });

  it("vincula una ficha a un usuario ya registrado, sin pedir contraseña", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.vincularPersona).mockResolvedValue(
      unaPersona({ id: 12, nombre: "Laura", apellido: "Benítez" }),
    );
    renderWithRouter(<PersonasPage />);
    await screen.findByText("García, Juan");

    await user.click(screen.getByRole("button", { name: "Vincular usuario existente" }));
    const form = within(screen.getByRole("form", { name: "Vincular usuario existente" }));
    expect(form.queryByLabelText("Contraseña inicial")).not.toBeInTheDocument();
    await user.type(form.getByLabelText("Email con el que se registró"), "laura@mail.com");
    await user.type(form.getByLabelText("Nombre"), "Laura");
    await user.type(form.getByLabelText("Apellido"), "Benítez");
    await user.type(form.getByLabelText("DNI"), "40000012");
    await user.click(form.getByRole("button", { name: "Vincular ficha" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Benítez, Laura quedó vinculada a su cuenta.",
    );
    expect(personasApi.vincularPersona).toHaveBeenCalledWith({
      email: "laura@mail.com",
      datos: expect.objectContaining({ dni: "40000012", nombre: "Laura" }),
    });
  });

  it("si el email no tiene usuario, ofrece el alta con credenciales nuevas (W-07)", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.vincularPersona).mockRejectedValue(new ApiError(404, "x"));
    renderWithRouter(<PersonasPage />);
    await screen.findByText("García, Juan");

    await user.click(screen.getByRole("button", { name: "Vincular usuario existente" }));
    const form = within(screen.getByRole("form", { name: "Vincular usuario existente" }));
    await user.type(form.getByLabelText("Email con el que se registró"), "nadie@mail.com");
    await user.type(form.getByLabelText("Nombre"), "Laura");
    await user.type(form.getByLabelText("Apellido"), "Benítez");
    await user.type(form.getByLabelText("DNI"), "40000012");
    await user.click(form.getByRole("button", { name: "Vincular ficha" }));

    expect(await form.findByRole("alert")).toHaveTextContent("No existe un usuario registrado");
    await user.click(screen.getByRole("button", { name: "Crear con credenciales nuevas →" }));
    expect(screen.getByRole("form", { name: "Nueva persona" })).toBeInTheDocument();
  });

  it("si el usuario ya está vinculado muestra el 409 y no ofrece el alta", async () => {
    const user = userEvent.setup();
    vi.mocked(personasApi.vincularPersona).mockRejectedValue(
      new ApiError(409, "Ese usuario ya está vinculado a una persona"),
    );
    renderWithRouter(<PersonasPage />);
    await screen.findByText("García, Juan");

    await user.click(screen.getByRole("button", { name: "Vincular usuario existente" }));
    const form = within(screen.getByRole("form", { name: "Vincular usuario existente" }));
    await user.type(form.getByLabelText("Email con el que se registró"), "juan@mail.com");
    await user.type(form.getByLabelText("Nombre"), "Juan");
    await user.type(form.getByLabelText("Apellido"), "García");
    await user.type(form.getByLabelText("DNI"), "38100002");
    await user.click(form.getByRole("button", { name: "Vincular ficha" }));

    expect(await form.findByRole("alert")).toHaveTextContent("ya está vinculado");
    expect(
      screen.queryByRole("button", { name: "Crear con credenciales nuevas →" }),
    ).not.toBeInTheDocument();
  });
});
