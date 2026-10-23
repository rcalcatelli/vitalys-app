const ETIQUETA_TIPO: Record<string, string> = {
  CONFIRMACION_TURNO: "Confirmación de turno",
  AVISO_CANCELACION: "Aviso de cancelación",
  RECORDATORIO: "Recordatorio",
  AVISO_DEUDA: "Aviso de deuda",
  AVISO_SUSPENSION: "Aviso de suspensión",
};

/**
 * Tipo de notificación para mostrar: capitalizado y con tilde ("Confirmación de turno"). Un tipo
 * que el front todavía no conoce se arma igual: guiones bajos a espacios, minúsculas, la primera
 * mayúscula y las palabras en `-CION`/`-SION` con su tilde ("CONFIRMACION" → "Confirmación").
 */
export function etiquetaTipoNotificacion(tipo: string): string {
  const conocida = ETIQUETA_TIPO[tipo];
  if (conocida) return conocida;
  const texto = tipo
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(ci|si)on\b/g, "$1ón");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
