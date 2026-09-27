import { screen, waitFor } from "@testing-library/react";
import { Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "../api/http";
import { renderWithRouter } from "../test/renderWithRouter";
import { RoleGuard } from "./RoleGuard";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("RoleGuard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sin sesión redirige a /login", async () => {
    renderWithRouter(
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div>Panel ADMIN</div>
      </RoleGuard>,
      {
        path: "/admin/dashboard",
        extraRoutes: <Route path="/login" element={<div>Pantalla de login</div>} />,
      },
    );

    await waitFor(() => expect(screen.getByText("Pantalla de login")).toBeInTheDocument());
    expect(screen.queryByText("Panel ADMIN")).not.toBeInTheDocument();
  });

  it("con rol incorrecto redirige al home del rol real", async () => {
    setToken("jwt-profesional");
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { id: 1, email: "prof@vitalys.test", rol: "PROFESIONAL" }),
    );

    renderWithRouter(
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div>Panel ADMIN</div>
      </RoleGuard>,
      {
        path: "/admin/dashboard",
        extraRoutes: (
          <Route path="/profesional/agenda" element={<div>Agenda del profesional</div>} />
        ),
      },
    );

    await waitFor(() => expect(screen.getByText("Agenda del profesional")).toBeInTheDocument());
    expect(screen.queryByText("Panel ADMIN")).not.toBeInTheDocument();
  });

  it("con rol correcto renderiza el contenido protegido", async () => {
    setToken("jwt-admin");
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { id: 2, email: "admin@vitalys.test", rol: "ADMIN" }),
    );

    renderWithRouter(
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div>Panel ADMIN</div>
      </RoleGuard>,
      { path: "/admin/dashboard" },
    );

    await waitFor(() => expect(screen.getByText("Panel ADMIN")).toBeInTheDocument());
  });
});
