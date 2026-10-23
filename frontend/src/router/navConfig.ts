import type { RolUsuario } from "../types/auth";

/** Color del ítem: `gym` naranja, `clin` teal (consultorio), `neu` neutro (secciones generales). */
export type NavTono = "neu" | "gym" | "clin";

export interface NavItem {
  to: string;
  /** Texto de la sidebar. */
  etiqueta: string;
  /** Texto corto de la tab bar mobile. */
  corta: string;
  tono: NavTono;
  /** Lleva el badge de notificaciones fallidas (solo "Hoy en el centro"). */
  conBadge?: boolean;
}

/** Navegación por rol, calcada de `navDefs` del mockup (Vitalys.dc.html). */
export const NAV_POR_ROL: Record<RolUsuario, NavItem[]> = {
  SOCIO_PACIENTE: [
    { to: "/socio/inicio", etiqueta: "Inicio", corta: "Inicio", tono: "neu" },
    {
      to: "/socio/reservar-gimnasio",
      etiqueta: "Reservar gimnasio",
      corta: "Gimnasio",
      tono: "gym",
    },
    {
      to: "/socio/reservar-consultorio",
      etiqueta: "Turno de consultorio",
      corta: "Consulta",
      tono: "clin",
    },
    { to: "/socio/turnos", etiqueta: "Mis turnos", corta: "Turnos", tono: "neu" },
    { to: "/socio/estado-cuenta", etiqueta: "Estado de cuenta", corta: "Cuenta", tono: "neu" },
  ],
  PROFESIONAL: [
    { to: "/profesional/agenda", etiqueta: "Agenda de hoy", corta: "Agenda", tono: "clin" },
    {
      to: "/profesional/disponibilidad",
      etiqueta: "Disponibilidad",
      corta: "Disponibilidad",
      tono: "clin",
    },
  ],
  ADMIN: [
    {
      to: "/admin/hoy",
      etiqueta: "Hoy en el centro",
      corta: "Hoy",
      tono: "neu",
      conBadge: true,
    },
    { to: "/admin/ingreso", etiqueta: "Ingreso al gimnasio", corta: "Ingreso", tono: "gym" },
    { to: "/admin/personas", etiqueta: "Personas", corta: "Personas", tono: "neu" },
    { to: "/admin/profesionales", etiqueta: "Profesionales", corta: "Profes.", tono: "clin" },
    { to: "/admin/pagos", etiqueta: "Pagos", corta: "Pagos", tono: "clin" },
  ],
};

export interface EtiquetasRol {
  /** Debajo del logo en la sidebar. */
  encabezado: string;
  /** Subtítulo de la tarjeta de usuario. */
  corta: string;
}

export const ETIQUETAS_ROL: Record<RolUsuario, EtiquetasRol> = {
  SOCIO_PACIENTE: { encabezado: "Socio / paciente", corta: "Socio/a" },
  PROFESIONAL: { encabezado: "Profesional", corta: "Profesional" },
  ADMIN: { encabezado: "Recepción", corta: "Recepción" },
};
