import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmarImpactoDialog } from "./ConfirmarImpactoDialog";

const impacto = {
  cantidad: 1,
  turnos: [
    {
      turnoId: 1,
      personaId: 2,
      paciente: "Juan García",
      inicio: "2026-10-21T16:30:00Z",
      fin: "2026-10-21T17:00:00Z",
    },
  ],
};

function renderDialog(props: Partial<Parameters<typeof ConfirmarImpactoDialog>[0]> = {}) {
  const onConfirmar = vi.fn();
  const onVolver = vi.fn();
  render(
    <ConfirmarImpactoDialog
      impacto={impacto}
      esPropia={false}
      profesional="Lic. Valentina Méndez"
      onConfirmar={onConfirmar}
      onVolver={onVolver}
      {...props}
    />,
  );
  return { onConfirmar, onVolver };
}

describe("ConfirmarImpactoDialog", () => {
  it("el ADMIN ve el nombre del profesional y los turnos afectados", async () => {
    const user = userEvent.setup();
    const { onConfirmar, onVolver } = renderDialog();

    expect(
      screen.getByText(
        "Estos turnos quedan fuera de la nueva disponibilidad de Lic. Valentina Méndez y se cancelarán. Se avisará a cada paciente.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Juan García")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar turnos y guardar" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(onConfirmar).toHaveBeenCalled();
    expect(onVolver).toHaveBeenCalled();
  });

  it("el propio profesional lee 'tu nueva disponibilidad'", () => {
    renderDialog({ esPropia: true });
    expect(
      screen.getByText(
        "Estos turnos quedan fuera de tu nueva disponibilidad y se cancelarán. Se avisará a cada paciente.",
      ),
    ).toBeInTheDocument();
  });

  it("muestra el error y deshabilita la confirmación mientras guarda", () => {
    renderDialog({ error: "Falló", cargando: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
