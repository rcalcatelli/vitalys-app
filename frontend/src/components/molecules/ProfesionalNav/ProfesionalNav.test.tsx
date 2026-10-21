import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProfesionalNav } from "./ProfesionalNav";

describe("ProfesionalNav", () => {
  it("ofrece Agenda y Disponibilidad y marca la ruta actual", () => {
    render(
      <MemoryRouter initialEntries={["/profesional/disponibilidad"]}>
        <ProfesionalNav />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Agenda",
      "Disponibilidad",
    ]);
    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute(
      "href",
      "/profesional/agenda",
    );
    expect(screen.getByRole("link", { name: "Disponibilidad" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Agenda" })).not.toHaveAttribute("aria-current");
  });
});
