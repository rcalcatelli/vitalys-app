import { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "../components/templates/AppShell";
import type { NavItemVista, UsuarioVista } from "../components/templates/AppShell";
import { ShellContext } from "../components/templates/AppShell/ShellContext";
import { useAuth } from "../context/AuthContext";
import { useAhora } from "../hooks/useAhora";
import { useConteoFallidas } from "../hooks/useConteoFallidas";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useTheme } from "../hooks/useTheme";
import type { Usuario } from "../types/auth";
import { etiquetaAhora } from "../utils/formato";
import { ETIQUETAS_ROL, NAV_POR_ROL } from "./navConfig";

/** Nombre completo si el backend lo informa; si no, el email (sin ficha o antes de RF-40). */
function usuarioVista(usuario: Usuario): UsuarioVista {
  const nombreCompleto = [usuario.nombre, usuario.apellido].filter(Boolean).join(" ");
  const nombre = nombreCompleto || usuario.email;
  const iniciales = nombreCompleto
    ? nombreCompleto
        .split(/\s+/)
        .slice(0, 2)
        .map((palabra) => palabra.charAt(0))
        .join("")
    : usuario.email.slice(0, 2);
  return {
    nombre,
    detalle: ETIQUETAS_ROL[usuario.rol].corta,
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
 * se consulta acá una sola vez para el ADMIN.
 */
export function ShellLayout() {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const mobile = useMediaQuery("(max-width: 759px)");
  const ahora = useAhora();
  const { pathname } = useLocation();
  const esAdmin = usuario?.rol === "ADMIN";
  const fallidas = useConteoFallidas(!esAdmin);

  const contexto = useMemo(
    () => ({ chipAhora: mobile ? null : etiquetaAhora(ahora) }),
    [mobile, ahora],
  );

  if (!usuario) return null;

  const items: NavItemVista[] = NAV_POR_ROL[usuario.rol].map((item) => {
    const badge = item.conBadge && fallidas > 0 ? fallidas : undefined;
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
      usuario={usuarioVista(usuario)}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={logout}
      mobile={mobile}
    >
      <ShellContext.Provider value={contexto}>
        {/* `key` por ruta: cada pantalla entra con `vtIn`, como en el mockup. */}
        <div key={pathname} className="animate-vt-in">
          <Outlet />
        </div>
      </ShellContext.Provider>
    </AppShell>
  );
}
