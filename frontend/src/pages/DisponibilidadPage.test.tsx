import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import { unProfesional } from "../test/profesionalFixture";
import { renderWithRouter } from "../test/renderWithRouter";
import { DisponibilidadPage } from "./DisponibilidadPage";

const sesion = vi.hoisted(() => ({ rol: "ADMIN" as "ADMIN" | "PROFESIONAL" }));

vi.mock("../context/AuthContext", async (importOriginal) => {
  const real = await importOriginal<typeof import("../context/AuthContext")>();
  return {
    ...real,
    useAuth: () => ({
      rol: sesion.rol,
      usuario: { id: 1, email: "u@vitalys.com", rol: sesion.rol },
      logout: vi.fn(),
    }),
  };
});

vi.mock("../api/profesionalesApi", async (importOriginal) => {
  const real = await importOriginal<typeof profesionalesApi>();
  return {
    ...real,
    listarProfesionales: vi.fn(),
    miPerfilProfesional: vi.fn(),
    listarFranjas: vi.fn(),
    impactoDeDisponibilidad: vi.fn(),
    reemplazarDisponibilidad: vi.fn(),
  };
});

const valentina = unProfesional();
const pablo = unProfesional({
  id: 2,
  nombre: "Pablo",
  apellido: "Ruiz",
  especialidad: "PSICOLOGIA",
  activo: false,
});
const otra = unProfesional({
  id: 3,
  nombre: "Carla",
  apellido: "Gómez",
  especialidad: "KINESIOLOGIA",
});
const franjaLunes = { id: 10, diaSemana: 1, horaInicio: "09:00:00", horaFin: "12:00:00" };
const turno = {
  turnoId: 7,
  personaId: 3,
  paciente: "Juan García",
  inicio: "2026-10-21T16:30:00Z",
  fin: "2026-10-21T17:00:00Z",
};

function renderAdmin() {
  return renderWithRouter(<DisponibilidadPage />, {
    path: "/admin/profesionales/:id/disponibilidad",
    initialEntries: ["/admin/profesionales/1/disponibilidad"],
    extraRoutes: (
      <Route path="/admin/profesionales" element={<div>Listado de profesionales</div>} />
    ),
  });
}

function renderPropia() {
  return renderWithRouter(<DisponibilidadPage />, { path: "/profesional/disponibilidad" });
}

async function agregarFranja(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "+ Agregar franja" }));
}

describe("DisponibilidadPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sesion.rol = "ADMIN";
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([valentina, pablo, otra]);
    vi.mocked(profesionalesApi.miPerfilProfesional).mockResolvedValue(valentina);
    vi.mocked(profesionalesApi.listarFranjas).mockResolvedValue([franjaLunes]);
  });

  it("ADMIN: carga las franjas del profesional, el selector y el botón de volver", async () => {
    const user = userEvent.setup();
    renderAdmin();

    const franja = within(await screen.findByRole("group", { name: "Franja 1" }));
    expect(franja.getByLabelText("Desde")).toHaveValue("09:00");
    expect(profesionalesApi.listarFranjas).toHaveBeenCalledWith(1);

    const selector = screen.getByLabelText("Profesional:");
    expect(
      within(selector).getByRole("option", { name: "Lic. Valentina Méndez · Nutrición" }),
    ).toBeInTheDocument();
    expect(
      within(selector).getByRole("option", { name: "Lic. Carla Gómez · Kinesiología" }),
    ).toBeInTheDocument();
    // Los inactivos no se ofrecen salvo que sea el profesional actual.
    expect(within(selector).queryByRole("option", { name: /Pablo Ruiz/ })).not.toBeInTheDocument();
    expect(screen.getByText("Consultas de 30 min")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "← Profesionales" }));
    expect(await screen.findByText("Listado de profesionales")).toBeInTheDocument();
  });

  it("ADMIN: cambiar el selector navega a otro profesional", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DisponibilidadPage />, {
      path: "/admin/profesionales/:id/disponibilidad",
      initialEntries: ["/admin/profesionales/1/disponibilidad"],
    });
    await screen.findByRole("group", { name: "Franja 1" });

    vi.mocked(profesionalesApi.listarFranjas).mockResolvedValue([]);
    await user.selectOptions(screen.getByLabelText("Profesional:"), "3");

    await waitFor(() => expect(profesionalesApi.listarFranjas).toHaveBeenLastCalledWith(3));
    expect(await screen.findByText("Sin franjas cargadas.")).toBeInTheDocument();
  });

  it("ADMIN: un profesional inexistente muestra el error", async () => {
    renderWithRouter(<DisponibilidadPage />, {
      path: "/admin/profesionales/:id/disponibilidad",
      initialEntries: ["/admin/profesionales/99/disponibilidad"],
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos a ese profesional.");
  });

  it("PROFESIONAL: usa /me, sin botón de volver ni selector", async () => {
    sesion.rol = "PROFESIONAL";
    renderPropia();

    await screen.findByRole("group", { name: "Franja 1" });
    expect(profesionalesApi.miPerfilProfesional).toHaveBeenCalled();
    expect(profesionalesApi.listarProfesionales).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "← Profesionales" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Profesional:")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Profesional" })).toBeInTheDocument();
  });

  it("ADMIN: no muestra el menú del profesional", async () => {
    renderAdmin();
    await screen.findByRole("group", { name: "Franja 1" });
    expect(screen.queryByRole("navigation", { name: "Profesional" })).not.toBeInTheDocument();
  });

  it("PROFESIONAL sin ficha (404) muestra el mensaje del servidor", async () => {
    sesion.rol = "PROFESIONAL";
    vi.mocked(profesionalesApi.miPerfilProfesional).mockRejectedValue(
      new ApiError(404, "No tenés un perfil de profesional"),
    );
    renderPropia();
    expect(await screen.findByRole("alert")).toHaveTextContent("No tenés un perfil de profesional");
  });

  it("un error inesperado o de permisos al cargar se informa", async () => {
    vi.mocked(profesionalesApi.listarProfesionales).mockRejectedValue(new ApiError(403, "x"));
    renderAdmin();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu usuario no tiene permiso para esta operación.",
    );
  });

  it("detecta solapamientos en el cliente y bloquea el guardado", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await agregarFranja(user);

    // La nueva franja (viernes 09–12) se mueve al lunes y se superpone con la existente.
    const nueva = within(screen.getByRole("group", { name: "Franja 2" }));
    await user.selectOptions(nueva.getByLabelText("Día"), "1");
    await user.selectOptions(nueva.getByLabelText("Desde"), "11:00");

    expect(screen.getAllByText(/Se superpone con Lunes/)).toHaveLength(2);
    expect(
      screen.getByText(
        "Hay franjas que se superponen o son inválidas. Corregilas para poder guardar.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("guarda directo cuando el impacto es cero", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockResolvedValue({
      cantidad: 0,
      turnos: [],
    });
    vi.mocked(profesionalesApi.reemplazarDisponibilidad).mockResolvedValue([
      franjaLunes,
      { id: 11, diaSemana: 5, horaInicio: "09:00:00", horaFin: "12:00:00" },
    ]);
    renderAdmin();
    await agregarFranja(user);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Disponibilidad guardada");
    expect(profesionalesApi.impactoDeDisponibilidad).toHaveBeenCalledWith(1, [
      { diaSemana: 1, horaInicio: "09:00", horaFin: "12:00" },
      { diaSemana: 5, horaInicio: "09:00", horaFin: "12:00" },
    ]);
    expect(profesionalesApi.reemplazarDisponibilidad).toHaveBeenCalledWith(
      1,
      expect.any(Array),
      false,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("con turnos afectados pide confirmación y guarda con confirmar=true", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockResolvedValue({
      cantidad: 1,
      turnos: [turno],
    });
    vi.mocked(profesionalesApi.reemplazarDisponibilidad).mockResolvedValue([]);
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Quitar franja" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const dialogo = within(await screen.findByRole("dialog", { name: "Hay turnos afectados" }));
    expect(dialogo.getByText("Juan García")).toBeInTheDocument();
    expect(profesionalesApi.reemplazarDisponibilidad).not.toHaveBeenCalled();

    await user.click(dialogo.getByRole("button", { name: "Cancelar turnos y guardar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Disponibilidad guardada · 1 turno cancelado",
    );
    expect(profesionalesApi.reemplazarDisponibilidad).toHaveBeenCalledWith(1, [], true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Volver en la confirmación conserva el borrador sin guardar", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockResolvedValue({
      cantidad: 2,
      turnos: [turno, { ...turno, turnoId: 8 }],
    });
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Quitar franja" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await user.click(await screen.findByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Sin franjas cargadas.")).toBeInTheDocument();
    expect(profesionalesApi.reemplazarDisponibilidad).not.toHaveBeenCalled();
  });

  it("PROFESIONAL: la confirmación habla de 'tu nueva disponibilidad' y pluraliza los cancelados", async () => {
    sesion.rol = "PROFESIONAL";
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockResolvedValue({
      cantidad: 2,
      turnos: [turno, { ...turno, turnoId: 8 }],
    });
    vi.mocked(profesionalesApi.reemplazarDisponibilidad).mockResolvedValue([]);
    renderPropia();
    await user.click(await screen.findByRole("button", { name: "Quitar franja" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText(/Estos turnos quedan fuera de tu nueva disponibilidad/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar turnos y guardar" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Disponibilidad guardada · 2 turnos cancelados",
    );
  });

  it("un 409 con impacto al guardar (carrera) abre la misma confirmación", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockResolvedValue({
      cantidad: 0,
      turnos: [],
    });
    vi.mocked(profesionalesApi.reemplazarDisponibilidad).mockRejectedValueOnce(
      new ApiError(409, "Hay turnos", { impacto: { cantidad: 1, turnos: [turno] } }),
    );
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Quitar franja" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("dialog", { name: "Hay turnos afectados" })).toBeInTheDocument();
    expect(screen.getByText("Juan García")).toBeInTheDocument();
  });

  it("muestra otros errores del guardado (p. ej. solapamiento en el servidor)", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockResolvedValue({
      cantidad: 0,
      turnos: [],
    });
    vi.mocked(profesionalesApi.reemplazarDisponibilidad).mockRejectedValueOnce(
      new ApiError(409, "Las franjas se superponen"),
    );
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Quitar franja" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Las franjas se superponen");
    // El borrador sigue ahí para corregirlo.
    expect(screen.getByText("Sin franjas cargadas.")).toBeInTheDocument();
  });

  it("muestra el error si falla la vista previa del impacto", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeDisponibilidad).mockRejectedValue(new Error("boom"));
    renderAdmin();
    await user.click(await screen.findByRole("button", { name: "Quitar franja" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo completar la operación. Intentá de nuevo.",
    );
    expect(profesionalesApi.reemplazarDisponibilidad).not.toHaveBeenCalled();
  });

  it("Descartar vuelve a lo guardado y Quitar/editar actualizan el borrador", async () => {
    const user = userEvent.setup();
    renderAdmin();
    const franja = within(await screen.findByRole("group", { name: "Franja 1" }));

    await user.selectOptions(franja.getByLabelText("Hasta"), "13:00");
    expect(franja.getByLabelText("Hasta")).toHaveValue("13:00");
    await user.click(screen.getByRole("button", { name: "Descartar" }));

    expect(
      within(screen.getByRole("group", { name: "Franja 1" })).getByLabelText("Hasta"),
    ).toHaveValue("12:00");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });
});
