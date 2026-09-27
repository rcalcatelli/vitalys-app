import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render } from "@testing-library/react";
import { AuthProvider } from "../context/AuthContext";

/**
 * Helper de tests: monta `ui` en la ruta `path` dentro de un `MemoryRouter` real
 * (no se mockea `useNavigate`) para poder verificar redirects como consecuencia
 * observable — qué pantalla queda montada — en vez de espiar la llamada interna.
 * `extraRoutes` registra los destinos de esos redirects (p.ej. los homes por rol).
 */
export function renderWithRouter(
  ui: ReactNode,
  options: { path?: string; initialEntries?: string[]; extraRoutes?: ReactNode } = {},
) {
  const { path = "/", initialEntries = [path], extraRoutes = null } = options;

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={path} element={ui} />
          {extraRoutes}
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}
