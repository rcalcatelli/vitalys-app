import { describe, expect, it } from "vitest";
import { ApiError } from "../api/http";
import { esErrorDeRegla, mensajeDeError } from "./errores";

describe("errores", () => {
  it("409 y 422 son errores de regla y conservan el mensaje del servidor", () => {
    expect(esErrorDeRegla(new ApiError(409, "Ya tomado"))).toBe(true);
    expect(mensajeDeError(new ApiError(422, "Regla"))).toBe("Regla");
  });

  it("403 y cualquier otro error tienen mensajes propios", () => {
    expect(esErrorDeRegla(new ApiError(500, "x"))).toBe(false);
    expect(esErrorDeRegla(new Error("x"))).toBe(false);
    expect(mensajeDeError(new ApiError(403, "x"))).toBe(
      "Tu usuario no tiene permiso para esta operación.",
    );
    expect(mensajeDeError(new Error("boom"))).toBe(
      "No se pudo completar la operación. Intentá de nuevo.",
    );
  });
});
