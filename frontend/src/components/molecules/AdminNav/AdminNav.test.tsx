import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notificacionesApi from "../../../api/notificacionesApi";
import { unaNotificacion } from "../../../test/notificacionFixture";
import { AdminNav } from "./AdminNav";

vi.mock("../../../api/notificacionesApi", () => ({ listarFallidas: vi.fn() }));

function renderNav(ui: React.ReactNode, ruta = "/admin/profesionales") {
  return render(<MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>);
}

describe("AdminNav", () => {
  beforeEach(() => {
    vi.mocked(notificacionesApi.listarFallidas).mockReset();
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([]);
  });

  it("ofrece Hoy primero, luego Personas y Profesionales, y marca la ruta actual", () => {
    renderNav(<AdminNav fallidas={0} />);

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Hoy", "Personas", "Profesionales"]);
    expect(screen.getByRole("link", { name: "Hoy" })).toHaveAttribute("href", "/admin/hoy");
    expect(screen.getByRole("link", { name: "Personas" })).toHaveAttribute(
      "href",
      "/admin/personas",
    );
    expect(screen.getByRole("link", { name: "Profesionales" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Personas" })).not.toHaveAttribute("aria-current");
  });

  it("con el conteo recibido muestra el badge en Hoy sin consultar la API", () => {
    renderNav(<AdminNav fallidas={3} />, "/admin/hoy");

    expect(screen.getByRole("link", { name: "Hoy3" })).toBeInTheDocument();
    expect(notificacionesApi.listarFallidas).not.toHaveBeenCalled();
  });

  it("oculta el badge con 0 y mientras la pantalla todavía carga (null)", () => {
    const { rerender } = renderNav(<AdminNav fallidas={0} />);
    expect(screen.queryByTitle("Notificaciones fallidas")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={["/admin/hoy"]}>
        <AdminNav fallidas={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByTitle("Notificaciones fallidas")).not.toBeInTheDocument();
  });

  it("sin conteo recibido lo consulta por su cuenta", async () => {
    vi.mocked(notificacionesApi.listarFallidas).mockResolvedValue([
      unaNotificacion(),
      unaNotificacion({ id: 2 }),
    ]);
    renderNav(<AdminNav />);

    await waitFor(() => expect(screen.getByRole("link", { name: "Hoy2" })).toBeInTheDocument());
  });
});
