import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

let debeFallar = true;
function Bomba() {
  if (debeFallar) throw new Error("boom");
  return <p>Todo bien</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    debeFallar = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("muestra el aviso en lugar de dejar la pantalla en blanco", () => {
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal al mostrar esta pantalla");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("Reintentar vuelve a dibujar los hijos", async () => {
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>,
    );
    debeFallar = false;
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
  });

  it("Volver al inicio llama al callback y limpia el error", async () => {
    const onVolver = vi.fn();
    render(
      <ErrorBoundary onVolverAlInicio={onVolver}>
        <Bomba />
      </ErrorBoundary>,
    );
    debeFallar = false;
    await userEvent.click(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(onVolver).toHaveBeenCalledOnce();
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
  });

  it("sin callback recarga desde la raíz", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(
      <ErrorBoundary>
        <Bomba />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(assign).toHaveBeenCalledWith("/");
    vi.unstubAllGlobals();
  });
});
