import type { ReactNode } from "react";

export type TonoAviso = "ok" | "bad" | "warn" | "clin";

export interface AvisoProps {
  tono: TonoAviso;
  /** Línea destacada opcional sobre el texto. */
  titulo?: string;
  children: ReactNode;
}

const CLASES: Record<TonoAviso, string> = {
  ok: "border-ok bg-ok-soft text-ok-ink",
  bad: "border-bad bg-bad-soft text-bad-ink",
  warn: "border-warn bg-warn-soft text-warn-ink",
  clin: "border-clin bg-clin-soft text-clin-ink",
};

/** Molécula: banner informativo (éxito, error, bloqueo). Los de error se anuncian como alerta. */
export function Aviso({ tono, titulo, children }: AvisoProps) {
  return (
    <div
      role={tono === "bad" ? "alert" : "status"}
      className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm ${CLASES[tono]}`}
    >
      {titulo && <strong className="font-semibold">{titulo}</strong>}
      <span>{children}</span>
    </div>
  );
}
