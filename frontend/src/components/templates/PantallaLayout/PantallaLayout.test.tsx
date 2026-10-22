import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PantallaLayout } from "./PantallaLayout";

describe("PantallaLayout", () => {
  it("muestra cabecera, navegación, contenido y cierra sesión", async () => {
    const onLogout = vi.fn();
    render(
      <PantallaLayout
        eyebrow="Socio"
        titulo="Mis turnos"
        subtitulo="Hoy"
        email="s@vitalys.com"
        onLogout={onLogout}
        nav={<nav>menu</nav>}
      >
        <p>contenido</p>
      </PantallaLayout>,
    );
    expect(screen.getByRole("heading", { name: "Mis turnos" })).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("s@vitalys.com")).toBeInTheDocument();
    expect(screen.getByText("menu")).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onLogout).toHaveBeenCalled();
  });

  it("sin subtítulo ni email no los renderiza", () => {
    render(
      <PantallaLayout eyebrow="Socio" titulo="T" onLogout={vi.fn()} nav={null}>
        x
      </PantallaLayout>,
    );
    expect(screen.queryByText("s@vitalys.com")).not.toBeInTheDocument();
  });
});
