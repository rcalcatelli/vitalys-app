import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DemoAccountCard } from "./DemoAccountCard";

describe("DemoAccountCard", () => {
  it("el avatar toma el tono pedido (gym para recepción, bad para el suspendido)", () => {
    const { rerender } = render(
      <DemoAccountCard
        initials="LB"
        name="Laura"
        description="Recepción"
        tono="gym"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("LB")).toHaveClass("bg-gym-soft", "text-gym-ink");
    rerender(
      <DemoAccountCard
        initials="JG"
        name="Juan"
        description="Suspendido"
        tono="bad"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("JG")).toHaveClass("bg-bad-soft", "text-bad-ink");
  });

  it("muestra iniciales, nombre y descripción, y llama a onClick al presionarla", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <DemoAccountCard
        initials="MP"
        name="María Pérez"
        description="Socio · gimnasio y consultorios"
        onClick={onClick}
      />,
    );

    expect(screen.getByText("MP")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /María Pérez/ }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
