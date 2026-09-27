import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { RolUsuario } from "../types/auth";
import { homePathForRol } from "./roleHome";

interface RoleGuardProps {
  allowedRoles: RolUsuario[];
  children: ReactNode;
}

/**
 * Guard de UX en el frontend (T2-7). Sin sesión → redirige a /login. Con sesión
 * pero rol no permitido para la ruta → redirige al home del propio rol.
 *
 * IMPORTANTE: esto NO es la barrera de seguridad real. La autorización que importa
 * se verifica en el backend (SecurityConfig + Service, RNF-02/RNF-03) — este guard
 * solo evita que el usuario navegue a una pantalla que no le corresponde; nunca
 * debe tratarse como el mecanismo que protege datos o endpoints.
 *
 * Vive en `router/` (no en `components/atoms|molecules|organisms`): no es UI, es
 * lógica de ruteo — decide qué renderizar según sesión/rol, no cómo se ve nada.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isAuthenticated, isLoading, rol } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || rol === null) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(rol)) {
    return <Navigate to={homePathForRol(rol)} replace />;
  }

  return <>{children}</>;
}
