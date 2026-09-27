import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "../api/http";
import { renderWithRouter } from "../test/renderWithRouter";
import { PlaceholderHomePage } from "./PlaceholderHomePage";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("PlaceholderHomePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("muestra el email y el rol de la sesión activa, y cerrar sesión desloguea sin llamar al backend", async () => {
    const user = userEvent.setup();
    setToken("jwt-socio");
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { id: 5, email: "socio@vitalys.test", rol: "SOCIO_PACIENTE" }),
    );

    renderWithRouter(<PlaceholderHomePage title="Mis turnos" />, { path: "/socio/turnos" });

    await waitFor(() => expect(screen.getByText(/socio@vitalys.test/)).toBeInTheDocument());
    expect(screen.getByText(/SOCIO_PACIENTE/)).toBeInTheDocument();

    const llamadasAntes = vi.mocked(fetch).mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(vi.mocked(fetch).mock.calls.length).toBe(llamadasAntes);
  });
});
