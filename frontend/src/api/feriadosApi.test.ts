import { afterEach, describe, expect, it, vi } from "vitest";
import { listarFeriados } from "./feriadosApi";

afterEach(() => vi.unstubAllGlobals());

describe("feriadosApi", () => {
  it("listarFeriados pide el año", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
    );
    await expect(listarFeriados(2026)).resolves.toEqual([]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe("/api/feriados?anio=2026");
  });
});
