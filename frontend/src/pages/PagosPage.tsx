import { useCallback, useEffect, useState } from "react";
import { estadoCuentaDe, registrarPago } from "../api/pagosApi";
import { listarPersonas } from "../api/personasApi";
import { listarTurnos } from "../api/turnosApi";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Aviso } from "../components/molecules/Aviso";
import { Modal } from "../components/molecules/Modal";
import { EstadoCuentaView } from "../components/organisms/EstadoCuentaView";
import { RegistrarPagoDialog, type DatosPago } from "../components/organisms/RegistrarPagoDialog";
import { PageHeader } from "../components/molecules/PageHeader";
import type { EstadoCuenta } from "../types/pago";
import type { Persona } from "../types/persona";
import type { Turno } from "../types/turno";
import { mensajeDeError } from "../utils/errores";
import { formatearMonto } from "../utils/pagoUi";

/** Espera antes de consultar mientras se escribe en el buscador. */
const DEMORA_BUSQUEDA_MS = 300;

function nombreDe(p: Pick<Persona, "apellido" | "nombre">): string {
  return `${p.nombre} ${p.apellido}`;
}

/**
 * Pagos (ADMIN, nav "Pagos"): se busca a una persona por nombre o DNI, se ve su estado de cuenta y
 * se registra un pago (cuota mensual o sesión de consultorio) en un modal. Contenedor.
 */
export function PagosPage() {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Persona[] | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [persona, setPersona] = useState<Persona | null>(null);
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const [dialogo, setDialogo] = useState(false);
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [errorTurnos, setErrorTurnos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

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
    setAviso(null);
    void cargarEstado(elegida.id);
  }

  function cambiarPersona() {
    setPersona(null);
    setEstado(null);
    setErrorEstado(null);
    setAviso(null);
  }

  function abrirDialogo() {
    if (!persona) return;
    setErrorPago(null);
    setTurnos(null);
    setErrorTurnos(false);
    setDialogo(true);
    listarTurnos({ personaId: persona.id, tipo: "CONSULTORIO" })
      .then(setTurnos)
      .catch(() => setErrorTurnos(true));
  }

  async function confirmar(datos: DatosPago) {
    if (!persona || enviando) return;
    setEnviando(true);
    setErrorPago(null);
    try {
      const pago = await registrarPago({ personaId: persona.id, ...datos });
      setDialogo(false);
      setAviso(`Se registró el pago de ${formatearMonto(pago.monto)} de ${nombreDe(persona)}.`);
      await cargarEstado(persona.id);
    } catch (err) {
      setErrorPago(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Recepción"
        titulo="Pagos"
        subtitulo="Estado de cuenta y pagos de cada persona."
      />
      <div className="flex flex-col gap-4">
        {aviso && <Aviso tono="ok">{aviso}</Aviso>}

        {!persona && (
          <>
            <Input
              aria-label="Buscar por nombre o DNI"
              placeholder="Buscar por nombre o DNI"
              value={texto}
              onChange={alBuscar}
            />
            {errorBusqueda && <Aviso tono="bad">{errorBusqueda}</Aviso>}
            {!texto.trim() && (
              <div className="rounded-2xl border border-dashed border-border-2 px-4 py-6 text-center text-sm text-ink-2">
                Buscá a una persona por nombre o DNI para ver su estado de cuenta.
              </div>
            )}
            {texto.trim() && resultados && (
              <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                {resultados.length === 0 && (
                  <li className="px-4 py-5 text-sm text-ink-3">
                    No encontramos a nadie con ese nombre o DNI.
                  </li>
                )}
                {resultados.map((p) => (
                  <li key={p.id} className="border-t border-border first:border-t-0">
                    <button
                      type="button"
                      onClick={() => elegir(p)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium text-ink">{`${p.apellido}, ${p.nombre}`}</span>
                        <span className="text-xs text-ink-3">
                          DNI <span className="font-mono">{p.dni}</span>
                        </span>
                      </span>
                      {p.esSocioGym && (
                        <span className="rounded-md bg-gym-soft px-2 py-0.5 text-xs font-semibold text-gym-ink">
                          Socio gym
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {persona && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <div className="flex min-w-0 flex-1 basis-52 flex-col gap-0.5">
                <span className="font-heading text-lg font-semibold text-ink">
                  {nombreDe(persona)}
                </span>
                <span className="text-xs text-ink-3">
                  DNI <span className="font-mono">{persona.dni}</span>
                </span>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="md" onClick={cambiarPersona}>
                  Cambiar persona
                </Button>
                <Button type="button" disabled={!estado} onClick={abrirDialogo}>
                  Registrar pago
                </Button>
              </div>
            </div>

            {errorEstado && (
              <>
                <Aviso tono="bad">{errorEstado}</Aviso>
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() => void cargarEstado(persona.id)}
                >
                  Reintentar
                </Button>
              </>
            )}
            {!estado && !errorEstado && (
              <p className="text-sm text-ink-3">Cargando estado de cuenta…</p>
            )}
            {estado && <EstadoCuentaView estado={estado} vista="admin" />}
          </>
        )}

        {dialogo && persona && estado && (
          <Modal titulo="Registrar pago" onClose={() => setDialogo(false)}>
            <RegistrarPagoDialog
              nombre={nombreDe(persona)}
              estado={estado}
              turnos={turnos}
              errorTurnos={errorTurnos}
              enviando={enviando}
              error={errorPago}
              onConfirmar={(datos) => void confirmar(datos)}
              onCancelar={() => setDialogo(false)}
            />
          </Modal>
        )}
      </div>
    </>
  );
}
