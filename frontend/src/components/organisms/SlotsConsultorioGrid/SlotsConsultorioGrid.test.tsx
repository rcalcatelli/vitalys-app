import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlotsConsultorioGrid } from "./SlotsConsultorioGrid";

const slots = [
  { inicio: "2026-10-27T09:00:00-03:00", fin: "2026-10-27T09:30:00-03:00", libre: true },
  { inicio: "2026-10-27T09:30:00-03:00", fin: "2026-10-27T10:00:00-03:00", libre: false },
];

describe("SlotsConsultorioGrid", () => {
  it("un horario libre se elige y uno ocupado no responde", async () => {
    const onElegir = vi.fn();
    render(<SlotsConsultorioGrid slots={slots} seleccionado={null} onElegir={onElegir} />);
    await userEvent.click(screen.getByRole("button", { name: /09:30/ }));
    expect(onElegir).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /09:30/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /09:00/ }));
    expect(onElegir).toHaveBeenCalledWith("2026-10-27T09:00:00-03:00");
  });

  it("marca el horario seleccionado", () => {
    render(
      <SlotsConsultorioGrid
        slots={slots}
        seleccionado="2026-10-27T09:00:00-03:00"
        onElegir={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /09:00/ })).toHaveAttribute("aria-pressed", "true");
  });
});
