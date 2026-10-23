import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as profesionalesApi from "../api/profesionalesApi";
import { unProfesional } from "../test/profesionalFixture";
import { useEspecialidadPropia } from "./useEspecialidadPropia";

vi.mock("../api/profesionalesApi", () => ({ miPerfilProfesional: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("useEspecialidadPropia", () => {
  it("devuelve la especialidad del perfil", async () => {
    vi.mocked(profesionalesApi.miPerfilProfesional).mockResolvedValue(
      unProfesional({ especialidad: "KINESIOLOGIA" }),
    );
    const { result } = renderHook(() => useEspecialidadPropia(false));
    await waitFor(() => expect(result.current).toBe("KINESIOLOGIA"));
  });

  it("si falla o no es válida devuelve null", async () => {
    vi.mocked(profesionalesApi.miPerfilProfesional).mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useEspecialidadPropia(false));
    await waitFor(() => expect(profesionalesApi.miPerfilProfesional).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("omitido no consulta", () => {
    renderHook(() => useEspecialidadPropia(true));
    expect(profesionalesApi.miPerfilProfesional).not.toHaveBeenCalled();
  });
});
