import type { ResumenHoy, SocioConDeuda } from "../../../types/resumen";
import { horaCorta } from "../../../utils/formato";
import { Chip } from "../../atoms/Chip";
import { KpiCard, type KpiTone } from "../../molecules/KpiCard";

export interface PanelHoyProps {
  resumen: ResumenHoy;
  /** Momento actual, para distinguir franjas pasadas, en curso y por venir. */
  ahora: Date;
}

/** `2026-11-20` → `20/11/2026`, sin pasar por Date para no correr el día por zona horaria. */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function detalle(s: SocioConDeuda): string {
  const impagos = `${s.periodosImpagos} ${s.periodosImpagos === 1 ? "período impago" : "períodos impagos"}`;
  if (s.excepcionHasta)
    return `${impagos} · excepción vigente hasta ${fechaCorta(s.excepcionHasta)}`;
  if (s.suspendido) return `${impagos} · reserva de gimnasio suspendida`;
  return `${s.periodosImpagos} de ${s.umbral} períodos impagos`;
}

function ChipDeuda({ socio }: { socio: SocioConDeuda }) {
  if (socio.excepcionHasta) return <Chip tone="warn">Excepción</Chip>;
  if (socio.suspendido) return <Chip tone="bad">Suspendido</Chip>;
  return <Chip tone="warn">Impagos</Chip>;
}

/**
 * Panel "Hoy en el centro" (W-09): indicadores del día, ocupación del gimnasio por franja y
 * socios con períodos impagos. Presentacional: los datos llegan armados del backend, que usa
 * las mismas reglas que la reserva y el estado de cuenta.
 */
export function PanelHoy({ resumen, ahora }: PanelHoyProps) {
  const cupoTotal = resumen.franjasGym.reduce((total, f) => total + f.cupo, 0);
  const porcentaje = cupoTotal ? Math.round((resumen.turnosGymHoy / cupoTotal) * 100) : 0;
  const kpis = [
    {
      etiqueta: "En el gimnasio ahora",
      valor: resumen.enGimnasioAhora,
      detalle: "con ingreso registrado",
      punto: "gym" as KpiTone,
    },
    {
      etiqueta: "Turnos de gimnasio hoy",
      valor: resumen.turnosGymHoy,
      detalle: resumen.franjasGym.length
        ? `${resumen.franjasGym.length} franjas · ${porcentaje}% ocupado`
        : "Hoy el gimnasio no abre",
      punto: "gym" as KpiTone,
    },
    {
      etiqueta: "Consultas hoy",
      valor: resumen.consultasHoy,
      detalle: "en consultorio",
      punto: "clin" as KpiTone,
    },
    {
      etiqueta: "Socios con impagos",
      valor: resumen.conDeuda,
      detalle: `${resumen.suspendidos} con reserva suspendida`,
      punto: "bad" as KpiTone,
    },
  ];
  const maximo = Math.max(1, ...resumen.franjasGym.map((f) => f.cupo));

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Indicadores del día"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5"
      >
        {kpis.map((k) => (
          <KpiCard
            key={k.etiqueta}
            etiqueta={k.etiqueta}
            valor={k.valor}
            detalle={k.detalle}
            tono={k.punto}
            valorTonal={k.punto === "bad"}
          />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section
          aria-label="Ocupación del gimnasio por franja"
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <h2 className="font-heading text-base font-semibold text-ink">
            Ocupación del gimnasio por franja
          </h2>
          {resumen.franjasGym.length === 0 ? (
            <p className="text-sm text-ink-3">Hoy el gimnasio no abre.</p>
          ) : (
            <ul className="flex h-40 items-end gap-1 sm:gap-1.5">
              {resumen.franjasGym.map((f) => {
                const inicio = new Date(f.inicio).getTime();
                const fin = new Date(f.fin).getTime();
                const enCurso = inicio <= ahora.getTime() && ahora.getTime() < fin;
                const pasada = fin <= ahora.getTime();
                const color = enCurso ? "bg-gym" : pasada ? "bg-gym-past" : "bg-gym-soft";
                const hora = horaCorta(f.inicio);
                return (
                  <li
                    key={f.inicio}
                    aria-label={`${hora}: ${f.ocupados} de ${f.cupo}`}
                    aria-current={enCurso ? "time" : undefined}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="text-[10px] text-ink-3">{f.ocupados}</span>
                    <span
                      className={`w-full rounded-t-sm ${color}`}
                      style={{ height: `${Math.max(4, (f.ocupados / maximo) * 100)}%` }}
                    />
                    <span
                      className={`text-[10px] ${enCurso ? "font-semibold text-gym-ink" : "text-ink-3"}`}
                    >
                      {hora.slice(0, 2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-label="Requieren atención"
          className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-heading text-base font-semibold text-ink">Requieren atención</h2>
            <span className="text-xs text-ink-3">
              {resumen.requierenAtencion.length}{" "}
              {resumen.requierenAtencion.length === 1 ? "persona" : "personas"}
            </span>
          </div>
          {resumen.requierenAtencion.length === 0 ? (
            <p className="text-sm text-ink-3">Nadie tiene períodos impagos.</p>
          ) : (
            <ul>
              {resumen.requierenAtencion.map((s) => (
                <li
                  key={s.personaId}
                  className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-ink">{s.persona}</span>
                    <span className="text-xs text-ink-3">{detalle(s)}</span>
                  </span>
                  <ChipDeuda socio={s} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
