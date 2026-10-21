import { describe, expect, it, vi } from "vitest";
import { listarFallidas } from "./notificacionesApi";

describe("notificacionesApi", () => {
  it("listarFallidas hace GET a las notificaciones fallidas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) }),
    );
    await expect(listarFallidas()).resolves.toEqual([]);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("/api/admin/notificaciones?fallidas=true");
    expect(init?.method).toBe("GET");
  });
});
