import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FranjasEditor } from "./FranjasEditor";

function renderEditor(props: Partial<Parameters<typeof FranjasEditor>[0]> = {}) {
  const handlers = {
    onCambiar: vi.fn(),
    onAgregar: vi.fn(),
    onQuitar: vi.fn(),
    onDescartar: vi.fn(),
    onGuardar: vi.fn(),
  };
  render(
    <FranjasEditor
      filas={[
        { clave: "a", diaSemana: 1, horaInicio: "09:00", horaFin: "12:00" },
        { clave: "b", diaSemana: 3, horaInicio: "08:15", horaFin: "10:00" },
      ]}
      errores={{}}
      hayCambios
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("FranjasEditor", () => {
  it("muestra una fila por franja con día, desde y hasta", () => {
    renderEditor();
    const franja = within(screen.getByRole("group", { name: "Franja 1" }));
    expect(franja.getByLabelText("Día")).toHaveValue("1");
    expect(franja.getByLabelText("Desde")).toHaveValue("09:00");
    expect(franja.getByLabelText("Hasta")).toHaveValue("12:00");
  });

  it("conserva una hora que el servidor guardó fuera de la grilla de 30 minutos", () => {
    renderEditor();
    expect(
      within(screen.getByRole("group", { name: "Franja 2" })).getByLabelText("Desde"),
    ).toHaveValue("08:15");
  });

  it("informa los cambios de cada select y permite quitar o agregar franjas", async () => {
    const user = userEvent.setup();
    const h = renderEditor();
    const franja = within(screen.getByRole("group", { name: "Franja 1" }));

    await user.selectOptions(franja.getByLabelText("Día"), "2");
    expect(h.onCambiar).toHaveBeenLastCalledWith("a", { diaSemana: 2 });
    await user.selectOptions(franja.getByLabelText("Desde"), "10:00");
    expect(h.onCambiar).toHaveBeenLastCalledWith("a", { horaInicio: "10:00" });
    await user.selectOptions(franja.getByLabelText("Hasta"), "13:00");
    expect(h.onCambiar).toHaveBeenLastCalledWith("a", { horaFin: "13:00" });

    await user.click(franja.getByRole("button", { name: "Quitar franja" }));
    expect(h.onQuitar).toHaveBeenCalledWith("a");
    await user.click(screen.getByRole("button", { name: "+ Agregar franja" }));
    expect(h.onAgregar).toHaveBeenCalled();
  });

  it("sin franjas muestra 'Sin franjas cargadas.'", () => {
    renderEditor({ filas: [], hayCambios: false });
    expect(screen.getByText("Sin franjas cargadas.")).toBeInTheDocument();
  });

  it("muestra el error de la fila y deshabilita Guardar mientras haya errores", () => {
    renderEditor({ errores: { a: "Se superpone con Lunes 11:00–13:00." } });
    expect(screen.getByText("Se superpone con Lunes 11:00–13:00.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("Descartar y Guardar solo se habilitan con cambios", async () => {
    const user = userEvent.setup();
    const h = renderEditor();
    await user.click(screen.getByRole("button", { name: "Descartar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(h.onDescartar).toHaveBeenCalled();
    expect(h.onGuardar).toHaveBeenCalled();
  });

  it("sin cambios ambos botones quedan deshabilitados; guardando lo indica", () => {
    renderEditor({ hayCambios: false });
    expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("ofrece el domingo solo si hay una franja ese día", () => {
    renderEditor({
      filas: [{ clave: "a", diaSemana: 7, horaInicio: "09:00", horaFin: "10:00" }],
      guardando: true,
    });
    expect(
      within(screen.getByLabelText("Día")).getByRole("option", { name: "Domingo" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
