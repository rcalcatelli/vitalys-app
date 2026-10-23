export type KpiTone = "gym" | "clin" | "bad" | "ok" | "warn" | "neutral";

export interface KpiCardProps {
  etiqueta: string;
  valor: number | string;
  detalle?: string;
  /** Color del puntito de la etiqueta. */
  tono?: KpiTone;
  /** Pinta también el número con el color del tono (p.ej. impagos en rojo). */
  valorTonal?: boolean;
}

const PUNTO: Record<KpiTone, string> = {
  gym: "bg-gym",
  clin: "bg-clin",
  bad: "bg-bad",
  ok: "bg-ok",
  warn: "bg-warn",
  neutral: "bg-ink-3",
};

const VALOR: Record<KpiTone, string> = {
  gym: "text-gym-ink",
  clin: "text-clin-ink",
  bad: "text-bad-ink",
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  neutral: "text-ink",
};

/** Molécula: indicador numérico del mockup (puntito + etiqueta, número grande, detalle). */
export function KpiCard({
  etiqueta,
  valor,
  detalle,
  tono = "neutral",
  valorTonal = false,
}: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3.5">
      <span className="flex items-center gap-[7px] text-caption text-ink-2">
        <span aria-hidden="true" className={`h-2 w-2 rounded-xs ${PUNTO[tono]}`} />
        {etiqueta}
      </span>
      <span
        className={`font-heading text-[34px] leading-none font-semibold ${valorTonal ? VALOR[tono] : "text-ink"}`}
      >
        {valor}
      </span>
      {detalle && <span className="text-xs text-ink-3">{detalle}</span>}
    </div>
  );
}
