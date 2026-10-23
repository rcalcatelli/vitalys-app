import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as pagosApi from "../api/pagosApi";
import * as personasApi from "../api/personasApi";
import * as turnosApi from "../api/turnosApi";
import { unEstadoCuenta, unPeriodo } from "../test/pagoFixture";
import { unaPersona } from "../test/personaFixture";
import { unTurno } from "../test/turnoFixture";
import type { PagoRegistrado } from "../types/pago";
import { PagosPage } from "./PagosPage";

vi.mock("../context/AuthContext", async (importOriginal) => {
  const real = await importOriginal<typeof import("../context/AuthContext")>();
  return {
    ...real,
    useAuth: () => ({
      rol: "ADMIN",
      usuario: { id: 1, email: "admin@vitalys.com", rol: "ADMIN" },
      logout: vi.fn(),
    }),
  };
});

vi.mock("../api/pagosApi", () => ({
  estadoCuentaDe: vi.fn(),
  registrarPago: vi.fn(),
  miEstadoCuenta: vi.fn(),
}));
vi.mock("../api/personasApi", () => ({ listarPersonas: vi.fn() }));
vi.mock("../api/turnosApi", () => ({ listarTurnos: vi.fn() }));
vi.mock("../hooks/useConteoFallidas", () => ({ useConteoFallidas: () => 0 }));

const juan = unaPersona({ id: 3, nombre: "Juan", apellido: "García", dni: "38100002" });
const ana = unaPersona({
  id: 4,
  nombre: "Ana",
  apellido: "López",
  dni: "40111222",
  esSocioGym: false,
});

const conDeuda = unEstadoCuenta({
  periodosImpagos: 1,
  periodos: [
    unPeriodo({ periodo: "2026-09-01" }),
    unPeriodo({ periodo: "2026-10-01", estado: "IMPAGO", pago: null }),
  ],
});

const pagoOk: PagoRegistrado = {
  id: 77,
  personaId: 3,
  concepto: "CUOTA_MENSUAL",
  monto: 15000,
  medio: "EFECTIVO",
  periodo: "2026-10-01",
  turnoId: null,
  fechaPago: "2026-10-22T12:00:00-03:00",
};

function montar() {
  return render(
    <MemoryRouter>
      <PagosPage />
    </MemoryRouter>,
  );
}

async function buscarYElegirAJuan() {
  await userEvent.type(screen.getByLabelText("Buscar por nombre o DNI"), "garc");
  await userEvent.click(await screen.findByRole("button", { name: /García, Juan/ }));
}

async function llenarCuota() {
  await userEvent.type(screen.getByLabelText("Monto"), "15000");
  await userEvent.selectOptions(screen.getByLabelText("Medio de pago"), "EFECTIVO");
}

describe("PagosPage", () => {
  beforeEach(() => {
    vi.mocked(personasApi.listarPersonas).mockResolvedValue([juan, ana]);
    vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(conDeuda);
    vi.mocked(pagosApi.registrarPago).mockResolvedValue(pagoOk);
    vi.mocked(turnosApi.listarTurnos).mockResolvedValue([unTurno({ id: 50 })]);
  });
  afterEach(() => vi.clearAllMocks());

  it("PU-25 busca por nombre o DNI y lista los resultados con la etiqueta de socio", async () => {
    montar();
    expect(
      screen.getByText("Buscá a una persona por nombre o DNI para ver su estado de cuenta."),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar por nombre o DNI"), "garc");
    expect(await screen.findByRole("button", { name: /García, Juan/ })).toBeInTheDocument();
    expect(personasApi.listarPersonas).toHaveBeenCalledWith("TODOS", "garc");
    expect(screen.getByText("Socio gym", { selector: "span" })).toBeInTheDocument();
  });

  it("sin coincidencias avisa y al vaciar el buscador vuelve al estado inicial", async () => {
    vi.mocked(personasApi.listarPersonas).mockResolvedValue([]);
    montar();
    const buscador = screen.getByLabelText("Buscar por nombre o DNI");
    await userEvent.type(buscador, "zzz");
    expect(
      await screen.findByText("No encontramos a nadie con ese nombre o DNI."),
    ).toBeInTheDocument();

    await userEvent.clear(buscador);
    expect(
      screen.queryByText("No encontramos a nadie con ese nombre o DNI."),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Buscá a una persona/)).toBeInTheDocument();
  });

  it("muestra el error si falla la búsqueda", async () => {
    vi.mocked(personasApi.listarPersonas).mockRejectedValue(new Error("boom"));
    montar();
    await userEvent.type(screen.getByLabelText("Buscar por nombre o DNI"), "ju");
    expect(await screen.findByText(/No se pudo completar la operación/)).toBeInTheDocument();
  });

  it("PU-26 al elegir a la persona muestra su estado de cuenta y permite cambiarla", async () => {
    montar();
    await buscarYElegirAJuan();

    expect(await screen.findByText("Tiene cuotas impagas")).toBeInTheDocument();
    expect(pagosApi.estadoCuentaDe).toHaveBeenCalledWith(3);
    expect(screen.getByText("Juan García")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cambiar persona" }));
    expect(screen.getByLabelText("Buscar por nombre o DNI")).toBeInTheDocument();
    expect(screen.queryByText("Tiene cuotas impagas")).not.toBeInTheDocument();
  });

  it("si falla el estado de cuenta ofrece reintentar", async () => {
    vi.mocked(pagosApi.estadoCuentaDe).mockRejectedValueOnce(
      new ApiError(422, "La persona no tiene ficha"),
    );
    montar();
    await buscarYElegirAJuan();
    expect(await screen.findByText("La persona no tiene ficha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Tiene cuotas impagas")).toBeInTheDocument();
  });

  it("PU-27 registra la cuota, cierra el modal, avisa y refresca el estado", async () => {
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("Tiene cuotas impagas");

    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    const modal = screen.getByRole("dialog", { name: "Registrar pago" });
    expect(within(modal).getByLabelText("Período")).toHaveValue("2026-10-01");
    await llenarCuota();
    await userEvent.click(within(modal).getByRole("button", { name: "Registrar pago" }));

    await waitFor(() =>
      expect(pagosApi.registrarPago).toHaveBeenCalledWith({
        personaId: 3,
        concepto: "CUOTA_MENSUAL",
        monto: 15000,
        medio: "EFECTIVO",
        periodo: "2026-10-01",
      }),
    );
    expect(
      await screen.findByText(/Se registró el pago de \$ 15\.000,00 de Juan García/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pagosApi.estadoCuentaDe).toHaveBeenCalledTimes(2);
  });

  it("PU-28 un 409 del servidor se muestra en el modal y no lo cierra", async () => {
    vi.mocked(pagosApi.registrarPago).mockRejectedValue(
      new ApiError(409, "Ese período ya está pagado"),
    );
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("Tiene cuotas impagas");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await llenarCuota();
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar pago" }),
    );

    expect(await screen.findByText("Ese período ya está pagado")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Registrar pago" })).toBeInTheDocument();
    expect(pagosApi.estadoCuentaDe).toHaveBeenCalledTimes(1);
  });

  it("PU-29 bloquea el doble envío mientras el pago está en curso", async () => {
    let resolver: (p: PagoRegistrado) => void = () => undefined;
    vi.mocked(pagosApi.registrarPago).mockReturnValue(
      new Promise<PagoRegistrado>((r) => {
        resolver = r;
      }),
    );
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("Tiene cuotas impagas");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await llenarCuota();
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar pago" }),
    );

    const enCurso = await screen.findByRole("button", { name: "Registrando…" });
    expect(enCurso).toBeDisabled();
    await userEvent.click(enCurso);
    expect(pagosApi.registrarPago).toHaveBeenCalledTimes(1);

    resolver(pagoOk);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("PU-30 sesión de consultorio: carga los turnos de la persona y no ofrece cuota si no es socia", async () => {
    vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(
      unEstadoCuenta({ personaId: 4, esSocioGym: false, periodos: [], umbral: 0 }),
    );
    montar();
    await userEvent.type(screen.getByLabelText("Buscar por nombre o DNI"), "lop");
    await userEvent.click(await screen.findByRole("button", { name: /López, Ana/ }));
    await screen.findByText("No es socio del gimnasio");

    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(turnosApi.listarTurnos).toHaveBeenCalledWith({ personaId: 4, tipo: "CONSULTORIO" });
    expect(screen.getByRole("button", { name: "Cuota mensual" })).toBeDisabled();
    expect(await screen.findByLabelText("Turno de consultorio")).toBeInTheDocument();
  });

  it("si no se pueden leer los turnos lo avisa en el modal", async () => {
    vi.mocked(turnosApi.listarTurnos).mockRejectedValue(new Error("boom"));
    vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(
      unEstadoCuenta({ esSocioGym: false, periodos: [], umbral: 0 }),
    );
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("No es socio del gimnasio");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(
      await screen.findByText("No se pudieron cargar los turnos de consultorio."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
