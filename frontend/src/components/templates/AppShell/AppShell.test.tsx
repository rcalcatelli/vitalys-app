import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import type { AppShellProps } from "./AppShell";

const ITEMS: AppShellProps["items"] = [
  { to: "/admin/hoy", etiqueta: "Hoy en el centro", corta: "Hoy", tono: "neu", badge: 3 },
  { to: "/admin/ingreso", etiqueta: "Ingreso al gimnasio", corta: "Ingreso", tono: "gym" },
  { to: "/admin/profesionales", etiqueta: "Profesionales", corta: "Profes.", tono: "clin" },
];

function montar(props: Partial<AppShellProps> = {}, ruta = "/admin/hoy") {
  const onToggleTheme = vi.fn();
  const onLogout = vi.fn();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppShell
        rolLabel="Recepción"
        items={ITEMS}
        usuario={{ nombre: "Laura Benítez", detalle: "Recepción", iniciales: "LB" }}
        theme="light"
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
        mobile={false}
        {...props}
      >
        <h1>Contenido</h1>
      </AppShell>
    </MemoryRouter>,
  );
  return { onToggleTheme, onLogout };
}

describe("AppShell", () => {
  it("desktop: sidebar con logo, rol, navegación, tarjeta de usuario y contenido", () => {
    montar();

    expect(screen.getByText("Vitalys")).toBeInTheDocument();
    expect(screen.getAllByText("Recepción")).toHaveLength(2); // rol bajo el logo y detalle de la tarjeta
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Hoy en el centro3", "Ingreso al gimnasio", "Profesionales"]);
    expect(screen.getByText("Laura Benítez")).toBeInTheDocument();
    expect(screen.getByText("LB")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contenido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar tema" })).not.toBeInTheDocument();
  });

  it("el ítem activo se marca y cada tono usa su color", () => {
    montar({}, "/admin/ingreso");

    expect(screen.getByRole("link", { name: "Ingreso al gimnasio" })).toHaveClass("bg-gym-soft");
    expect(screen.getByRole("link", { name: "Ingreso al gimnasio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Profesionales/ })).not.toHaveClass("bg-clin-soft");
  });

  it("el botón de tema ofrece el tema contrario y 'Cerrar sesión' cierra la sesión", async () => {
    const { onToggleTheme, onLogout } = montar({ theme: "dark" });

    await userEvent.click(screen.getByRole("button", { name: "Modo claro" }));
    expect(onToggleTheme).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("muestra el banner debajo del header cuando se lo pasan", () => {
    montar({ banner: <div>Operando como Juan</div> });
    expect(screen.getByText("Operando como Juan")).toBeInTheDocument();
  });

  it("mobile: header con tema y avatar, tab bar con textos cortos y badge, sin sidebar", async () => {
    const { onToggleTheme, onLogout } = montar({ mobile: true });

    expect(
      screen.queryByRole("button", { name: "Cerrar sesión", hidden: false }),
    ).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Principal" });
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Hoy3", "Ingreso", "Profes."]);
    expect(screen.queryByText("Modo oscuro")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cambiar tema" }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Cambiar tema" })).toHaveTextContent("Oscuro");

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("mobile en oscuro ofrece 'Claro'", () => {
    montar({ mobile: true, theme: "dark" });
    expect(screen.getByRole("button", { name: "Cambiar tema" })).toHaveTextContent("Claro");
  });

  it("mobile: el tab activo del gimnasio se pinta naranja", () => {
    montar({ mobile: true }, "/admin/ingreso");
    const activo = screen.getByRole("link", { name: "Ingreso" });
    expect(activo).toHaveClass("text-gym-ink");
  });
});
