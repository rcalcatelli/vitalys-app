import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sin sesión, la raíz de la app redirige al login (smoke test de la composición real)", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Ingresá a tu cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });
});
