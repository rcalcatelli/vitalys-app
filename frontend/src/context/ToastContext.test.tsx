import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "../hooks/useToast";
import { DURACION_TOAST_MS, ToastProvider } from "./ToastContext";

function Disparador({ texto }: { texto: string }) {
  const { mostrar } = useToast();
  return (
    <button type="button" onClick={() => mostrar(texto)}>
      disparar {texto}
    </button>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra el toast y lo cierra solo a los 3200 ms", () => {
    render(
      <ToastProvider>
        <Disparador texto="Pago registrado" />
      </ToastProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("status")).toHaveTextContent("Pago registrado");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    act(() => vi.advanceTimersByTime(DURACION_TOAST_MS - 1));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("un toast nuevo reemplaza al anterior y reinicia el temporizador", () => {
    render(
      <ToastProvider>
        <Disparador texto="uno" />
        <Disparador texto="dos" />
      </ToastProvider>,
    );

    act(() => screen.getByRole("button", { name: "disparar uno" }).click());
    act(() => vi.advanceTimersByTime(2000));
    act(() => screen.getByRole("button", { name: "disparar dos" }).click());

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("dos");

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("status")).toHaveTextContent("dos");
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("en mobile baja a 64px; en desktop va a 20px", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    );
    render(
      <ToastProvider>
        <Disparador texto="hola" />
      </ToastProvider>,
    );
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("status")).toHaveStyle({ top: "64px" });
  });

  it("en desktop el toast va arriba a 20px", () => {
    render(
      <ToastProvider>
        <Disparador texto="hola" />
      </ToastProvider>,
    );
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("status")).toHaveStyle({ top: "20px" });
  });

  it("useToast falla fuera del provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Disparador texto="x" />)).toThrow("useToast debe usarse dentro");
  });
});
