import { useMemo, useState } from "react";
import type { ConceptoPago, EstadoCuenta, MedioPago, RegistrarPago } from "../../../types/pago";
import type { Turno } from "../../../types/turno";
import { horaBA } from "../../../utils/fechaBA";
import {
  MEDIOS,
  etiquetaMedio,
  etiquetaPeriodo,
  parsearMonto,
  sumarMeses,
} from "../../../utils/pagoUi";
import { diaCorto } from "../../../utils/turnoUi";
import { Button } from "../../atoms/Button";
import { FieldError } from "../../atoms/FieldError";
import { Input } from "../../atoms/Input";
import { Label } from "../../atoms/Label";
import { Select } from "../../atoms/Select";
import { Aviso } from "../../molecules/Aviso";

/** Meses futuros que se ofrecen después del último período: el backend permite el pago adelantado. */
const MESES_ADELANTO = 2;

export type DatosPago = Omit<RegistrarPago, "personaId">;

export interface RegistrarPagoDialogProps {
  nombre: string;
  estado: EstadoCuenta;
  /** Turnos de consultorio de la persona; `null` mientras cargan. */
  turnos: Turno[] | null;
  /** Los turnos no se pudieron leer: solo se puede registrar la cuota. */
  errorTurnos?: boolean;
  enviando?: boolean;
  /** Error del servidor (409 duplicado, 422 regla de negocio, 403...). */
  error?: string | null;
  onConfirmar: (datos: DatosPago) => void;
  onCancelar: () => void;
}

interface Errores {
  periodo?: string;
  turno?: string;
  monto?: string;
  medio?: string;
}

const CONCEPTOS: { valor: ConceptoPago; etiqueta: string }[] = [
  { valor: "CUOTA_MENSUAL", etiqueta: "Cuota mensual" },
  { valor: "SESION_CONSULTORIO", etiqueta: "Sesión de consultorio" },
];

/**
 * Contenido del modal "Registrar pago" (ADMIN). Presentacional: valida la forma, arma el pedido y
 * delega el envío. Las reglas de negocio (período duplicado, turno ya pagado) las resuelve el
 * servidor y se muestran con `error`.
 */
export function RegistrarPagoDialog({
  nombre,
  estado,
  turnos,
  errorTurnos = false,
  enviando = false,
  error = null,
  onConfirmar,
  onCancelar,
}: RegistrarPagoDialogProps) {
  const opcionesPeriodo = useMemo(() => {
    const existentes = estado.periodos.map((p) => ({
      periodo: p.periodo,
      pagado: p.estado === "PAGADO",
    }));
    const ultimo = estado.periodos.at(-1)?.periodo;
    if (!ultimo) return existentes;
    const adelantos = Array.from({ length: MESES_ADELANTO }, (_, i) => ({
      periodo: sumarMeses(ultimo, i + 1),
      pagado: false,
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
      (turnos ?? []).filter(
        (t) => t.tipoTurno === "CONSULTORIO" && !t.estado.startsWith("CANCELADO"),
      ),
    [turnos],
  );

  const sugerido =
    estado.periodos.find((p) => p.estado === "IMPAGO")?.periodo ??
    opcionesPeriodo.find((o) => !o.pagado)?.periodo ??
    "";

  const [concepto, setConcepto] = useState<ConceptoPago>(
    estado.esSocioGym ? "CUOTA_MENSUAL" : "SESION_CONSULTORIO",
  );
  const [periodo, setPeriodo] = useState(sugerido);
  const [turnoId, setTurnoId] = useState("");
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState<MedioPago | "">("");
  const [errores, setErrores] = useState<Errores>({});

  const esCuota = concepto === "CUOTA_MENSUAL";

  function confirmar() {
    if (enviando) return;
    const nuevos: Errores = {};
    if (esCuota && !periodo) nuevos.periodo = "Elegí el período que se paga.";
    if (!esCuota && !turnoId) nuevos.turno = "Elegí el turno que se paga.";
    const importe = parsearMonto(monto);
    if (importe === null || importe <= 0) nuevos.monto = "Ingresá un monto mayor a cero.";
    if (!medio) nuevos.medio = "Elegí el medio de pago.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0 || importe === null || !medio) return;

    onConfirmar(
      esCuota
        ? { concepto, monto: importe, medio, periodo }
        : { concepto, monto: importe, medio, turnoId: Number(turnoId) },
    );
  }

  return (
    <>
      <span className="text-sm text-ink-2">{nombre}</span>

      {error && (
        <Aviso tono="bad" titulo="No se pudo registrar el pago">
          {error}
        </Aviso>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-2">Concepto</span>
        <div role="group" aria-label="Concepto" className="grid grid-cols-2 gap-2">
          {CONCEPTOS.map(({ valor, etiqueta }) => {
            const deshabilitado = valor === "CUOTA_MENSUAL" && !estado.esSocioGym;
            const activo = concepto === valor;
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={activo}
                disabled={deshabilitado}
                onClick={() => {
                  setConcepto(valor);
                  setErrores({});
                }}
                className={[
                  "min-h-11 rounded-md border-[1.5px] px-2.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
                  activo
                    ? "border-clin bg-clin-soft text-clin-ink"
                    : "border-border-2 bg-surface text-ink",
                ].join(" ")}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
        {!estado.esSocioGym && (
          <span className="text-xs text-ink-3">
            No es socio del gimnasio: solo se le pueden registrar sesiones de consultorio.
          </span>
        )}
      </div>

      {esCuota ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pago-periodo">Período</Label>
          <Select
            id="pago-periodo"
            value={periodo}
            onChange={setPeriodo}
            aria-invalid={errores.periodo ? true : undefined}
          >
            <option value="">Elegí un período</option>
            {opcionesPeriodo.map((o) => (
              <option key={o.periodo} value={o.periodo} disabled={o.pagado}>
                {o.pagado
                  ? `${etiquetaPeriodo(o.periodo)} (ya pagado)`
                  : etiquetaPeriodo(o.periodo)}
              </option>
            ))}
          </Select>
          <span className="text-xs text-ink-3">
            Se sugiere el primer período impago. También podés cobrar un mes por adelantado.
          </span>
          {errores.periodo && <FieldError>{errores.periodo}</FieldError>}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {turnos === null && !errorTurnos && (
            <span className="text-sm text-ink-3">Cargando turnos…</span>
          )}
          {errorTurnos && (
            <Aviso tono="bad">No se pudieron cargar los turnos de consultorio.</Aviso>
          )}
          {turnos !== null && turnosCobrables.length === 0 && (
            <div className="rounded-md border border-dashed border-border-2 p-3.5 text-center text-sm text-ink-2">
              No tiene turnos de consultorio para cobrar.
            </div>
          )}
          {turnosCobrables.length > 0 && (
            <>
              <Label htmlFor="pago-turno">Turno de consultorio</Label>
              <Select
                id="pago-turno"
                value={turnoId}
                onChange={setTurnoId}
                aria-invalid={errores.turno ? true : undefined}
              >
                <option value="">Elegí un turno</option>
                {turnosCobrables.map((t) => {
                  const pagado = turnosPagados.has(t.id);
                  const texto = `${diaCorto(t.inicio)} · ${horaBA(t.inicio)}`;
                  return (
                    <option key={t.id} value={t.id} disabled={pagado}>
                      {pagado ? `${texto} (ya pagado)` : texto}
                    </option>
                  );
                })}
              </Select>
              <span className="text-xs text-ink-3">No se muestran los turnos cancelados.</span>
              {errores.turno && <FieldError>{errores.turno}</FieldError>}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 items-start gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pago-monto">Monto</Label>
          <Input
            id="pago-monto"
            inputMode="decimal"
            placeholder="0"
            value={monto}
            onChange={setMonto}
            aria-invalid={errores.monto ? true : undefined}
          />
          {errores.monto && <FieldError>{errores.monto}</FieldError>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pago-medio">Medio de pago</Label>
          <Select
            id="pago-medio"
            value={medio}
            onChange={(v) => setMedio(v as MedioPago | "")}
            aria-invalid={errores.medio ? true : undefined}
            className="h-12"
          >
            <option value="">Elegí un medio</option>
            {MEDIOS.map((m) => (
              <option key={m} value={m}>
                {etiquetaMedio(m)}
              </option>
            ))}
          </Select>
          {errores.medio && <FieldError>{errores.medio}</FieldError>}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-12" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" className="w-auto" disabled={enviando} onClick={confirmar}>
          {enviando ? "Registrando…" : "Registrar pago"}
        </Button>
      </div>
    </>
  );
}
