import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "../components/organisms/ErrorBoundary";
import { OperarComoBanner } from "../components/molecules/OperarComoBanner";
import { AppShell } from "../components/templates/AppShell";
import type { NavItemVista, UsuarioVista } from "../components/templates/AppShell";
import { ShellContext } from "../components/templates/AppShell/ShellContext";
import { useAuth } from "../context/AuthContext";
import { useAhora } from "../hooks/useAhora";
import { useFallidas } from "../hooks/useFallidas";
import { useEspecialidadPropia } from "../hooks/useEspecialidadPropia";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useServiciosSocio } from "../hooks/useServiciosSocio";
import { useTheme } from "../hooks/useTheme";
import type { Usuario } from "../types/auth";
import { etiquetaAhora, etiquetaEspecialidad } from "../utils/formato";
import type { Especialidad } from "../types/profesional";
import { ETIQUETAS_ROL, NAV_POR_ROL } from "./navConfig";

function nombreCompleto(usuario: Usuario): string {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ");
}

/**
 * Nombre completo si el backend lo informa; si no, el email (sin ficha o antes de RF-40). En el
 * socio la segunda línea son sus servicios ("Gimnasio + Nutrición") cuando se pueden resolver; en el
 * profesional, "Lic. Nombre Apellido" y su especialidad.
 */
function usuarioVista(
  usuario: Usuario,
  servicios: string | null,
  especialidad: Especialidad | null,
): UsuarioVista {
  const completo = nombreCompleto(usuario);
  const esProfesional = usuario.rol === "PROFESIONAL";
  const nombre = completo ? (esProfesional ? `Lic. ${completo}` : completo) : usuario.email;
  const iniciales = completo
    ? completo
        .split(/\s+/)
        .slice(0, 2)
        .map((palabra) => palabra.charAt(0))
        .join("")
    : usuario.email.slice(0, 2);
  return {
    nombre,
    detalle:
      servicios ??
      (especialidad ? etiquetaEspecialidad(especialidad) : ETIQUETAS_ROL[usuario.rol].corta),
    iniciales: iniciales.toUpperCase(),
  };
}

function etiquetaConBadge(etiqueta: string, conteo: number): string {
  return `${etiqueta}, ${conteo} ${conteo === 1 ? "notificación fallida" : "notificaciones fallidas"}`;
}

/**
 * Layout de las rutas logueadas: arma el `AppShell` (sidebar o header + tab bar según el ancho)
 * con la navegación del rol, el tema y la sesión, y renderiza la pantalla activa con `<Outlet/>`.
 * Container: conoce auth, router y tema; `AppShell` solo dibuja. El badge de "Hoy en el centro"
 * se consulta acá una sola vez para el ADMIN y se comparte con "Hoy en el centro" por
 * `ShellContext`. Durante "Operar como" suma el banner con el botón para volver a Recepción.
 */
export function ShellLayout() {
  const { usuario, logout, volverARecepcion } = useAuth();
  const navigate = useNavigate();
  const [volviendo, setVolviendo] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const mobile = useMediaQuery("(max-width: 759px)");
  const ahora = useAhora();
  const { pathname } = useLocation();
  const esAdmin = usuario?.rol === "ADMIN";
  const fallidas = useFallidas(!esAdmin);
  const servicios = useServiciosSocio(usuario?.rol !== "SOCIO_PACIENTE");
  const especialidad = useEspecialidadPropia(usuario?.rol !== "PROFESIONAL");

  const contexto = useMemo(
    () => ({
      chipAhora: mobile ? null : etiquetaAhora(ahora),
      fallidas: esAdmin ? fallidas : null,
    }),
    [mobile, ahora, esAdmin, fallidas],
  );

  async function volver() {
    setVolviendo(true);
    const restaurada = await volverARecepcion();
    setVolviendo(false);
    navigate(restaurada ? "/admin/personas" : "/login", { replace: true });
  }

  if (!usuario) return null;

  const items: NavItemVista[] = NAV_POR_ROL[usuario.rol].map((item) => {
    const conteo = fallidas.lista?.length ?? 0;
    const badge = item.conBadge && conteo > 0 ? conteo : undefined;
    return {
      to: item.to,
      etiqueta: item.etiqueta,
      corta: item.corta,
      tono: item.tono,
      badge,
      ariaLabel: badge ? etiquetaConBadge(item.etiqueta, badge) : undefined,
    };
  });

  return (
    <AppShell
      rolLabel={ETIQUETAS_ROL[usuario.rol].encabezado}
      items={items}
      usuario={usuarioVista(usuario, servicios, especialidad)}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={logout}
      mobile={mobile}
      banner={
        usuario.operadoPor ? (
          <OperarComoBanner
            nombre={nombreCompleto(usuario) || usuario.email}
            onVolver={() => void volver()}
            ocupado={volviendo}
          />
        ) : undefined
      }
    >
      <ShellContext.Provider value={contexto}>
        {/* `key` por ruta: cada pantalla entra con `vtIn`, como en el mockup. */}
        <div key={pathname} className="animate-vt-in">
          <ErrorBoundary onVolverAlInicio={() => navigate("/", { replace: true })}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </ShellContext.Provider>
    </AppShell>
  );
}
