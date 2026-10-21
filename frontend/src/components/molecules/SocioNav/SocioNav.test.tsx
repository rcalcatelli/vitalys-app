import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SocioNav } from "./SocioNav";

function renderNav(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <SocioNav />
    </MemoryRouter>,
  );
}

describe("SocioNav", () => {
  it("ofrece gimnasio, consultorio y mis turnos con sus rutas", () => {
    renderNav("/socio/turnos");
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Reservar gimnasio",
      "Turno de consultorio",
      "Mis turnos",
    ]);
    expect(screen.getByRole("link", { name: "Reservar gimnasio" })).toHaveAttribute(
      "href",
      "/socio/reservar-gimnasio",
    );
    expect(screen.getByRole("link", { name: "Turno de consultorio" })).toHaveAttribute(
      "href",
      "/socio/reservar-consultorio",
    );
  });

  it("marca la ruta actual: gimnasio en naranja, el resto en teal", () => {
    const { unmount } = renderNav("/socio/reservar-gimnasio");
    const gym = screen.getByRole("link", { name: "Reservar gimnasio" });
    expect(gym).toHaveAttribute("aria-current", "page");
    expect(gym).toHaveClass("border-gym");
    expect(screen.getByRole("link", { name: "Mis turnos" })).not.toHaveAttribute("aria-current");
    unmount();

    renderNav("/socio/turnos");
    expect(screen.getByRole("link", { name: "Mis turnos" })).toHaveClass("border-clin");
  });
});
