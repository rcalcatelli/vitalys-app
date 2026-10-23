import { useMemo, useState } from "react";
import type { ConceptoPago, EstadoCuenta, MedioPago, RegistrarPago } from "../../../types/pago";
import type { Turno } from "../../../types/turno";
import { abreviaturaDia } from "../../../utils/diasUi";
import { fechaBA, horaBA } from "../../../utils/fechaBA";
import {
  MEDIOS,
  etiquetaMedio,
  etiquetaPeriodo,
  etiquetaPeriodoEnFrase,
  fechaDMA,
  parsearMonto,
  sumarMeses,
} from "../../../utils/pagoUi";
import { Button } from "../../atoms/Button";
import { Label } from "../../atoms/Label";
import { Select } from "../../atoms/Select";

/** Meses futuros que se ofrecen después del último período: el backend permite el pago adelantado. */
const MESES_ADELANTO = 2;

export type DatosPago = Omit<RegistrarPago, "personaId">;

export interface RegistrarPagoDialogProps {
  nombre: string;
  dni: string;
  estado: EstadoCuenta;
  /** La persona está dada de baja: no genera cuotas mensuales. */
  dadaDeBaja?: boolean;
  /** Turnos de consultorio de la persona; `null` mientras cargan. */
  turnos: Turno[] | null;
  /** Nombre del profesional de un turno (para que el ADMIN distinga las opciones). */
  profesionalDe?: (profesionalId: number | null) => string | null;
  /** Los turnos no se pudieron leer: solo se puede registrar la cuota. */
  errorTurnos?: boolean;
  enviando?: boolean;
  /** Error del servidor (409 duplicado, 422 regla de negocio, 403...). */
  error?: string | null;
  onConfirmar: (datos: DatosPago) => void;
  onCancelar: () => void;
}

type Campo = "periodo" | "turno" | "monto" | "medio";

const CONCEPTOS: { valor: ConceptoPago; etiqueta: string }[] = [
  { valor: "CUOTA_MENSUAL", etiqueta: "Cuota mensual" },
  { valor: "SESION_CONSULTORIO", etiqueta: "Sesión de consultorio" },
];

const AYUDA = "text-caption font-normal text-ink-3 text-pretty";
const ERROR = "text-caption font-normal text-bad-ink";

/**
 * Contenido del modal "Registrar pago" (ADMIN). Presentacional: valida la forma, arma el pedido y
 * delega el envío. Los errores de cada campo aparecen al tocarlo y el botón queda deshabilitado
 * mientras haya alguno. Las reglas de negocio (período duplicado, turno ya pagado) las resuelve el
 * servidor y se muestran con `error`.
 */
export function RegistrarPagoDialog({
  nombre,
  dni,
  estado,
  dadaDeBaja = false,
  turnos,
  profesionalDe,
  errorTurnos = false,
  enviando = false,
  error = null,
  onConfirmar,
  onCancelar,
}: RegistrarPagoDialogProps) {
  const conCuota = estado.esSocioGym && !dadaDeBaja;

  /** Un período por mes: los de la cuenta más los adelantos, con el estado que informa el backend. */
  const opcionesPeriodo = useMemo(() => {
    const existentes = estado.periodos.map((p) => ({ periodo: p.periodo, estado: p.estado }));
    const ultimo = estado.periodos.at(-1)?.periodo;
    if (!ultimo) return existentes;
    const adelantos = Array.from({ length: MESES_ADELANTO }, (_, i) => ({
      periodo: sumarMeses(ultimo, i + 1),
      estado: "PENDIENTE" as const,
    }));
    return [
      ...existentes,
      ...adelantos.filter((a) => !existentes.some((e) => e.periodo === a.periodo)),
    ];
  }, [estado.periodos]);

  const turnosPagados = useMemo(
    () => new Set(estado.sesiones.map((s) => s.turnoId)),
    [estado.sesiones],
  );
  const turnosCobrables = useMemo(
    () =>
      (turnos ?? [])
        .filter((t) => t.tipoTurno === "CONSULTORIO" && !t.estado.startsWith("CANCELADO"))
        .sort((a, b) => b.inicio.localeCompare(a.inicio)),
    [turnos],
  );

  const impago = estado.periodos.find((p) => p.estado === "IMPAGO");
  const sugerido =
    impago?.periodo ?? opcionesPeriodo.find((o) => o.estado !== "PAGADO")?.periodo ?? "";

  const [concepto, setConcepto] = useState<ConceptoPago>(
    conCuota ? "CUOTA_MENSUAL" : "SESION_CONSULTORIO",
  );
  const [periodo, setPeriodo] = useState(sugerido);
  const [turnoId, setTurnoId] = useState("");
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState<MedioPago | "">("");
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});

  const esCuota = concepto === "CUOTA_MENSUAL";
  const importe = parsearMonto(monto);

  const errores: Partial<Record<Campo, string>> = {};
  if (esCuota && !periodo) errores.periodo = "Elegí el período que se paga.";
  if (!esCuota && !turnoId) errores.turno = "Elegí el turno que se paga.";
  if (monto.trim() === "") errores.monto = "Ingresá el monto.";
  else if (importe === null || importe <= 0) errores.monto = "El monto tiene que ser mayor a 0.";
  if (!medio) errores.medio = "Elegí un medio de pago.";

  const mostrar = (campo: Campo) => (tocados[campo] ? errores[campo] : undefined);
  const tocar = (campo: Campo) => setTocados((t) => ({ ...t, [campo]: true }));
  const invalido = Object.keys(errores).length > 0;

  const bordeSelect = (campo: Campo) => (mostrar(campo) ? "border-bad" : "");

  function confirmar() {
    if (enviando || invalido || importe === null || !medio) return;
    onConfirmar(
      esCuota
        ? { concepto, monto: importe, medio, periodo }
        : { concepto, monto: importe, medio, turnoId: Number(turnoId) },
    );
  }

  return (
    <>
      <span className="text-ink-2">
        {nombre} · DNI <span className="font-mono">{dni}</span>
      </span>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-[3px] rounded-[10px] bg-bad-soft px-3.5 py-3 text-[13.5px] text-bad-ink"
        >
          <strong className="font-semibold">No se pudo registrar el pago</strong>
          <span className="text-pretty">{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-ink-2">Concepto</span>
        <div role="group" aria-label="Concepto" className="grid grid-cols-2 gap-2">
          {CONCEPTOS.map(({ valor, etiqueta }) => {
            const deshabilitado = (valor === "CUOTA_MENSUAL" && !conCuota) || enviando;
            const activo = concepto === valor;
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={activo}
                disabled={deshabilitado}
                onClick={() => setConcepto(valor)}
                className={[
                  "min-h-11 rounded-md border-[1.5px] px-2.5 py-1.5 text-[13.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45",
                  activo
                    ? "border-clin bg-clin-soft text-clin-ink"
                    : "border-border-2 bg-surface text-ink-2",
                ].join(" ")}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
        {!conCuota && (
          <span className={AYUDA}>
            {dadaDeBaja
              ? `${nombre} tiene el gimnasio dado de baja, así que no genera cuotas mensuales. Solo podés registrar sesiones de consultorio.`
              : `${nombre} no es socio/a del gimnasio, así que no tiene cuotas mensuales. Solo podés registrar sesiones de consultorio.`}
          </span>
        )}
      </div>

      {esCuota ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pago-periodo">Período</Label>
          <Select
            id="pago-periodo"
            value={periodo}
            onChange={(v) => {
              setPeriodo(v);
              tocar("periodo");
            }}
            aria-invalid={mostrar("periodo") ? true : undefined}
            className={bordeSelect("periodo")}
          >
            <option value="">Elegí un período</option>
            {opcionesPeriodo.map((o) => (
              <option key={o.periodo} value={o.periodo} disabled={o.estado === "PAGADO"}>
                {`${etiquetaPeriodo(o.periodo)} · ${etiquetaEstadoEnOpcion(o.estado)}${o.periodo === sugerido ? " · sugerido" : ""}`}
              </option>
            ))}
          </Select>
          <span className={AYUDA}>
            {impago
              ? `Sugerido: ${etiquetaPeriodoEnFrase(impago.periodo)}, el primer período impago. Un pago no cancela otro mes salteado.`
              : sugerido
                ? `Sugerido: ${etiquetaPeriodoEnFrase(sugerido)}, el próximo período a pagar.`
                : "Elegí el período que se paga."}
          </span>
          {mostrar("periodo") && <span className={ERROR}>{mostrar("periodo")}</span>}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {turnos === null && !errorTurnos && (
            <span className="text-sm text-ink-3">Cargando turnos…</span>
          )}
          {errorTurnos && (
            <div
              role="alert"
              className="rounded-[10px] bg-bad-soft px-3.5 py-3 text-[13.5px] text-bad-ink"
            >
              No se pudieron cargar los turnos de consultorio.
            </div>
          )}
          {turnos !== null && turnosCobrables.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-border-2 p-3.5 text-center text-[13.5px] text-pretty text-ink-2">
              No tiene turnos de consultorio para cobrar. Los turnos cancelados no se pueden cobrar.
            </div>
          )}
          {turnosCobrables.length > 0 && (
            <>
              <Label htmlFor="pago-turno">Turno de consultorio</Label>
              <Select
                id="pago-turno"
                value={turnoId}
                onChange={(v) => {
                  setTurnoId(v);
                  tocar("turno");
                }}
                aria-invalid={mostrar("turno") ? true : undefined}
                className={bordeSelect("turno")}
              >
                <option value="">Elegí un turno</option>
                {turnosCobrables.map((t) => {
                  const pagado = turnosPagados.has(t.id);
                  const fecha = fechaBA(t.inicio);
                  const pro = profesionalDe?.(t.profesionalId);
                  const texto = `${abreviaturaDia(fecha)} ${fechaDMA(fecha)} · ${horaBA(t.inicio)}${pro ? ` · ${pro}` : ""}`;
                  return (
                    <option key={t.id} value={t.id} disabled={pagado}>
                      {pagado ? `${texto} · ya pagado` : texto}
                    </option>
                  );
                })}
              </Select>
              <span className={AYUDA}>No se muestran los turnos cancelados.</span>
              {mostrar("turno") && <span className={ERROR}>{mostrar("turno")}</span>}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 items-start gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pago-monto">Monto</Label>
          <span className="relative block">
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-ink-3"
            >
              $
            </span>
            <input
              id="pago-monto"
              inputMode="decimal"
              placeholder="0"
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value.replace(/[^\d.,]/g, ""));
                tocar("monto");
              }}
              onBlur={() => tocar("monto")}
              aria-invalid={mostrar("monto") ? true : undefined}
              className={`h-11 w-full rounded-md border bg-surface pr-3 pl-7 font-mono text-[15px] text-ink focus:ring-[3px] focus:ring-clin-soft focus:outline-none ${mostrar("monto") ? "border-bad" : "border-border-2"}`}
            />
          </span>
          {mostrar("monto") && <span className={ERROR}>{mostrar("monto")}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pago-medio">Medio de pago</Label>
          <Select
            id="pago-medio"
            value={medio}
            onChange={(v) => {
              setMedio(v as MedioPago | "");
              tocar("medio");
            }}
            onBlur={() => tocar("medio")}
            aria-invalid={mostrar("medio") ? true : undefined}
            className={bordeSelect("medio")}
          >
            <option value="">Elegí un medio</option>
            {MEDIOS.map((m) => (
              <option key={m} value={m}>
                {etiquetaMedio(m)}
              </option>
            ))}
          </Select>
          {mostrar("medio") && <span className={ERROR}>{mostrar("medio")}</span>}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="neutral" size="modal" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" size="modal" disabled={invalido || enviando} onClick={confirmar}>
          {enviando ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>
    </>
  );
}

function etiquetaEstadoEnOpcion(estado: "PAGADO" | "IMPAGO" | "PENDIENTE"): string {
  if (estado === "PAGADO") return "pagado";
  return estado === "IMPAGO" ? "impago" : "pendiente";
}
