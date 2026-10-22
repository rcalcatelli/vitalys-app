import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Aviso } from "./Aviso";

describe("Aviso", () => {
  it("el tono de error se anuncia como alerta y muestra el título", () => {
    render(
      <Aviso tono="bad" titulo="Ojo">
        Algo falló
      </Aviso>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("OjoAlgo falló");
  });

  it("los demás tonos son un estado y sin título no lo muestran", () => {
    render(<Aviso tono="ok">Listo</Aviso>);
    expect(screen.getByRole("status")).toHaveTextContent("Listo");
  });
});
