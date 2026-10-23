import { useMediaQuery } from "../../../hooks/useMediaQuery";
import type { EstadoCuenta, PeriodoDto } from "../../../types/pago";
import { abreviaturaDia } from "../../../utils/diasUi";
import { fechaBA, horaBA } from "../../../utils/fechaBA";
import {
  etiquetaEstadoPeriodo,
  etiquetaMedio,
  etiquetaPeriodo,
  etiquetaPeriodoEnFrase,
  fechaDMA,
  fechaInstanteDMA,
  formatearMonto,
  tonoEstadoPeriodo,
} from "../../../utils/pagoUi";
import { etiquetaEspecialidad } from "../../../utils/formato";
import { Chip } from "../../atoms/Chip";
import type { ChipTone } from "../../atoms/Chip";

export interface EstadoCuentaViewProps {
  estado: EstadoCuenta;
  /** `socio`: habla en segunda persona (voseo). `admin`: tercera persona sobre la persona. */
  vista: "socio" | "admin";
  /** La persona está dada de baja: el estado de cuenta no tiene cuota que mostrar. */
  dadaDeBaja?: boolean;
}

interface Resumen {
  titulo: string;
  linea: string;
  tono: "ok" | "warn" | "bad" | "neutral";
  chip: { tone: ChipTone; label: string };
}

const COLOR_TITULO = {
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  bad: "text-bad-ink",
  neutral: "text-ink",
};

const TITULO_SECCION = "font-heading text-[17px] font-semibold text-ink";
const GRILLA_PERIODOS =
  "grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)]";
const GRILLA_SESIONES =
  "grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.1fr)]";
const ENCABEZADO =
  "grid gap-3 bg-surface-2 px-4 py-2.5 text-xs font-semibold tracking-[0.05em] text-ink-3 uppercase";

function primerImpago(periodos: PeriodoDto[]): PeriodoDto | undefined {
  return periodos.find((p) => p.estado === "IMPAGO");
}

function resumir({ estado, vista, dadaDeBaja }: EstadoCuentaViewProps): Resumen {
  const socio = vista === "socio";
  const { esSocioGym, suspendido, periodosImpagos: n, umbral, excepcion, periodos } = estado;
  if (dadaDeBaja) {
    return {
      titulo: "Gimnasio dado de baja",
      linea: socio
        ? "Tu servicio de gimnasio está dado de baja. Las consultas siguen habilitadas."
        : "El servicio de gimnasio está dado de baja. Las consultas siguen habilitadas.",
      tono: "neutral",
      chip: { tone: "neutral", label: "Dado de baja" },
    };
  }
  if (!esSocioGym) {
    return {
      titulo: "Sin cuota de gimnasio",
      linea: socio
        ? "No sos socio/a del gimnasio: solo pagás las sesiones de consultorio."
        : "No es socio/a del gimnasio: solo paga las sesiones de consultorio.",
      tono: "neutral",
      chip: { tone: "neutral", label: "Solo consultorio" },
    };
  }
  if (excepcion) {
    return {
      titulo: "Reserva de gimnasio suspendida",
      linea: socio
        ? `Tenés ${n} períodos impagos. Mientras la excepción esté vigente podés reservar; regularizá en recepción.`
        : `Tiene ${n} períodos impagos. Mientras la excepción esté vigente puede reservar el gimnasio.`,
      tono: "bad",
      chip: { tone: "warn", label: "Excepción vigente" },
    };
  }
  if (suspendido) {
    return {
      titulo: "Reserva de gimnasio suspendida",
      linea: socio
        ? `Llegaste a ${n} períodos impagos. Regularizá en recepción para volver a reservar. Las consultas siguen habilitadas.`
        : `Tiene ${n} períodos impagos. Las consultas siguen habilitadas.`,
      tono: "bad",
      chip: { tone: "bad", label: "Reserva suspendida" },
    };
  }
  if (n > 0) {
    const antiguo = primerImpago(periodos);
    const base = socio
      ? `Podés seguir reservando el gimnasio. Con ${umbral} períodos impagos la reserva se suspende.`
      : `Puede seguir reservando. Con ${umbral} períodos impagos la reserva se suspende.`;
    return {
      titulo: `Con períodos impagos (${n} de ${umbral})`,
      linea: antiguo
        ? `${base} El más antiguo es ${etiquetaPeriodoEnFrase(antiguo.periodo)}.`
        : base,
      tono: "warn",
      chip: { tone: "warn", label: "Reserva habilitada" },
    };
  }
  const pendiente = periodos.find((p) => p.estado === "PENDIENTE");
  return {
    titulo: "Al día",
    linea: pendiente
      ? `La cuota de ${etiquetaPeriodoEnFrase(pendiente.periodo)} vence el ${fechaDMA(pendiente.vence)} (tolerancia hasta el ${fechaDMA(pendiente.limite)}).`
      : "No hay períodos pendientes.",
    tono: "ok",
    chip: { tone: "ok", label: "Reserva habilitada" },
  };
}

function Medidor({ estado }: { estado: EstadoCuenta }) {
  const { periodosImpagos: n, umbral, suspendido, excepcion } = estado;
  const lleno = suspendido || excepcion ? "bg-bad" : "bg-warn";
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`${n} de ${umbral} períodos impagos`}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${umbral}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: umbral }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-[3px] ${i < n ? lleno : "bg-border"}`} />
        ))}
      </div>
      <span className="font-mono text-caption text-ink-3">
        {n > umbral
          ? `${n} períodos impagos · el límite es ${umbral}`
          : `${n} de ${umbral} períodos impagos`}
      </span>
    </div>
  );
}

function Indicador({
  etiqueta,
  valor,
  detalle,
  color = "text-ink",
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  color?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3.5">
      <span className="text-caption text-ink-2">{etiqueta}</span>
      <span className={`font-mono text-[21px] leading-[1.1] font-medium ${color}`}>{valor}</span>
      <span className="text-xs text-ink-3">{detalle}</span>
    </div>
  );
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * Organismo presentacional: estado de cuenta de una persona (cuota mensual del gimnasio, indicadores,
 * períodos y sesiones de consultorio pagadas). Lo reutilizan la pantalla del socio y la del ADMIN
 * (en tercera persona y sin "Cómo funciona la mora"). Desde 1000px las filas son tablas de
 * columnas; por debajo, tarjetas de dos líneas.
 */
export function EstadoCuentaView({ estado, vista, dadaDeBaja = false }: EstadoCuentaViewProps) {
  const ancho = useMediaQuery("(min-width: 1000px)");
  const socio = vista === "socio";
  const resumen = resumir({ estado, vista, dadaDeBaja });
  const { periodosImpagos: n, umbral } = estado;
  const periodos = [...estado.periodos].reverse();
  const sesiones = [...estado.sesiones].sort((a, b) =>
    (b.fechaTurno ?? "").localeCompare(a.fechaTurno ?? ""),
  );
  const pagadas = estado.periodos.filter((p) => p.pago);
  const sumaCuotas = pagadas.reduce((total, p) => total + (p.pago?.monto ?? 0), 0);
  const sumaSesiones = estado.sesiones.reduce((total, s) => total + s.monto, 0);
  const colorImpagos =
    estado.suspendido || estado.excepcion ? "text-bad-ink" : n > 0 ? "text-warn-ink" : "text-ink";
  const conCuota = estado.esSocioGym && !dadaDeBaja;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <section
          aria-label="Cuota mensual de gimnasio"
          className="flex min-w-0 flex-[3_1_360px] flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-small text-ink-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-xs bg-gym" />
                Cuota mensual de gimnasio
              </span>
              <h2
                className={`font-heading text-2xl leading-[1.15] font-semibold text-balance ${COLOR_TITULO[resumen.tono]}`}
              >
                {resumen.titulo}
              </h2>
            </div>
            <Chip tone={resumen.chip.tone} tamano="lg" dot>
              {resumen.chip.label}
            </Chip>
          </div>
          {conCuota && <Medidor estado={estado} />}
          <p className="text-[13.5px] text-pretty text-ink-2">{resumen.linea}</p>
          {estado.excepcion && (
            <div className="flex flex-col gap-[3px] rounded-[10px] bg-warn-soft px-3.5 py-3 text-[13.5px] text-warn-ink">
              <strong className="font-semibold">
                Excepción vigente hasta{" "}
                <span className="font-mono">{fechaDMA(estado.excepcion.validaHasta)}</span>
              </strong>
              <span className="text-pretty">
                {socio
                  ? "Recepción autorizó que reserves el gimnasio hasta esa fecha."
                  : `Autorizada por ${estado.excepcion.autorizadaPor ?? "Recepción"}${
                      estado.excepcion.otorgadaEl
                        ? ` el ${fechaInstanteDMA(estado.excepcion.otorgadaEl)}`
                        : ""
                    } · “${estado.excepcion.motivo}”`}
              </span>
            </div>
          )}
        </section>
        {socio && (
          <aside className="flex min-w-0 flex-[2_1_280px] flex-col gap-2 rounded-xl bg-warn-soft p-[18px] text-warn-ink">
            <strong className="text-[15px] font-semibold">Cómo funciona la mora</strong>
            <span className="text-[13.5px] text-pretty">
              Las cuotas impagas se acumulan: un pago nuevo no cancela un mes salteado. Con deuda
              podés seguir reservando el gimnasio; al llegar al límite de períodos impagos queda
              suspendido hasta regularizar.
            </span>
            <span className="text-[13.5px] text-pretty">
              Las consultas de Nutrición, Psicología y Kinesiología siguen habilitadas.
            </span>
          </aside>
        )}
      </div>

      <section
        aria-label="Indicadores de pagos"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5"
      >
        <Indicador
          etiqueta="Total pagado"
          valor={formatearMonto(estado.totales.montoTotal)}
          detalle={plural(estado.totales.cantidadPagos, "pago registrado", "pagos registrados")}
        />
        {conCuota && (
          <Indicador
            etiqueta="Cuotas"
            valor={formatearMonto(sumaCuotas)}
            detalle={plural(pagadas.length, "período pagado", "períodos pagados")}
          />
        )}
        <Indicador
          etiqueta="Sesiones de consultorio"
          valor={formatearMonto(sumaSesiones)}
          detalle={plural(estado.sesiones.length, "sesión pagada", "sesiones pagadas")}
        />
        {conCuota && (
          <Indicador
            etiqueta="Períodos impagos"
            valor={String(n)}
            detalle={`Con ${umbral} se suspende la reserva`}
            color={colorImpagos}
          />
        )}
      </section>

      <section aria-label="Períodos de cuota" className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className={TITULO_SECCION}>Períodos de cuota</h3>
          {conCuota && (
            <span className="text-caption text-ink-3">
              Un período queda impago si pasan 10 días del mes siguiente sin pago.
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {ancho && periodos.length > 0 && (
            <div className={`${ENCABEZADO} ${GRILLA_PERIODOS}`}>
              <span>Período</span>
              <span>Estado</span>
              <span>Fecha de pago</span>
              <span>Monto</span>
              <span>Medio</span>
            </div>
          )}
          {periodos.length === 0 && (
            <div className="px-4 py-5 text-ink-3">
              {dadaDeBaja
                ? "El servicio de gimnasio está dado de baja."
                : estado.esSocioGym
                  ? "Todavía no hay períodos."
                  : socio
                    ? "No sos socio/a del gimnasio, así que no tenés cuotas mensuales."
                    : "No es socio/a del gimnasio, así que no tiene cuotas mensuales."}
            </div>
          )}
          {periodos.map((p) => (
            <FilaPeriodo key={p.periodo} periodo={p} ancho={ancho} />
          ))}
        </div>
      </section>

      <section aria-label="Sesiones de consultorio pagadas" className="flex flex-col gap-2.5">
        <h3 className={TITULO_SECCION}>Sesiones de consultorio pagadas</h3>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {ancho && sesiones.length > 0 && (
            <div className={`${ENCABEZADO} ${GRILLA_SESIONES}`}>
              <span>Fecha del turno</span>
              <span>Profesional</span>
              <span>Monto</span>
              <span>Medio</span>
            </div>
          )}
          {sesiones.length === 0 && (
            <div className="px-4 py-5 text-ink-3">
              {socio
                ? "Todavía no tenés sesiones de consultorio pagadas."
                : "Todavía no tiene sesiones de consultorio pagadas."}
            </div>
          )}
          {sesiones.map((s) => {
            const fecha = s.fechaTurno ? fechaBA(s.fechaTurno) : null;
            const turno =
              s.fechaTurno && fecha ? (
                <>
                  {abreviaturaDia(fecha)}{" "}
                  <span className="font-mono text-small">
                    {fechaDMA(fecha)} · {horaBA(s.fechaTurno)}
                  </span>
                </>
              ) : (
                "—"
              );
            const profesional = s.profesional ? `Lic. ${s.profesional}` : "—";
            const especialidad = s.especialidad ? etiquetaEspecialidad(s.especialidad) : "";
            return ancho ? (
              <div
                key={s.pagoId}
                className={`grid items-center gap-3 border-t border-border px-4 py-3 ${GRILLA_SESIONES}`}
              >
                <span className="font-medium">{turno}</span>
                <span className="flex min-w-0 flex-col">
                  <span>{profesional}</span>
                  {especialidad && <span className="text-xs text-ink-3">{especialidad}</span>}
                </span>
                <span className="font-mono font-medium">{formatearMonto(s.monto)}</span>
                <span className="flex flex-col">
                  <span className="text-ink-2">{etiquetaMedio(s.medio)}</span>
                  <span className="text-xs text-ink-3">
                    Pagado el <span className="font-mono">{fechaInstanteDMA(s.fechaPago)}</span>
                  </span>
                </span>
              </div>
            ) : (
              <div
                key={s.pagoId}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border px-4 py-3"
              >
                <span className="font-medium">{turno}</span>
                <span className="text-right font-mono font-medium">{formatearMonto(s.monto)}</span>
                <span className="text-caption text-ink-3">
                  {profesional}
                  {especialidad && ` · ${especialidad}`}
                </span>
                <span className="text-right text-caption text-ink-2">{etiquetaMedio(s.medio)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FilaPeriodo({ periodo: p, ancho }: { periodo: PeriodoDto; ancho: boolean }) {
  const chip = (
    <Chip tone={tonoEstadoPeriodo(p.estado)} dot>
      {etiquetaEstadoPeriodo(p.estado)}
    </Chip>
  );
  const impago = p.estado === "IMPAGO";
  const colorFecha = p.pago ? "text-ink-2" : impago ? "text-bad-ink" : "text-ink-3";
  const fecha = p.pago ? (
    <span className="font-mono">{fechaInstanteDMA(p.pago.fechaPago)}</span>
  ) : (
    <>
      {impago ? "Venció el " : "Vence el "}
      <span className="font-mono">{fechaDMA(p.vence)}</span>
    </>
  );
  const tolerancia = !p.pago && (
    <span className="block text-xs text-ink-3">tolerancia hasta el {fechaDMA(p.limite)}</span>
  );
  if (ancho) {
    return (
      <div
        className={`grid items-center gap-3 border-t border-border px-4 py-3 ${GRILLA_PERIODOS}`}
      >
        <span className="font-medium">{etiquetaPeriodo(p.periodo)}</span>
        <span>{chip}</span>
        <span className={`text-small ${colorFecha}`}>
          {fecha}
          {tolerancia}
        </span>
        <span className="font-mono font-medium">{p.pago ? formatearMonto(p.pago.monto) : "—"}</span>
        <span className="text-ink-2">{p.pago ? etiquetaMedio(p.pago.medio) : "—"}</span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border px-4 py-3">
      <span className="font-medium">{etiquetaPeriodo(p.periodo)}</span>
      <span className="justify-self-end">{chip}</span>
      <span className={`text-caption ${colorFecha}`}>
        {p.pago && "Pagado el "}
        {fecha}
        {p.pago && ` · ${etiquetaMedio(p.pago.medio)}`}
        {tolerancia}
      </span>
      <span className="text-right font-mono font-medium">
        {p.pago ? formatearMonto(p.pago.monto) : "—"}
      </span>
    </div>
  );
}
