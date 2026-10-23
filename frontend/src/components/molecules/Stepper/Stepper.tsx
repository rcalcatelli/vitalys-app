export interface StepperProps {
  /** Nombres de los pasos, en orden (el diseño usa dos: "Especialidad" y "Horario"). */
  pasos: string[];
  /** Paso alcanzado, desde 1: los anteriores y el actual se pintan activos. */
  actual: number;
}

/** Molécula: indicador de pasos numerados unidos por una línea (flujo de reserva de consultorio). */
export function Stepper({ pasos, actual }: StepperProps) {
  return (
    <ol aria-label="Pasos" className="flex items-center gap-2.5 text-[13px] text-ink-3">
      {pasos.map((nombre, i) => {
        const numero = i + 1;
        const activo = numero <= actual;
        return (
          <li key={nombre} className="contents">
            {i > 0 && <span aria-hidden="true" className="h-px w-6 flex-none bg-border-2" />}
            <span
              aria-current={numero === actual ? "step" : undefined}
              className={`flex items-center gap-1.5 font-semibold ${activo ? "text-clin-ink" : "text-ink-3"}`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[11px] ${activo ? "bg-clin text-on-clin" : "bg-surface-2 text-ink-3"}`}
              >
                {numero}
              </span>
              {nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
