import { Navigate, Route, Routes } from "react-router-dom";
import { AgendaPage } from "../pages/AgendaPage";
import { DisponibilidadPage } from "../pages/DisponibilidadPage";
import { HoyPage } from "../pages/HoyPage";
import { IngresoPage } from "../pages/IngresoPage";
import { InicioPage } from "../pages/InicioPage";
import { LoginPage } from "../pages/LoginPage";
import { MiEstadoCuentaPage } from "../pages/MiEstadoCuentaPage";
import { MisTurnosPage } from "../pages/MisTurnosPage";
import { PagosPage } from "../pages/PagosPage";
import { PersonasPage } from "../pages/PersonasPage";
import { ProfesionalesPage } from "../pages/ProfesionalesPage";
import { RecuperarContrasenaPage } from "../pages/RecuperarContrasenaPage";
import { RegistroPage } from "../pages/RegistroPage";
import { ReservarConsultorioPage } from "../pages/ReservarConsultorioPage";
import { ReservarGimnasioPage } from "../pages/ReservarGimnasioPage";
import { RoleGuard } from "./RoleGuard";
import { ShellLayout } from "./ShellLayout";

/**
 * Rutas de la app. Las pantallas logueadas cuelgan de un layout por rol (`RoleGuard` > `ShellLayout`
 * > `<Outlet/>`): el shell (sidebar o tab bar, tema, toasts) se monta una sola vez y las pages solo
 * dibujan su contenido. La home de cada rol la define `homePathForRol`: el ADMIN entra a "Hoy en el
 * centro"; `/admin/dashboard` se conserva como alias para no romper enlaces viejos.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasenaPage />} />

      <Route path="/admin/dashboard" element={<Navigate to="/admin/hoy" replace />} />

      <Route
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <ShellLayout />
          </RoleGuard>
        }
      >
        <Route path="/admin/hoy" element={<HoyPage />} />
        <Route path="/admin/ingreso" element={<IngresoPage />} />
        <Route path="/admin/personas" element={<PersonasPage />} />
        <Route path="/admin/pagos" element={<PagosPage />} />
        <Route path="/admin/profesionales" element={<ProfesionalesPage />} />
        <Route path="/admin/profesionales/:id/disponibilidad" element={<DisponibilidadPage />} />
      </Route>

      <Route
        element={
          <RoleGuard allowedRoles={["PROFESIONAL"]}>
            <ShellLayout />
          </RoleGuard>
        }
      >
        <Route path="/profesional/agenda" element={<AgendaPage />} />
        <Route path="/profesional/disponibilidad" element={<DisponibilidadPage />} />
      </Route>

      <Route
        element={
          <RoleGuard allowedRoles={["SOCIO_PACIENTE"]}>
            <ShellLayout />
          </RoleGuard>
        }
      >
        <Route path="/socio/inicio" element={<InicioPage />} />
        <Route path="/socio/reservar-gimnasio" element={<ReservarGimnasioPage />} />
        <Route path="/socio/reservar-consultorio" element={<ReservarConsultorioPage />} />
        <Route path="/socio/turnos" element={<MisTurnosPage />} />
        <Route path="/socio/estado-cuenta" element={<MiEstadoCuentaPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
