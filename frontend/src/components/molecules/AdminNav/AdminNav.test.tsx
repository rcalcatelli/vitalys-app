import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminNav } from "./AdminNav";

describe("AdminNav", () => {
  it("ofrece Personas y Profesionales y marca la ruta actual", () => {
    render(
      <MemoryRouter initialEntries={["/admin/profesionales"]}>
        <AdminNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Personas" })).toHaveAttribute(
      "href",
      "/admin/personas",
    );
    expect(screen.getByRole("link", { name: "Profesionales" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Personas" })).not.toHaveAttribute("aria-current");
  });
});
