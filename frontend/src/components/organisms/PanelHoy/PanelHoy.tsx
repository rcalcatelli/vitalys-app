import type { ResumenHoy, SocioConDeuda } from "../../../types/resumen";
import { horaCorta } from "../../../utils/formato";
import { Button } from "../../atoms/Button";
import { Chip } from "../../atoms/Chip";
import { KpiCard, type KpiTone } from "../../molecules/KpiCard";

export interface PanelHoyProps {
  resumen: ResumenHoy;
  /** Momento actual, para distinguir franjas pasadas, en curso y por venir. */
  ahora: Date;
  /** "Ir a Pagos": el contenedor decide la ruta. */
  onIrAPagos: () => void;
}

/** `2026-11-20` → `20/11/2026`, sin pasar por Date para no correr el día por zona horaria. */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** "Nombre Apellido"; si el backend no separó los nombres, el texto "Apellido, Nombre" tal cual. */
function nombreDe(s: SocioConDeuda): string {
  return s.nombrePila && s.apellido ? `${s.nombrePila} ${s.apellido}` : s.persona;
}

function detalle(s: SocioConDeuda): string {
  const impagos = `${s.periodosImpagos} ${s.periodosImpagos === 1 ? "período impago" : "períodos impagos"}`;
  if (s.excepcionHasta)
    return `Excepción vigente hasta ${fechaCorta(s.excepcionHasta)} · ${impagos}`;
  if (s.suspendido) return `${impagos} · reserva de gimnasio suspendida`;
  return `${s.periodosImpagos} de ${s.umbral} períodos impagos`;
}

function ChipDeuda({ socio }: { socio: SocioConDeuda }) {
  if (socio.excepcionHasta)
    return (
      <Chip tone="warn" tamano="sm">
        Excepción
      </Chip>
    );
  if (socio.suspendido)
    return (
      <Chip tone="bad" tamano="sm">
        Suspendido
      </Chip>
    );
  return (
    <Chip tone="warn" tamano="sm">
      Impagos
    </Chip>
  );
}

const TITULO = "font-heading text-[17px] font-semibold text-ink";

/** Referencia de color de las barras: pasadas, en curso y reservadas (por venir, con borde punteado). */
function Leyenda() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-ink-3">
      <span className="flex items-center gap-[5px]">
        <span aria-hidden="true" className="h-[9px] w-[9px] rounded-xs bg-gym-past" />
        Pasadas
      </span>
      <span className="flex items-center gap-[5px]">
        <span aria-hidden="true" className="h-[9px] w-[9px] rounded-xs bg-gym" />
        En curso
      </span>
      <span className="flex items-center gap-[5px]">
        <span
          aria-hidden="true"
          className="h-[9px] w-[9px] rounded-xs border border-dashed border-gym bg-gym-soft"
        />
        Reservadas
      </span>
    </div>
  );
}

/**
 * Panel "Hoy en el centro" (W-09): indicadores del día, ocupación del gimnasio por franja y
 * socios con períodos impagos. Presentacional: los datos llegan armados del backend, que usa
 * las mismas reglas que la reserva y el estado de cuenta; acá no hay números ni textos fijos.
 */
export function PanelHoy({ resumen, ahora, onIrAPagos }: PanelHoyProps) {
  const { franjasGym } = resumen;
  const instante = ahora.getTime();
  const cupo = Math.max(1, ...franjasGym.map((f) => f.cupo));
  const cupoTotal = franjasGym.reduce((total, f) => total + f.cupo, 0);
  const porcentaje = cupoTotal ? Math.round((resumen.turnosGymHoy / cupoTotal) * 100) : 0;
  const enCurso = franjasGym.find(
    (f) => new Date(f.inicio).getTime() <= instante && instante < new Date(f.fin).getTime(),
  );

  const kpis: { etiqueta: string; valor: number; detalle: string; tono: KpiTone }[] = [
    {
      etiqueta: "En el gimnasio ahora",
      valor: resumen.enGimnasioAhora,
      detalle: enCurso
        ? `franja ${horaCorta(enCurso.inicio)} · de ${enCurso.cupo} lugares`
        : "sin franja en curso",
      tono: "gym",
    },
    {
      etiqueta: "Turnos de gym hoy",
      valor: resumen.turnosGymHoy,
      detalle: franjasGym.length
        ? `${franjasGym.length} franjas · ${porcentaje}% ocupado`
        : "Hoy el gimnasio no abre",
      tono: "gym",
    },
    {
      etiqueta: "Consultas hoy",
      valor: resumen.consultasHoy,
      detalle: "en consultorio",
      tono: "clin",
    },
    {
      etiqueta: "Socios con impagos",
      valor: resumen.conDeuda,
      detalle: `${resumen.suspendidos} con reserva suspendida`,
      tono: "bad",
    },
  ];

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
            tono={k.tono}
            valorTonal={k.tono === "bad" && k.valor > 0}
          />
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section
          aria-label="Ocupación del gimnasio por franja"
          className="flex min-w-0 flex-[3_1_420px] flex-col gap-3.5 rounded-xl border border-border bg-surface p-[18px]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={TITULO}>Ocupación del gimnasio por franja</h2>
            {franjasGym.length > 0 && <Leyenda />}
          </div>
          {franjasGym.length === 0 ? (
            <p className="text-sm text-ink-3">Hoy el gimnasio no abre.</p>
          ) : (
            <>
              <ul className="relative flex h-[200px] items-end gap-[3px] border-b border-border-2 pt-[18px] shell:gap-[6px]">
                <li
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-[18px] border-t border-dashed border-ink-3"
                />
                <li
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 right-0 font-mono text-[11px] text-ink-3"
                >
                  Cupo {cupo}
                </li>
                {franjasGym.map((f) => {
                  const inicio = new Date(f.inicio).getTime();
                  const fin = new Date(f.fin).getTime();
                  const actual = inicio <= instante && instante < fin;
                  const pasada = fin <= instante;
                  const hora = horaCorta(f.inicio);
                  return (
                    <li
                      key={f.inicio}
                      aria-label={`${hora}: ${f.ocupados} de ${f.cupo}`}
                      aria-current={actual ? "time" : undefined}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[3px]"
                    >
                      <span
                        className={`font-mono text-[10.5px] ${actual ? "font-bold text-gym-ink" : "font-medium text-ink-3"}`}
                      >
                        {f.ocupados}
                      </span>
                      <span
                        className={[
                          "w-full rounded-t-[4px] border border-b-0",
                          actual
                            ? "border-transparent bg-gym"
                            : pasada
                              ? "border-transparent bg-gym-past"
                              : "border-dashed border-gym bg-gym-soft",
                        ].join(" ")}
                        style={{ height: `${(f.ocupados / f.cupo) * 100}%` }}
                      />
                    </li>
                  );
                })}
              </ul>
              <div aria-hidden="true" className="-mt-2 flex gap-[3px] shell:gap-[6px]">
                {franjasGym.map((f) => {
                  const actual =
                    new Date(f.inicio).getTime() <= instante &&
                    instante < new Date(f.fin).getTime();
                  return (
                    <span
                      key={f.inicio}
                      className={`min-w-0 flex-1 text-center font-mono text-[10.5px] ${actual ? "font-bold text-gym-ink" : "font-medium text-ink-3"}`}
                    >
                      {horaCorta(f.inicio).slice(0, 2)}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section
          aria-label="Requieren atención"
          className="flex min-w-0 flex-[2_1_300px] flex-col gap-2.5 rounded-xl border border-border bg-surface p-[18px]"
        >
          <div className="flex items-baseline justify-between">
            <h2 className={TITULO}>Requieren atención</h2>
            <span className="text-caption text-ink-3">
              {resumen.requierenAtencion.length}{" "}
              {resumen.requierenAtencion.length === 1 ? "persona" : "personas"}
            </span>
          </div>
          {resumen.requierenAtencion.length === 0 ? (
            <p className="text-sm text-ink-3">Nadie tiene períodos impagos.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {resumen.requierenAtencion.map((s) => (
                <li
                  key={s.personaId}
                  className="flex items-center gap-2.5 border-t border-border py-2.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="font-medium text-ink">{nombreDe(s)}</span>
                    <span className="text-caption text-ink-3">{detalle(s)}</span>
                  </span>
                  <ChipDeuda socio={s} />
                </li>
              ))}
            </ul>
          )}
          <Button variant="neutral" size="cta" className="mt-1" onClick={onIrAPagos}>
            Ir a Pagos
          </Button>
        </section>
      </div>
    </div>
  );
}
