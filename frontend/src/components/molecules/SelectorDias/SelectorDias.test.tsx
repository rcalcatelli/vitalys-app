import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectorDias } from "./SelectorDias";

const dias = [
  { fecha: "2026-10-26", dow: "Lun", num: 26, sub: "Hoy", cerrado: false },
  { fecha: "2026-11-01", dow: "Dom", num: 1, sub: "Cerrado", cerrado: true },
  { fecha: "2026-10-27", dow: "Mar", num: 27, sub: "", cerrado: false },
];

describe("SelectorDias", () => {
  it("marca el día activo y avisa al elegir otro", async () => {
    const onElegir = vi.fn();
    render(<SelectorDias dias={dias} activa="2026-10-26" tono="gym" onElegir={onElegir} />);
    expect(screen.getByRole("button", { name: "Lun 26, Hoy" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Dom 1, Cerrado" }));
    expect(onElegir).toHaveBeenCalledWith("2026-11-01");
  });

  it("sin sub-etiqueta el nombre accesible es solo día y número; el tono clin se aplica", () => {
    render(<SelectorDias dias={dias} activa="2026-10-27" tono="clin" onElegir={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Mar 27" })).toHaveClass("bg-clin");
  });
});
