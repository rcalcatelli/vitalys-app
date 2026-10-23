import { useCallback, useEffect, useState } from "react";
import { autorizarExcepcion } from "../api/excepcionesApi";
import { estadoCuentaDe, registrarPago } from "../api/pagosApi";
import { listarPersonas } from "../api/personasApi";
import { listarProfesionales } from "../api/profesionalesApi";
import { listarTurnos } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Buscador } from "../components/atoms/Buscador";
import { Chip } from "../components/atoms/Chip";
import { Aviso } from "../components/molecules/Aviso";
import { Modal } from "../components/molecules/Modal";
import { PageHeader } from "../components/molecules/PageHeader";
import { EstadoCuentaView } from "../components/organisms/EstadoCuentaView";
import { ExcepcionDialog, type DatosExcepcion } from "../components/organisms/ExcepcionDialog";
import { PersonaPagoCard } from "../components/organisms/PersonaPagoCard";
import { RegistrarPagoDialog, type DatosPago } from "../components/organisms/RegistrarPagoDialog";
import { useAhora } from "../hooks/useAhora";
import { useToast } from "../hooks/useToast";
import type { EstadoCuenta } from "../types/pago";
import type { Persona } from "../types/persona";
import type { Profesional } from "../types/profesional";
import type { Turno } from "../types/turno";
import { mensajeDeError } from "../utils/errores";
import { hoyBA } from "../utils/fechaBA";
import { nombreProfesional } from "../utils/formato";
import { etiquetaPeriodoEnFrase, fechaDMA } from "../utils/pagoUi";
import { chipCuota } from "../utils/personaUi";
import { Cargando } from "../components/molecules/Cargando";

/** Espera antes de consultar mientras se escribe en el buscador. */
const DEMORA_BUSQUEDA_MS = 300;
/** Cuántos resultados se listan: el buscador es para ubicar a una persona, no para recorrer la base. */
const MAXIMO_RESULTADOS = 6;

type Dialogo = "ninguno" | "pago" | "excepcion";

function nombreDe(p: Pick<Persona, "apellido" | "nombre">): string {
  return `${p.nombre} ${p.apellido}`;
}

/**
 * Pagos (ADMIN, nav "Pagos"): se busca a una persona por nombre o DNI, se ve su estado de cuenta,
 * se registra un pago (cuota mensual o sesión de consultorio) y, si está suspendida, se autoriza
 * una excepción (RN-09). Contenedor: cada modal es presentacional y esta página hace los pedidos.
 */
export function PagosPage() {
  const ahora = useAhora();
  const { mostrar } = useToast();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Persona[] | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [persona, setPersona] = useState<Persona | null>(null);
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const [dialogo, setDialogo] = useState<Dialogo>("ninguno");
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [errorTurnos, setErrorTurnos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorDialogo, setErrorDialogo] = useState<string | null>(null);

  useEffect(() => {
    const q = texto.trim();
    if (!q) return;
    let vigente = true;
    const id = setTimeout(() => {
      listarPersonas("TODOS", q)
        .then((lista) => {
          if (!vigente) return;
          setResultados(lista);
          setErrorBusqueda(null);
        })
        .catch((err: unknown) => {
          if (vigente) setErrorBusqueda(mensajeDeError(err));
        });
    }, DEMORA_BUSQUEDA_MS);
    return () => {
      vigente = false;
      clearTimeout(id);
    };
  }, [texto]);

  function alBuscar(valor: string) {
    setTexto(valor);
    if (!valor.trim()) {
      setResultados(null);
      setErrorBusqueda(null);
    }
  }

  const cargarEstado = useCallback(async (personaId: number) => {
    try {
      setEstado(await estadoCuentaDe(personaId));
      setErrorEstado(null);
    } catch (err) {
      setEstado(null);
      setErrorEstado(mensajeDeError(err));
    }
  }, []);

  function elegir(elegida: Persona) {
    setPersona(elegida);
    setEstado(null);
    setErrorEstado(null);
    setTexto("");
    setResultados(null);
    void cargarEstado(elegida.id);
  }

  function cambiarPersona() {
    setPersona(null);
    setEstado(null);
    setErrorEstado(null);
  }

  function cerrarDialogo() {
    setDialogo("ninguno");
  }

  function abrirPago() {
    if (!persona) return;
    setErrorDialogo(null);
    setTurnos(null);
    setErrorTurnos(false);
    setDialogo("pago");
    listarTurnos({ personaId: persona.id, tipo: "CONSULTORIO" })
      .then(setTurnos)
      .catch(() => setErrorTurnos(true));
    // Solo sirve para rotular las opciones de turno: si falla, se listan sin el profesional.
    listarProfesionales()
      .then(setProfesionales)
      .catch(() => undefined);
  }

  function abrirExcepcion() {
    setErrorDialogo(null);
    setDialogo("excepcion");
  }

  async function confirmarPago(datos: DatosPago) {
    if (!persona || enviando) return;
    setEnviando(true);
    setErrorDialogo(null);
    try {
      await registrarPago({ personaId: persona.id, ...datos });
      cerrarDialogo();
      mostrar(
        `Pago registrado · ${
          datos.periodo
            ? `cuota de ${etiquetaPeriodoEnFrase(datos.periodo)}`
            : "sesión de consultorio"
        } · ${nombreDe(persona)}`,
      );
      await cargarEstado(persona.id);
    } catch (err) {
      setErrorDialogo(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarExcepcion(datos: DatosExcepcion) {
    if (!persona || enviando) return;
    setEnviando(true);
    setErrorDialogo(null);
    try {
      await autorizarExcepcion({ personaId: persona.id, ...datos });
      cerrarDialogo();
      mostrar(
        `Excepción registrada para ${nombreDe(persona)} hasta ${fechaDMA(datos.validaHasta)}`,
      );
      await cargarEstado(persona.id);
    } catch (err) {
      setErrorDialogo(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  function profesionalDe(profesionalId: number | null): string | null {
    const p = profesionales.find((x) => x.id === profesionalId);
    return p ? nombreProfesional(p) : null;
  }

  const buscando = texto.trim() !== "";

  return (
    <>
      <PageHeader
        eyebrow="Recepción"
        titulo="Pagos"
        subtitulo="Estado de cuenta y pagos de cada persona."
      />
      <div className="flex flex-col gap-3.5">
        <Buscador
          aria-label="Buscar por nombre o DNI"
          placeholder="Buscar por nombre o DNI"
          value={texto}
          onChange={alBuscar}
        />
        {errorBusqueda && <Aviso tono="bad">{errorBusqueda}</Aviso>}
        {buscando && resultados && (
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {resultados.length === 0 && (
              <li className="px-4 py-5 text-ink-3">No encontramos a nadie con ese nombre o DNI.</li>
            )}
            {resultados.slice(0, MAXIMO_RESULTADOS).map((p) => {
              const cuota = chipCuota(p);
              return (
                <li key={p.id} className="border-t border-border first:border-t-0">
                  <button
                    type="button"
                    onClick={() => elegir(p)}
                    className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium text-ink">{nombreDe(p)}</span>
                      <span className="text-caption text-ink-3">
                        DNI <span className="font-mono">{p.dni}</span>
                      </span>
                    </span>
                    <Chip tone={cuota.tone} dot>
                      {cuota.label}
                    </Chip>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!buscando && !persona && (
          <div className="rounded-xl border border-dashed border-border-2 px-4 py-6 text-center text-ink-2">
            Buscá a una persona por nombre o DNI para ver su estado de cuenta y registrar pagos.
          </div>
        )}
        {persona && !buscando && (
          <PersonaPagoCard
            persona={persona}
            pagoDeshabilitado={!estado}
            onCambiar={cambiarPersona}
            onRegistrarPago={abrirPago}
            onAutorizarExcepcion={
              estado?.suspendido && persona.estado === "ACTIVO" ? abrirExcepcion : undefined
            }
          />
        )}
      </div>

      {persona && !buscando && (
        <div className="mt-4 flex flex-col gap-4">
          {errorEstado && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bad bg-bad-soft px-4 py-3.5 text-bad-ink">
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
                <strong className="font-semibold">No pudimos cargar el estado de cuenta</strong>
                <span className="text-[13.5px]">{errorEstado}</span>
              </div>
              <Button
                type="button"
                variant="neutral"
                className="border-current text-inherit"
                onClick={() => void cargarEstado(persona.id)}
              >
                Reintentar
              </Button>
            </div>
          )}
          {!estado && !errorEstado && <Cargando texto="Cargando estado de cuenta…" />}
          {estado && (
            <EstadoCuentaView
              estado={estado}
              vista="admin"
              dadaDeBaja={persona.estado === "INACTIVO"}
            />
          )}
        </div>
      )}

      {dialogo === "pago" && persona && estado && (
        <Modal titulo="Registrar pago" onClose={cerrarDialogo}>
          <RegistrarPagoDialog
            nombre={nombreDe(persona)}
            dni={persona.dni}
            estado={estado}
            dadaDeBaja={persona.estado === "INACTIVO"}
            turnos={turnos}
            profesionalDe={profesionalDe}
            errorTurnos={errorTurnos}
            enviando={enviando}
            error={errorDialogo}
            onConfirmar={(datos) => void confirmarPago(datos)}
            onCancelar={cerrarDialogo}
          />
        </Modal>
      )}

      {dialogo === "excepcion" && persona && estado && (
        <Modal titulo="Autorizar excepción" onClose={cerrarDialogo}>
          <ExcepcionDialog
            nombre={nombreDe(persona)}
            periodosImpagos={estado.periodosImpagos}
            hoy={hoyBA(ahora)}
            enviando={enviando}
            error={errorDialogo}
            onConfirmar={(datos) => void confirmarExcepcion(datos)}
            onCancelar={cerrarDialogo}
          />
        </Modal>
      )}
    </>
  );
}
