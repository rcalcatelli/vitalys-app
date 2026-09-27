import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DemoAccountCard } from "./DemoAccountCard";

describe("DemoAccountCard", () => {
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
