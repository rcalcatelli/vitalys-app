import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getToken, setToken } from "../api/http";
import { AuthProvider, useAuth } from "./AuthContext";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

/** Componente mínimo que expone el estado de `useAuth` para poder assertear sobre él. */
function Harness() {
  const { usuario, token, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="token">{token ?? ""}</span>
      <span data-testid="email">{usuario?.email ?? ""}</span>
      <button onClick={() => login("socio@vitalys.test", "contrasena123")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("login() guarda el token en localStorage y puebla el usuario", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { token: "jwt-abc" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 1, email: "socio@vitalys.test", rol: "SOCIO_PACIENTE" }),
      );

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("login"));

    await waitFor(() =>
      expect(screen.getByTestId("email")).toHaveTextContent("socio@vitalys.test"),
    );
    expect(getToken()).toBe("jwt-abc");
    expect(screen.getByTestId("token")).toHaveTextContent("jwt-abc");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
  });

  it("logout() limpia storage y contexto sin llamar al backend", async () => {
    const user = userEvent.setup();
    setToken("jwt-existente");
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { id: 2, email: "otro@vitalys.test", rol: "ADMIN" }),
    );

    renderHarness();
    await waitFor(() => expect(screen.getByTestId("authenticated")).toHaveTextContent("true"));
    const llamadasAntesDeLogout = vi.mocked(fetch).mock.calls.length;

    await user.click(screen.getByText("logout"));

    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("");
    expect(screen.getByTestId("email")).toHaveTextContent("");
    expect(getToken()).toBeNull();
    // Decisión 9 / RNF-10: el logout es 100% cliente, no debe disparar ningún fetch.
    expect(vi.mocked(fetch).mock.calls.length).toBe(llamadasAntesDeLogout);
  });

  it("el estado inicial lee el token existente de localStorage y resuelve la sesión contra /me", async () => {
    setToken("jwt-existente");
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { id: 3, email: "ya-logueado@vitalys.test", rol: "PROFESIONAL" }),
    );

    renderHarness();

    // Con token en localStorage, el estado inicial (síncrono, antes de que resuelva /me) es "cargando".
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("token")).toHaveTextContent("jwt-existente");

    await waitFor(() =>
      expect(screen.getByTestId("email")).toHaveTextContent("ya-logueado@vitalys.test"),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
  });

  it("si el token guardado es inválido, /me falla y la sesión se descarta", async () => {
    setToken("jwt-invalido");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { message: "Token inválido" }));

    renderHarness();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(getToken()).toBeNull();
  });
});
