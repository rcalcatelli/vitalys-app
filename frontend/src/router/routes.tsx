import { Navigate, Route, Routes } from "react-router-dom";
import { AgendaPage } from "../pages/AgendaPage";
import { DisponibilidadPage } from "../pages/DisponibilidadPage";
import { HoyPage } from "../pages/HoyPage";
import { LoginPage } from "../pages/LoginPage";
import { MisTurnosPage } from "../pages/MisTurnosPage";
import { PersonasPage } from "../pages/PersonasPage";
import { PlaceholderHomePage } from "../pages/PlaceholderHomePage";
import { ProfesionalesPage } from "../pages/ProfesionalesPage";
import { RecuperarContrasenaPage } from "../pages/RecuperarContrasenaPage";
import { RegistroPage } from "../pages/RegistroPage";
import { ReservarConsultorioPage } from "../pages/ReservarConsultorioPage";
import { ReservarGimnasioPage } from "../pages/ReservarGimnasioPage";
import { RoleGuard } from "./RoleGuard";

/**
 * Rutas de la app (T2-7). Las homes por rol son placeholders (ver
 * PlaceholderHomePage) — las pantallas reales de cada módulo de negocio están
 * fuera de alcance de esta change.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasenaPage />} />

      <Route
        path="/admin/dashboard"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <PlaceholderHomePage title="Panel ADMIN" />
          </RoleGuard>
        }
      />

      <Route
        path="/admin/hoy"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <HoyPage />
          </RoleGuard>
        }
      />

      <Route
        path="/admin/personas"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <PersonasPage />
          </RoleGuard>
        }
      />

      <Route
        path="/admin/profesionales"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <ProfesionalesPage />
          </RoleGuard>
        }
      />

      <Route
        path="/admin/profesionales/:id/disponibilidad"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <DisponibilidadPage />
          </RoleGuard>
        }
      />

      <Route
        path="/profesional/disponibilidad"
        element={
          <RoleGuard allowedRoles={["PROFESIONAL"]}>
            <DisponibilidadPage />
          </RoleGuard>
        }
      />

      <Route
        path="/profesional/agenda"
        element={
          <RoleGuard allowedRoles={["PROFESIONAL"]}>
            <AgendaPage />
          </RoleGuard>
        }
      />

      <Route
        path="/socio/reservar-gimnasio"
        element={
          <RoleGuard allowedRoles={["SOCIO_PACIENTE"]}>
            <ReservarGimnasioPage />
          </RoleGuard>
        }
      />

      <Route
        path="/socio/reservar-consultorio"
        element={
          <RoleGuard allowedRoles={["SOCIO_PACIENTE"]}>
            <ReservarConsultorioPage />
          </RoleGuard>
        }
      />

      <Route
        path="/socio/turnos"
        element={
          <RoleGuard allowedRoles={["SOCIO_PACIENTE"]}>
            <MisTurnosPage />
          </RoleGuard>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
