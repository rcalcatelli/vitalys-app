import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TurnosAfectadosList } from "./TurnosAfectadosList";

describe("TurnosAfectadosList", () => {
  it("lista paciente, hora y fecha de cada turno", () => {
    render(
      <TurnosAfectadosList
        turnos={[
          {
            turnoId: 1,
            personaId: 5,
            paciente: "Juan García",
            inicio: "2026-10-21T16:30:00Z",
            fin: "2026-10-21T17:00:00Z",
          },
          {
            turnoId: 2,
            personaId: 6,
            paciente: "Ana López",
            inicio: "2026-10-22T12:00:00Z",
            fin: "2026-10-22T12:30:00Z",
          },
        ]}
      />,
    );

    const items = within(screen.getByRole("list", { name: "Turnos afectados" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Juan García")).toBeInTheDocument();
    expect(within(items[0]).getByText("13:30")).toBeInTheDocument();
    expect(within(items[0]).getByText("Miércoles 21 de octubre")).toBeInTheDocument();
  });
});
