import { Navigate, Route, Routes } from "react-router-dom";
import { RoleGuard } from "../components/RoleGuard";
import { LoginPage } from "../pages/LoginPage";
import { PlaceholderHomePage } from "../pages/PlaceholderHomePage";

/**
 * Rutas de la app (T2-7). Las homes por rol son placeholders (ver
 * PlaceholderHomePage) — las pantallas reales de cada módulo de negocio están
 * fuera de alcance de esta change.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin/dashboard"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <PlaceholderHomePage title="Panel ADMIN" />
          </RoleGuard>
        }
      />

      <Route
        path="/profesional/agenda"
        element={
          <RoleGuard allowedRoles={["PROFESIONAL"]}>
            <PlaceholderHomePage title="Agenda del profesional" />
          </RoleGuard>
        }
      />

      <Route
        path="/socio/turnos"
        element={
          <RoleGuard allowedRoles={["SOCIO_PACIENTE"]}>
            <PlaceholderHomePage title="Mis turnos" />
          </RoleGuard>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
