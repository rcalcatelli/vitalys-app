import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OperarComoBanner } from "./OperarComoBanner";

describe("OperarComoBanner", () => {
  it("dice en nombre de quién opera Recepción y que queda registrado", () => {
    render(<OperarComoBanner nombre="María Pérez" onVolver={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Recepción operando en nombre de María Pérez. Todo lo que hagas queda registrado.",
    );
  });

  it("'Volver a Recepción' avisa y se deshabilita mientras se termina la sesión", async () => {
    const onVolver = vi.fn();
    const { rerender } = render(<OperarComoBanner nombre="María Pérez" onVolver={onVolver} />);
    await userEvent.click(screen.getByRole("button", { name: "Volver a Recepción" }));
    expect(onVolver).toHaveBeenCalledOnce();

    rerender(<OperarComoBanner nombre="María Pérez" onVolver={onVolver} ocupado />);
    expect(screen.getByRole("button", { name: "Volver a Recepción" })).toBeDisabled();
  });
});
