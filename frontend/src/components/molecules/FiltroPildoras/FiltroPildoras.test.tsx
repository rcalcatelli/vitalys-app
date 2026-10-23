import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FiltroPildoras } from "./FiltroPildoras";

const OPCIONES = [
  ["A", "Todos"],
  ["B", "Gimnasio"],
] as const;

describe("FiltroPildoras", () => {
  it("marca la opción activa y avisa la que se elige", async () => {
    const onChange = vi.fn();
    render(<FiltroPildoras etiqueta="Filtrar" opciones={OPCIONES} valor="A" onChange={onChange} />);

    expect(screen.getByRole("group", { name: "Filtrar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Gimnasio" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await userEvent.click(screen.getByRole("button", { name: "Gimnasio" }));
    expect(onChange).toHaveBeenCalledWith("B");
  });
});
