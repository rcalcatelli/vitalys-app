import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as profesionalesApi from "../api/profesionalesApi";
import { unProfesional } from "../test/profesionalFixture";
import { renderWithRouter } from "../test/renderWithRouter";
import { ProfesionalesPage } from "./ProfesionalesPage";

vi.mock("../api/profesionalesApi", async (importOriginal) => {
  const real = await importOriginal<typeof profesionalesApi>();
  return {
    ...real,
    listarProfesionales: vi.fn(),
    crearProfesional: vi.fn(),
    actualizarProfesional: vi.fn(),
    impactoDeBaja: vi.fn(),
    darDeBajaProfesional: vi.fn(),
    reactivar: vi.fn(),
  };
});

const valentina = unProfesional();
const pablo = unProfesional({
  id: 2,
  email: "pablo.ruiz@vitalys.com",
  nombre: "Pablo",
  apellido: "Ruiz",
  especialidad: "PSICOLOGIA",
  duracionTurnoMinutos: 50,
  activo: false,
});
const turno = {
  turnoId: 7,
  personaId: 3,
  paciente: "Juan García",
  inicio: "2026-10-21T16:30:00Z",
  fin: "2026-10-21T17:00:00Z",
};

function renderPage() {
  return renderWithRouter(<ProfesionalesPage />, {
    extraRoutes: (
      <Route
        path="/admin/profesionales/:id/disponibilidad"
        element={<div>Pantalla de disponibilidad</div>}
      />
    ),
  });
}

describe("ProfesionalesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([valentina, pablo]);
  });

  it("lista los profesionales y filtra por especialidad, inactivos y texto", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(screen.getByText("Lic. Pablo Ruiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Psicología" }));
    expect(screen.queryByText("Lic. Valentina Méndez")).not.toBeInTheDocument();
    expect(screen.getByText("Lic. Pablo Ruiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inactivos" }));
    expect(screen.getByText("Lic. Pablo Ruiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todos" }));
    await user.type(screen.getByLabelText("Buscar por nombre o email"), "VALENTINA.mendez");
    expect(screen.getByText("Lic. Valentina Méndez")).toBeInTheDocument();
    expect(screen.queryByText("Lic. Pablo Ruiz")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Buscar por nombre o email"));
    await user.type(screen.getByLabelText("Buscar por nombre o email"), "zzz");
    expect(screen.getByText("No hay profesionales que coincidan.")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", async () => {
    vi.mocked(profesionalesApi.listarProfesionales).mockRejectedValue(new ApiError(403, "x"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu usuario no tiene permiso para esta operación.",
    );
  });

  it("usa un mensaje genérico ante un error inesperado", async () => {
    vi.mocked(profesionalesApi.listarProfesionales).mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo completar la operación. Intentá de nuevo.",
    );
  });

  it("da de alta un profesional y refresca el listado", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.crearProfesional).mockResolvedValue(
      unProfesional({ id: 9, nombre: "Ana", apellido: "Paz" }),
    );
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "+ Nuevo profesional" }));
    const form = within(screen.getByRole("form", { name: "Nuevo profesional" }));
    await user.type(form.getByLabelText("Nombre"), "Ana");
    await user.type(form.getByLabelText("Apellido"), "Paz");
    await user.type(form.getByLabelText("Email · será su usuario de acceso"), "ana@vitalys.com");
    await user.type(form.getByLabelText("Contraseña inicial"), "Clave1234");
    await user.click(form.getByRole("button", { name: "Crear profesional" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Lic. Ana Paz se agregó a Profesionales",
    );
    expect(profesionalesApi.crearProfesional).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@vitalys.com" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(profesionalesApi.listarProfesionales).toHaveBeenCalledTimes(2);
  });

  it("muestra el error del servidor (email duplicado) sin cerrar el modal", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.crearProfesional).mockRejectedValue(
      new ApiError(409, "Ya existe un usuario con ese email"),
    );
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "+ Nuevo profesional" }));
    const form = within(screen.getByRole("form", { name: "Nuevo profesional" }));
    await user.type(form.getByLabelText("Nombre"), "Ana");
    await user.type(form.getByLabelText("Apellido"), "Paz");
    await user.type(form.getByLabelText("Email · será su usuario de acceso"), "ana@vitalys.com");
    await user.type(form.getByLabelText("Contraseña inicial"), "Clave1234");
    await user.click(form.getByRole("button", { name: "Crear profesional" }));

    expect(await form.findByRole("alert")).toHaveTextContent("Ya existe un usuario con ese email");
  });

  it("edita un profesional", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.actualizarProfesional).mockResolvedValue(valentina);
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "Editar Lic. Valentina Méndez" }));
    const form = within(screen.getByRole("form", { name: "Editar profesional" }));
    await user.clear(form.getByLabelText("Nombre"));
    await user.type(form.getByLabelText("Nombre"), "Vale");
    await user.click(form.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cambios guardados");
    expect(profesionalesApi.actualizarProfesional).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ nombre: "Vale" }),
    );
  });

  it("cancelar el modal lo cierra sin guardar", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "+ Nuevo profesional" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Disponibilidad navega a la pantalla del profesional", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(
      screen.getByRole("button", { name: "Disponibilidad de Lic. Valentina Méndez" }),
    );
    expect(await screen.findByText("Pantalla de disponibilidad")).toBeInTheDocument();
  });

  it("baja sin turnos futuros: consulta el impacto y da de baja sin confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeBaja).mockResolvedValue({ cantidad: 0, turnos: [] });
    vi.mocked(profesionalesApi.darDeBajaProfesional).mockResolvedValue({
      ...valentina,
      activo: false,
    });
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" }));
    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    const dialogo = within(await screen.findByRole("dialog", { name: "Dar de baja" }));
    await user.click(
      await waitFor(() => {
        const boton = dialogo.getByRole("button", { name: "Dar de baja" });
        expect(boton).toBeEnabled();
        return boton;
      }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Profesional dado de baja");
    expect(profesionalesApi.impactoDeBaja).toHaveBeenCalledWith(1);
    expect(profesionalesApi.darDeBajaProfesional).toHaveBeenCalledWith(1, false);
  });

  it("baja con turnos futuros: muestra la lista y confirma con confirmar=true", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeBaja).mockResolvedValue({ cantidad: 1, turnos: [turno] });
    vi.mocked(profesionalesApi.darDeBajaProfesional).mockResolvedValue({
      ...valentina,
      activo: false,
    });
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" }));
    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    expect(await screen.findByText("Juan García")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar 1 turno y dar de baja" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Profesional dado de baja");
    expect(profesionalesApi.darDeBajaProfesional).toHaveBeenCalledWith(1, true);
  });

  it("si aparecen turnos entre el paso 1 y el 2 (409 con impacto) vuelve a pedir confirmación", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeBaja).mockResolvedValue({ cantidad: 0, turnos: [] });
    vi.mocked(profesionalesApi.darDeBajaProfesional).mockRejectedValueOnce(
      new ApiError(409, "Hay turnos", { impacto: { cantidad: 1, turnos: [turno] } }),
    );
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" }));
    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }),
      ).toBeEnabled(),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }),
    );

    expect(
      await screen.findByText(
        /Cambió la lista de turnos afectados\. Revisala y confirmá de nuevo\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar 1 turno y dar de baja" }),
    ).toBeInTheDocument();
  });

  it("reactiva a un profesional inactivo desde el menú ⋯ y recuerda cargar su disponibilidad", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.reactivar).mockResolvedValue({ ...pablo, activo: true });
    renderPage();
    await screen.findByText("Lic. Pablo Ruiz");

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Pablo Ruiz" }));
    await user.click(screen.getByRole("button", { name: "Reactivar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Profesional reactivado. Cargá su disponibilidad",
    );
    expect(profesionalesApi.reactivar).toHaveBeenCalledWith(2);
    expect(profesionalesApi.listarProfesionales).toHaveBeenCalledTimes(2);
  });

  it("muestra el error si la reactivación falla", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.reactivar).mockRejectedValue(
      new ApiError(409, "El profesional ya está activo"),
    );
    renderPage();
    await screen.findByText("Lic. Pablo Ruiz");

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Pablo Ruiz" }));
    await user.click(screen.getByRole("button", { name: "Reactivar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El profesional ya está activo");
  });

  it("muestra otros errores de la baja y los del impacto", async () => {
    const user = userEvent.setup();
    vi.mocked(profesionalesApi.impactoDeBaja).mockRejectedValueOnce(
      new ApiError(404, "Profesional no encontrado"),
    );
    renderPage();
    await screen.findByText("Lic. Valentina Méndez");

    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" }));
    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Profesional no encontrado");
    await user.click(screen.getByRole("button", { name: "Volver" }));

    vi.mocked(profesionalesApi.impactoDeBaja).mockResolvedValue({ cantidad: 0, turnos: [] });
    vi.mocked(profesionalesApi.darDeBajaProfesional).mockRejectedValue(new Error("boom"));
    await user.click(screen.getByRole("button", { name: "Más acciones de Lic. Valentina Méndez" }));
    await user.click(screen.getByRole("button", { name: "Dar de baja" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }),
      ).toBeEnabled(),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo completar la operación. Intentá de nuevo.",
    );
  });
});
