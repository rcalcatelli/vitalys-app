import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza los children y dispara onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button type="button" onClick={onClick}>
        INGRESAR
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "INGRESAR" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("respeta disabled: no dispara onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button type="button" onClick={onClick} disabled>
        Creando cuenta…
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Creando cuenta…" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("acepta variant ghost para acciones secundarias", () => {
    render(
      <Button type="button" variant="ghost" aria-label="Mostrar contraseña">
        👁
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeInTheDocument();
  });

  it("acepta variant outline para acciones secundarias con borde (p.ej. toggle de tema)", () => {
    render(
      <Button type="button" variant="outline">
        Modo oscuro
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Modo oscuro" })).toHaveClass("border-border");
  });

  it("acepta variant bad para acciones destructivas", () => {
    render(
      <Button type="button" variant="bad">
        Dar de baja
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Dar de baja" })).toHaveClass("bg-bad");
  });

  it("por defecto mide lo que su texto (44px) y fullWidth lo estira a 48px del login", () => {
    const { rerender } = render(<Button type="button">Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveClass("h-11");
    expect(boton).not.toHaveClass("w-full");

    rerender(
      <Button type="button" size="lg" fullWidth>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass("h-12", "w-full");
  });

  it("outline es chico (38px) salvo que se pida otro tamaño", () => {
    const { rerender } = render(
      <Button type="button" variant="outline">
        Ver
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Ver" })).toHaveClass("h-[38px]");

    rerender(
      <Button type="button" variant="outline" size="md">
        Ver
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Ver" })).toHaveClass("h-11");
  });

  it.each([
    ["gym", "bg-gym"],
    ["ok", "bg-ok"],
    ["tonal-ok", "bg-ok-soft"],
    ["tonal-bad", "bg-bad-soft"],
    ["outline-bad", "text-bad-ink"],
    ["ghost-bad", "text-bad-ink"],
  ] as const)("variant %s aplica su tono", (variant, clase) => {
    render(
      <Button type="button" variant={variant}>
        Acción
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Acción" })).toHaveClass(clase);
  });

  it("tiene las alturas del mockup: 38, 42, 44, 46 y 48", () => {
    render(
      <>
        <Button size="sm">A</Button>
        <Button size="cta">B</Button>
        <Button size="md">C</Button>
        <Button size="modal">D</Button>
        <Button size="lg">E</Button>
        <Button size="tabla">F</Button>
      </>,
    );
    expect(screen.getByText("F")).toHaveClass("h-10");
    expect(screen.getByText("A")).toHaveClass("h-[38px]");
    expect(screen.getByText("B")).toHaveClass("h-[42px]");
    expect(screen.getByText("C")).toHaveClass("h-11");
    expect(screen.getByText("D")).toHaveClass("h-[46px]");
    expect(screen.getByText("E")).toHaveClass("h-12", "text-[15px]");
  });

  it("neutral y warn son las variantes de tarjetas y excepción", () => {
    render(
      <>
        <Button variant="neutral">Neutra</Button>
        <Button variant="warn">Autorizar</Button>
      </>,
    );
    expect(screen.getByText("Neutra")).toHaveClass("border-border-2");
    expect(screen.getByText("Autorizar")).toHaveClass("bg-warn");
  });

  it("esquinas lg redondea a 10px", () => {
    render(<Button esquinas="lg">Nueva</Button>);
    expect(screen.getByText("Nueva")).toHaveClass("rounded-[10px]");
    expect(screen.getByText("Nueva")).not.toHaveClass("rounded-md");
  });
});

describe("Button cargando", () => {
  it("deshabilita, marca aria-busy y muestra el texto de carga como nombre accesible", () => {
    render(
      <Button type="button" cargando textoCargando="Guardando…">
        Guardar cambios
      </Button>,
    );
    const boton = screen.getByRole("button", { name: "Guardando…" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("spinner")).toHaveClass("size-4");
  });

  it("reserva el lugar del texto de reposo (el ancho no cambia): ambos están en el DOM", () => {
    render(
      <Button type="button" cargando textoCargando="Guardando…">
        Guardar cambios
      </Button>,
    );
    expect(screen.getByText("Guardar cambios")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Guardar cambios")).toHaveClass("invisible");
  });

  it("en reposo oculta el texto de carga y no está ocupado", () => {
    render(
      <Button type="button" textoCargando="Guardando…">
        Guardar cambios
      </Button>,
    );
    const boton = screen.getByRole("button", { name: "Guardar cambios" });
    expect(boton).toBeEnabled();
    expect(boton).not.toHaveAttribute("aria-busy");
    expect(screen.getByText("Guardando…")).toHaveClass("invisible");
  });

  it("sin textoCargando, el spinner acompaña al texto de siempre", () => {
    render(
      <Button type="button" cargando>
        Enviar
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("el spinner toma el color del texto en botones sólidos y es teal en los de borde", () => {
    const { rerender } = render(
      <Button type="button" cargando textoCargando="Guardando…">
        Guardar
      </Button>,
    );
    expect(screen.getByTestId("spinner")).toHaveClass("border-t-current");
    rerender(
      <Button type="button" variant="neutral" cargando textoCargando="Guardando…">
        Guardar
      </Button>,
    );
    expect(screen.getByTestId("spinner")).toHaveClass("border-t-clin");
  });

  it("no dispara onClick mientras está en curso", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button type="button" cargando textoCargando="Guardando…" onClick={onClick}>
        Guardar
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
