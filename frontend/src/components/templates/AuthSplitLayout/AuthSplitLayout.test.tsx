import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthSplitLayout } from "./AuthSplitLayout";

describe("AuthSplitLayout", () => {
  it("renderiza el panel de marca, el logo, el toggle de tema y el contenido", () => {
    render(
      <AuthSplitLayout theme="light" onToggleTheme={vi.fn()}>
        <p>contenido del form</p>
      </AuthSplitLayout>,
    );

    // BrandPanel + header del panel de formulario montan "Vitalys" dos veces.
    expect(screen.getAllByText("Vitalys")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Modo oscuro" })).toBeInTheDocument();
    expect(screen.getByText("contenido del form")).toBeInTheDocument();
  });

  it("el toggle de tema refleja el tema recibido y llama a onToggleTheme", async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();

    render(
      <AuthSplitLayout theme="dark" onToggleTheme={onToggleTheme}>
        <p>contenido</p>
      </AuthSplitLayout>,
    );

    const boton = screen.getByRole("button", { name: "Modo claro" });
    await user.click(boton);

    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
