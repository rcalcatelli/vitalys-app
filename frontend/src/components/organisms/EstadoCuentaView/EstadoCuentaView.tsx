import type { EstadoCuenta } from "../../../types/pago";
import { horaBA } from "../../../utils/fechaBA";
import {
  clasesEstadoPeriodo,
  etiquetaEstadoPeriodo,
  etiquetaMedio,
  etiquetaPeriodo,
  fechaDMA,
  fechaInstanteDMA,
  formatearMonto,
} from "../../../utils/pagoUi";
import { Aviso } from "../../molecules/Aviso";

export interface EstadoCuentaViewProps {
  estado: EstadoCuenta;
  /** `socio`: habla en segunda persona (voseo). `admin`: tercera persona sobre la persona. */
  vista: "socio" | "admin";
}

interface Resumen {
  titulo: string;
  linea: string;
  tono: string;
}

function resumir({ estado, vista }: EstadoCuentaViewProps): Resumen {
  const socio = vista === "socio";
  const { esSocioGym, suspendido, periodosImpagos, umbral } = estado;
  if (!esSocioGym) {
    return {
      titulo: socio ? "No sos socio del gimnasio" : "No es socio del gimnasio",
      linea: socio
        ? "No tenés cuota mensual. Tus sesiones de consultorio pagadas figuran más abajo."
        : "No tiene cuota mensual. Solo se le pueden registrar sesiones de consultorio.",
      tono: "text-ink",
    };
  }
  if (suspendido) {
    return {
      titulo: socio ? "Tu gimnasio está suspendido" : "Gimnasio suspendido",
      linea: socio
        ? `Llegaste al límite de ${umbral} períodos impagos. Para volver a reservar, regularizá tu cuota en recepción.`
        : `Llegó al límite de ${umbral} períodos impagos y no puede reservar gimnasio hasta regularizar.`,
      tono: "text-bad-ink",
    };
  }
  if (periodosImpagos > 0) {
    return {
      titulo: socio ? "Tenés cuotas impagas" : "Tiene cuotas impagas",
      linea: socio
        ? "Podés seguir reservando el gimnasio, pero al llegar al límite de períodos impagos se suspende."
        : "Todavía puede reservar gimnasio, pero al llegar al límite de períodos impagos se suspende.",
      tono: "text-warn-ink",
    };
  }
  return {
    titulo: socio ? "Estás al día" : "Está al día",
    linea: socio ? "No tenés cuotas impagas." : "No tiene cuotas impagas.",
    tono: "text-ok-ink",
  };
}

/**
 * Organismo presentacional: estado de cuenta de una persona (cuota mensual del gimnasio, períodos
 * y sesiones de consultorio pagadas). Lo reutilizan la pantalla del socio y la del ADMIN.
 */
export function EstadoCuentaView({ estado, vista }: EstadoCuentaViewProps) {
  const resumen = resumir({ estado, vista });
  const socio = vista === "socio";

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Cuota mensual de gimnasio"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      >
        <span className="flex items-center gap-2 text-sm text-ink-2">
          <span className="h-2 w-2 rounded-sm bg-gym" />
          Cuota mensual de gimnasio
        </span>
        <h2 className={`font-heading text-2xl font-semibold ${resumen.tono}`}>{resumen.titulo}</h2>
        {estado.esSocioGym && (
          <span className="font-mono text-sm text-ink-3">
            {`${estado.periodosImpagos} de ${estado.umbral} períodos impagos`}
          </span>
        )}
        <p className="text-sm text-ink-2">{resumen.linea}</p>
        {estado.excepcion && (
          <Aviso
            tono="warn"
            titulo={`Excepción vigente hasta ${fechaDMA(estado.excepcion.validaHasta)}`}
          >
            {estado.excepcion.motivo}
          </Aviso>
        )}
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5">
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3.5">
          <span className="text-sm text-ink-2">Pagos registrados</span>
          <span className="font-mono text-xl font-medium text-ink">
            {estado.totales.cantidadPagos}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3.5">
          <span className="text-sm text-ink-2">Total pagado</span>
          <span className="font-mono text-xl font-medium text-ink">
            {formatearMonto(estado.totales.montoTotal)}
          </span>
        </div>
      </div>

      <section aria-label="Períodos de cuota" className="flex flex-col gap-2.5">
        <h3 className="font-heading text-lg font-semibold text-ink">Períodos de cuota</h3>
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {estado.periodos.length === 0 && (
            <li className="px-4 py-5 text-sm text-ink-3">
              {estado.esSocioGym
                ? "Todavía no hay períodos de cuota."
                : socio
                  ? "No tenés cuota mensual de gimnasio."
                  : "No tiene cuota mensual de gimnasio."}
            </li>
          )}
          {estado.periodos.map((p) => (
            <li
              key={p.periodo}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border px-4 py-3 first:border-t-0"
            >
              <span className="font-medium text-ink">{etiquetaPeriodo(p.periodo)}</span>
              <span
                className={`inline-flex h-6 items-center justify-self-end rounded-full px-2.5 text-xs font-semibold ${clasesEstadoPeriodo(p.estado)}`}
              >
                {etiquetaEstadoPeriodo(p.estado)}
              </span>
              <span className="text-xs text-ink-3">
                {p.pago
                  ? `Pagado el ${fechaInstanteDMA(p.pago.fechaPago)} · ${etiquetaMedio(p.pago.medio)}`
                  : `Vence el ${fechaDMA(p.vence)} · tolerancia hasta el ${fechaDMA(p.limite)}`}
              </span>
              {p.pago && (
                <span className="justify-self-end font-mono font-medium text-ink">
                  {formatearMonto(p.pago.monto)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Sesiones de consultorio pagadas" className="flex flex-col gap-2.5">
        <h3 className="font-heading text-lg font-semibold text-ink">
          Sesiones de consultorio pagadas
        </h3>
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {estado.sesiones.length === 0 && (
            <li className="px-4 py-5 text-sm text-ink-3">
              {socio
                ? "Todavía no pagaste sesiones de consultorio."
                : "Todavía no hay sesiones de consultorio pagadas."}
            </li>
          )}
          {estado.sesiones.map((s) => (
            <li
              key={s.pagoId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border px-4 py-3 first:border-t-0"
            >
              <span className="font-medium text-ink">
                {`Turno del ${fechaInstanteDMA(s.fechaTurno)} · ${horaBA(s.fechaTurno)}`}
              </span>
              <span className="justify-self-end font-mono font-medium text-ink">
                {formatearMonto(s.monto)}
              </span>
              <span className="text-xs text-ink-3">
                {`Pagado el ${fechaInstanteDMA(s.fechaPago)} · ${etiquetaMedio(s.medio)}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
