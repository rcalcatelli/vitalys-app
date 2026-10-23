import { describe, expect, it } from "vitest";
import { etiquetaTipoNotificacion } from "./notificacionUi";

describe("etiquetaTipoNotificacion", () => {
  it.each([
    ["CONFIRMACION_TURNO", "Confirmación de turno"],
    ["AVISO_CANCELACION", "Aviso de cancelación"],
    ["RECORDATORIO", "Recordatorio"],
    ["AVISO_DEUDA", "Aviso de deuda"],
    ["AVISO_SUSPENSION", "Aviso de suspensión"],
  ])("conoce %s", (tipo, esperado) => {
    expect(etiquetaTipoNotificacion(tipo)).toBe(esperado);
  });

  it("capitaliza y pone la tilde en un tipo que no conoce", () => {
    expect(etiquetaTipoNotificacion("CONFIRMACION")).toBe("Confirmación");
    expect(etiquetaTipoNotificacion("AVISO_RENOVACION")).toBe("Aviso renovación");
    expect(etiquetaTipoNotificacion("OTRO_TIPO")).toBe("Otro tipo");
  });
});
