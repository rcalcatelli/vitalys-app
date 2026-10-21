import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("muestra el título y el contenido en un diálogo", () => {
    render(
      <Modal titulo="Dar de baja" onClose={vi.fn()}>
        <p>Contenido</p>
      </Modal>,
    );

    const dialogo = screen.getByRole("dialog", { name: "Dar de baja" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Dar de baja" })).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("cierra con Escape y al tocar el fondo, pero no al tocar el contenido", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal titulo="T" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );

    await user.click(screen.getByText("Contenido"));
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
