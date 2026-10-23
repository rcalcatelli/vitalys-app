import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import * as pagosApi from "../api/pagosApi";
import { unEstadoCuenta } from "../test/pagoFixture";
import { MiEstadoCuentaPage } from "./MiEstadoCuentaPage";

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

vi.mock("../api/pagosApi", () => ({ miEstadoCuenta: vi.fn() }));

function montar() {
  return render(
    <MemoryRouter>
      <MiEstadoCuentaPage />
    </MemoryRouter>,
  );
}

describe("MiEstadoCuentaPage", () => {
  beforeEach(() => {
    vi.mocked(pagosApi.miEstadoCuenta).mockResolvedValue(unEstadoCuenta());
  });
  afterEach(() => vi.clearAllMocks());

  it("muestra el estado de cuenta del socio", async () => {
    montar();
    expect(screen.getByText("Cargando estado de cuenta…")).toBeInTheDocument();
    expect(await screen.findByText("Estás al día")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Estado de cuenta" })).toHaveAttribute(
      "href",
      "/socio/estado-cuenta",
    );
  });

  it("PU-17 sin ficha (422): explica que falta la ficha y no ofrece reintentar", async () => {
    vi.mocked(pagosApi.miEstadoCuenta).mockRejectedValue(new ApiError(422, "Sin ficha"));
    montar();
    expect(await screen.findByText(/Todavía no tenés tu ficha cargada/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("PU-18 error de red: ofrece reintentar y se recupera", async () => {
    vi.mocked(pagosApi.miEstadoCuenta).mockRejectedValueOnce(new Error("boom"));
    montar();
    expect(await screen.findByText(/No pudimos cargar tu estado de cuenta/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Estás al día")).toBeInTheDocument();
    expect(pagosApi.miEstadoCuenta).toHaveBeenCalledTimes(2);
  });
});
