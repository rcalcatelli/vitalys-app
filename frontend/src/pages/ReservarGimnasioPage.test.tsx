import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as feriadosApi from "../api/feriadosApi";
import { ApiError } from "../api/http";
import * as turnosApi from "../api/turnosApi";
import { unEstadoGym, unaFranjaGym, unTurnoGym } from "../test/turnoFixture";
import { ReservarGimnasioPage } from "./ReservarGimnasioPage";

vi.mock("../context/AuthContext", async (importOriginal) => {
  const real = await importOriginal<typeof import("../context/AuthContext")>();
  return {
    ...real,
    useAuth: () => ({
      rol: "SOCIO_PACIENTE",
      usuario: { id: 1, email: "socio@vitalys.com", rol: "SOCIO_PACIENTE" },
      logout: vi.fn(),
    }),
  };
});

vi.mock("../api/turnosApi", () => ({
  cupoGym: vi.fn(),
  estadoGym: vi.fn(),
  reservarGym: vi.fn(),
  misTurnos: vi.fn(),
}));
vi.mock("../api/feriadosApi", () => ({ listarFeriados: vi.fn() }));

// Lunes 26/10/2026, 10:00 en Buenos Aires.
const AHORA = new Date("2026-10-26T13:00:00Z");
const LUNES = "2026-10-26";
const MARTES = "2026-10-27";

function montar() {
  return render(
    <MemoryRouter>
      <ReservarGimnasioPage />
    </MemoryRouter>,
  );
}

describe("ReservarGimnasioPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym());
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([]);
    vi.mocked(turnosApi.cupoGym).mockImplementation((fecha) =>
      Promise.resolve([unaFranjaGym(fecha, 11, 2), unaFranjaGym(fecha, 12, 20)]),
    );
    vi.mocked(feriadosApi.listarFeriados).mockResolvedValue([
      {
        fecha: "2026-10-28",
        descripcion: "Día de prueba",
        tipo: "NACIONAL",
        cierraGimnasio: true,
        origen: "OFICIAL",
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("no socio de gimnasio: muestra el bloqueo y las franjas como No disponible, sin poder elegirlas", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ esSocioGym: false }));
    montar();
    expect(
      await screen.findByText(
        "Acercate a recepción para sumarlo a tu cuenta. Tus consultas siguen igual.",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /11:00 – 12:00, No disponible/ }),
    ).toBeDisabled();
    expect(screen.queryByText(/lugares libres/)).not.toBeInTheDocument();
  });

  it("suspendido: muestra el texto de suspensión y las franjas como Bloqueado", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ suspendido: true }));
    montar();
    expect(
      await screen.findByText(
        "Alcanzaste el límite de períodos impagos y la reserva de gimnasio está suspendida. Las consultas siguen habilitadas.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /11:00 – 12:00, Bloqueado/ })).toBeDisabled();
    expect(screen.queryByText(/lugares libres/)).not.toBeInTheDocument();
  });

  it("con excepción vigente avisa y deja reservar", async () => {
    vi.mocked(turnosApi.estadoGym).mockResolvedValue(unEstadoGym({ excepcionVigente: true }));
    montar();
    expect(await screen.findByText("Excepción autorizada por Recepción.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /11:00 – 12:00/ })).toBeEnabled();
  });

  it("si no se puede leer el estado muestra el error y no muestra franjas", async () => {
    vi.mocked(turnosApi.estadoGym).mockRejectedValue(
      new ApiError(422, "Tu ficha todavía no fue cargada por el centro: no podés reservar turnos"),
    );
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu ficha todavía no fue cargada");
    expect(turnosApi.cupoGym).not.toHaveBeenCalled();
  });

  it("reserva una franja libre, avisa y recarga el cupo", async () => {
    vi.mocked(turnosApi.reservarGym).mockResolvedValue(unTurnoGym());
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /11:00 – 12:00/ }));
    expect(screen.getByText("Cancelás en término hasta 2 h antes.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(turnosApi.reservarGym).toHaveBeenCalledWith(`${LUNES}T11:00:00-03:00`);
    expect(
      await screen.findByText("Listo, reservaste gimnasio el 26/10 a las 11:00."),
    ).toBeInTheDocument();
    await waitFor(() => expect(turnosApi.cupoGym).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: "Confirmar reserva" })).not.toBeInTheDocument();
  });

  it("Cambiar descarta la selección", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /11:00 – 12:00/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(screen.queryByRole("button", { name: "Confirmar reserva" })).not.toBeInTheDocument();
  });

  it("una franja sin cupo muestra Cupo completo y no se puede elegir", async () => {
    montar();
    expect(await screen.findByText("Cupo completo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /12:00 – 13:00/ })).toBeDisabled();
  });

  it("con un turno de gimnasio ese día lo marca y avisa que ya tiene uno", async () => {
    vi.mocked(turnosApi.misTurnos).mockResolvedValue([
      unTurnoGym({ inicio: `${LUNES}T11:00:00-03:00`, fin: `${LUNES}T12:00:00-03:00` }),
    ]);
    montar();
    await waitFor(() => expect(screen.getAllByText("Tu turno")).toHaveLength(2));
    expect(await screen.findByText("Ya tenés turno este día")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lun 26, Tu turno/ })).toBeInTheDocument();
  });

  it("un feriado con cierre muestra el aviso y no pide el cupo", async () => {
    montar();
    await screen.findByRole("button", { name: /11:00 – 12:00/ });
    const miercoles = await screen.findByRole("button", { name: "Mié 28, Feriado" });
    await userEvent.click(miercoles);
    expect(
      screen.getByText("Feriado: Día de prueba. El gimnasio está cerrado."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/lugares libres/)).not.toBeInTheDocument();
    expect(turnosApi.cupoGym).not.toHaveBeenCalledWith("2026-10-28");
  });

  it("el domingo dice Cerrado y no hay franjas", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Dom 1, Cerrado" }));
    expect(screen.getByText("Los domingos el gimnasio está cerrado.")).toBeInTheDocument();
    expect(screen.queryByText(/lugares libres/)).not.toBeInTheDocument();
  });

  it("muestra las cuatro reglas, el cupo y el horario del día salidos de la grilla", async () => {
    montar();
    expect(await screen.findByText("Franjas de 60 min · cupo 20")).toBeInTheDocument();
    expect(screen.getByText("Hasta 7 días antes y 1 h antes")).toBeInTheDocument();
    expect(screen.getByText("11:00 – 13:00")).toBeInTheDocument();
  });

  it("un día sin franjas lo informa", async () => {
    vi.mocked(turnosApi.cupoGym).mockResolvedValue([]);
    montar();
    expect(await screen.findByText("No hay franjas para este día.")).toBeInTheDocument();
  });

  it("un 409 muestra el mensaje del servidor y recarga", async () => {
    vi.mocked(turnosApi.reservarGym).mockRejectedValue(
      new ApiError(409, "Ya tenés un turno de gimnasio ese día"),
    );
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /11:00 – 12:00/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya tenés un turno de gimnasio");
    await waitFor(() => expect(turnosApi.cupoGym).toHaveBeenCalledTimes(2));
  });

  it("un 422 muestra el mensaje del servidor", async () => {
    vi.mocked(turnosApi.reservarGym).mockRejectedValue(
      new ApiError(422, "Reserva de gimnasio suspendida por morosidad"),
    );
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /11:00 – 12:00/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("suspendida por morosidad");
  });

  it("si falla el cupo lo informa", async () => {
    vi.mocked(turnosApi.cupoGym).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar");
  });

  it("si falla misTurnos igual muestra las franjas", async () => {
    vi.mocked(turnosApi.misTurnos).mockRejectedValue(new Error("boom"));
    montar();
    expect(await screen.findByRole("button", { name: /11:00 – 12:00/ })).toBeEnabled();
  });

  it("cambiar de día pide el cupo de ese día", async () => {
    montar();
    await userEvent.click(await screen.findByRole("button", { name: "Mar 27" }));
    await waitFor(() => expect(turnosApi.cupoGym).toHaveBeenCalledWith(MARTES));
    expect(await screen.findByRole("button", { name: /11:00 – 12:00/ })).toBeEnabled();
  });

  it("a fin de año consulta también los feriados del año siguiente", async () => {
    vi.setSystemTime(new Date("2026-12-30T13:00:00Z"));
    vi.mocked(feriadosApi.listarFeriados).mockImplementation((anio) =>
      Promise.resolve(
        anio === 2027
          ? [
              {
                fecha: "2027-01-01",
                descripcion: "Año Nuevo",
                tipo: "INAMOVIBLE",
                cierraGimnasio: true,
                origen: "OFICIAL",
              },
            ]
          : [],
      ),
    );
    montar();
    expect(await screen.findByRole("button", { name: "Vie 1, Feriado" })).toBeInTheDocument();
    expect(feriadosApi.listarFeriados).toHaveBeenCalledWith(2026);
    expect(feriadosApi.listarFeriados).toHaveBeenCalledWith(2027);
  });
});
