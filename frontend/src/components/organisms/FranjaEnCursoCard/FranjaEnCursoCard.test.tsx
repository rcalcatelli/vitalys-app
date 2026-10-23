import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FranjaEnCursoCard } from "./FranjaEnCursoCard";

const INICIO = "2026-10-26T10:00:00-03:00";
const FIN = "2026-10-26T11:00:00-03:00";

describe("FranjaEnCursoCard", () => {
  it("PI-126 muestra el horario, 'N de M ingresaron', la barra y la regla de cierre", () => {
    render(<FranjaEnCursoCard inicio={INICIO} fin={FIN} enCurso ingresaron={9} total={14} />);

    expect(screen.getByRole("region", { name: "Franja en curso" })).toBeInTheDocument();
    expect(screen.getByText("Franja en curso")).toBeInTheDocument();
    expect(screen.getByText("10:00 – 11:00")).toBeInTheDocument();
    expect(screen.getByText("9 de 14 ingresaron")).toBeInTheDocument();
    const barra = screen.getByRole("progressbar", { name: "Ingresos de la franja" });
    expect(barra).toHaveAttribute("aria-valuenow", "9");
    expect(barra).toHaveAttribute("aria-valuemax", "14");
    expect(barra.firstElementChild).toHaveStyle({ width: `${(9 / 14) * 100}%` });
    expect(
      screen.getByText(/al cerrar la franja, quienes no hayan ingresado pasan a/),
    ).toHaveTextContent(
      "A las 11:00, al cerrar la franja, quienes no hayan ingresado pasan a Ausente.",
    );
  });

  it("si la franja todavía no empezó, es la próxima", () => {
    render(
      <FranjaEnCursoCard inicio={INICIO} fin={FIN} enCurso={false} ingresaron={0} total={0} />,
    );
    expect(screen.getByRole("region", { name: "Próxima franja" })).toBeInTheDocument();
    expect(screen.getByText("Próxima franja")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({ width: "0%" });
  });
});
