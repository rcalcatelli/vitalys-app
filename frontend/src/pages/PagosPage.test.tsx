import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as excepcionesApi from "../api/excepcionesApi";
import * as pagosApi from "../api/pagosApi";
import * as personasApi from "../api/personasApi";
import * as profesionalesApi from "../api/profesionalesApi";
import * as turnosApi from "../api/turnosApi";
import { unEstadoCuenta, unPeriodo } from "../test/pagoFixture";
import { unaPersona } from "../test/personaFixture";
import { unProfesional } from "../test/profesionalFixture";
import { renderWithRouter } from "../test/renderWithRouter";
import { unTurno } from "../test/turnoFixture";
import type { Excepcion, PagoRegistrado } from "../types/pago";
import { hoyBA, sumarDias } from "../utils/fechaBA";
import { PagosPage } from "./PagosPage";

vi.mock("../api/pagosApi", () => ({
  estadoCuentaDe: vi.fn(),
  registrarPago: vi.fn(),
  miEstadoCuenta: vi.fn(),
}));
vi.mock("../api/personasApi", () => ({ listarPersonas: vi.fn() }));
vi.mock("../api/turnosApi", () => ({ listarTurnos: vi.fn() }));
vi.mock("../api/profesionalesApi", () => ({ listarProfesionales: vi.fn() }));
vi.mock("../api/excepcionesApi", () => ({ autorizarExcepcion: vi.fn() }));

const juan = unaPersona({
  id: 3,
  nombre: "Juan",
  apellido: "García",
  dni: "38100002",
  especialidades: ["PSICOLOGIA"],
});
const ana = unaPersona({
  id: 4,
  nombre: "Ana",
  apellido: "López",
  dni: "40111222",
  esSocioGym: false,
  cuota: null,
  especialidades: [],
});

const conDeuda = unEstadoCuenta({
  periodosImpagos: 1,
  periodos: [
    unPeriodo({ periodo: "2026-09-01" }),
    unPeriodo({ periodo: "2026-10-01", estado: "IMPAGO", pago: null }),
  ],
});

const suspendida = unEstadoCuenta({
  periodosImpagos: 3,
  suspendido: true,
  periodos: [unPeriodo({ periodo: "2026-07-01", estado: "IMPAGO", pago: null })],
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

const excepcionOk: Excepcion = {
  id: 5,
  personaId: 3,
  autorizadoPor: 1,
  motivo: "Pagará el viernes",
  validaHasta: "2099-01-01",
  unSoloUso: false,
  turnoId: null,
};

function montar() {
  return renderWithRouter(<PagosPage />);
}

async function buscarYElegirAJuan() {
  await userEvent.type(screen.getByLabelText("Buscar por nombre o DNI"), "garc");
  await userEvent.click(await screen.findByRole("button", { name: /Juan García/ }));
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
    vi.mocked(profesionalesApi.listarProfesionales).mockResolvedValue([unProfesional()]);
    vi.mocked(excepcionesApi.autorizarExcepcion).mockResolvedValue(excepcionOk);
  });
  afterEach(() => vi.clearAllMocks());

  it("PU-25 busca por nombre o DNI y lista los resultados con el chip de cuota", async () => {
    montar();
    expect(
      screen.getByText(
        "Buscá a una persona por nombre o DNI para ver su estado de cuenta y registrar pagos.",
      ),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar por nombre o DNI"), "garc");
    expect(await screen.findByRole("button", { name: /Juan García/ })).toBeInTheDocument();
    expect(personasApi.listarPersonas).toHaveBeenCalledWith("TODOS", "garc");
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getByText("Sin cuota de gym")).toBeInTheDocument();
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

  it("PU-26 al elegir a la persona muestra su tarjeta con servicios y el estado de cuenta", async () => {
    montar();
    await buscarYElegirAJuan();

    expect(await screen.findByText("Con períodos impagos (1 de 3)")).toBeInTheDocument();
    expect(pagosApi.estadoCuentaDe).toHaveBeenCalledWith(3);
    const tarjeta = within(screen.getByRole("region", { name: "Persona elegida" }));
    expect(tarjeta.getByText("Juan García")).toBeInTheDocument();
    expect(tarjeta.getByText("JG")).toBeInTheDocument();
    expect(tarjeta.getByText("Gimnasio")).toBeInTheDocument();
    expect(tarjeta.getByText("Psicología")).toBeInTheDocument();
    expect(tarjeta.queryByRole("button", { name: "Autorizar excepción" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cambiar persona" }));
    expect(screen.getByLabelText("Buscar por nombre o DNI")).toBeInTheDocument();
    expect(screen.queryByText("Con períodos impagos (1 de 3)")).not.toBeInTheDocument();
  });

  it("si falla el estado de cuenta ofrece reintentar", async () => {
    vi.mocked(pagosApi.estadoCuentaDe).mockRejectedValueOnce(
      new ApiError(422, "La persona no tiene ficha"),
    );
    montar();
    await buscarYElegirAJuan();
    expect(await screen.findByText("La persona no tiene ficha")).toBeInTheDocument();
    expect(screen.getByText("No pudimos cargar el estado de cuenta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Con períodos impagos (1 de 3)")).toBeInTheDocument();
  });

  it("PU-27 registra la cuota, cierra el modal, avisa con un toast y refresca el estado", async () => {
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("Con períodos impagos (1 de 3)");

    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    const modal = screen.getByRole("dialog", { name: "Registrar pago" });
    expect(within(modal).getByLabelText("Período")).toHaveValue("2026-10-01");
    expect(within(modal).getByText("38100002")).toBeInTheDocument();
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
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Pago registrado · cuota de octubre 2026 · Juan García",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pagosApi.estadoCuentaDe).toHaveBeenCalledTimes(2);
  });

  it("PU-28 un 409 del servidor se muestra en el modal y no lo cierra", async () => {
    vi.mocked(pagosApi.registrarPago).mockRejectedValue(
      new ApiError(409, "Ese período ya está pagado"),
    );
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("Con períodos impagos (1 de 3)");
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
    await screen.findByText("Con períodos impagos (1 de 3)");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await llenarCuota();
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar pago" }),
    );

    const enCurso = await screen.findByRole("button", { name: "Registrando pago…" });
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
    await userEvent.click(await screen.findByRole("button", { name: /Ana López/ }));
    await screen.findByText("Sin cuota de gimnasio");

    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(turnosApi.listarTurnos).toHaveBeenCalledWith({ personaId: 4, tipo: "CONSULTORIO" });
    expect(screen.getByRole("button", { name: "Cuota mensual" })).toBeDisabled();
    const turno = await screen.findByLabelText("Turno de consultorio");
    // El nombre del profesional rotula cada turno.
    await waitFor(() =>
      expect(
        within(turno).getByRole("option", { name: /Lic\. Valentina Méndez/ }),
      ).toBeInTheDocument(),
    );
  });

  it("si no se pueden leer los turnos ni los profesionales lo avisa en el modal", async () => {
    vi.mocked(turnosApi.listarTurnos).mockRejectedValue(new Error("boom"));
    vi.mocked(profesionalesApi.listarProfesionales).mockRejectedValue(new Error("boom"));
    vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(
      unEstadoCuenta({ esSocioGym: false, periodos: [], umbral: 0 }),
    );
    montar();
    await buscarYElegirAJuan();
    await screen.findByText("Sin cuota de gimnasio");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(
      await screen.findByText("No se pudieron cargar los turnos de consultorio."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("Autorizar excepción (RN-09)", () => {
    it("PI-136 se ofrece a una persona suspendida y la autoriza con toast y estado refrescado", async () => {
      vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(suspendida);
      montar();
      await buscarYElegirAJuan();
      await screen.findByText("Reserva de gimnasio suspendida");

      await userEvent.click(screen.getByRole("button", { name: "Autorizar excepción" }));
      const modal = within(screen.getByRole("dialog", { name: "Autorizar excepción" }));
      expect(modal.getByText(/Habilita a/)).toHaveTextContent("tenga 3 períodos impagos");
      await userEvent.type(modal.getByLabelText("Motivo"), "Pagará el viernes");
      const hasta = sumarDias(hoyBA(new Date()), 7);
      fireEvent.change(modal.getByLabelText("Válida hasta"), { target: { value: hasta } });
      await userEvent.click(modal.getByRole("button", { name: "Una sola reserva" }));
      await userEvent.click(modal.getByRole("button", { name: "Autorizar" }));

      await waitFor(() =>
        expect(excepcionesApi.autorizarExcepcion).toHaveBeenCalledWith({
          personaId: 3,
          motivo: "Pagará el viernes",
          validaHasta: hasta,
          unSoloUso: true,
        }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        /Excepción registrada para Juan García hasta \d\d\/\d\d\/\d{4}/,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(pagosApi.estadoCuentaDe).toHaveBeenCalledTimes(2);
    });

    it("PI-137 no se ofrece si tiene deuda pero no está suspendida", async () => {
      montar();
      await buscarYElegirAJuan();
      await screen.findByText("Con períodos impagos (1 de 3)");
      expect(screen.queryByRole("button", { name: "Autorizar excepción" })).not.toBeInTheDocument();
    });

    it("no se ofrece a una persona dada de baja", async () => {
      vi.mocked(personasApi.listarPersonas).mockResolvedValue([{ ...juan, estado: "INACTIVO" }]);
      vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(suspendida);
      montar();
      await buscarYElegirAJuan();
      await screen.findByText("Gimnasio dado de baja");
      expect(screen.queryByRole("button", { name: "Autorizar excepción" })).not.toBeInTheDocument();
    });

    it("un 422 del servidor se muestra en el modal y no lo cierra", async () => {
      vi.mocked(pagosApi.estadoCuentaDe).mockResolvedValue(suspendida);
      vi.mocked(excepcionesApi.autorizarExcepcion).mockRejectedValue(
        new ApiError(422, "La persona no está suspendida"),
      );
      montar();
      await buscarYElegirAJuan();
      await screen.findByText("Reserva de gimnasio suspendida");
      await userEvent.click(screen.getByRole("button", { name: "Autorizar excepción" }));
      const modal = within(screen.getByRole("dialog"));
      await userEvent.type(modal.getByLabelText("Motivo"), "x");
      fireEvent.change(modal.getByLabelText("Válida hasta"), {
        target: { value: sumarDias(hoyBA(new Date()), 1) },
      });
      await userEvent.click(modal.getByRole("button", { name: "Autorizar" }));

      expect(await modal.findByText("La persona no está suspendida")).toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Autorizar excepción" })).toBeInTheDocument();
    });
  });
});
