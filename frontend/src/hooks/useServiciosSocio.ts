import { useEffect, useState } from "react";
import { listarProfesionales } from "../api/profesionalesApi";
import { estadoGym, misTurnos } from "../api/turnosApi";
import { ESPECIALIDADES, etiquetaEspecialidad } from "../utils/formato";
import { estaCancelado } from "../utils/estadoTurno";

/**
 * Servicios del socio para la tarjeta del shell ("Gimnasio + Nutrición"): gimnasio si es socio y
 * las especialidades de sus turnos de consultorio no cancelados (el mismo criterio que las
 * especialidades de Personas). Es decorativo: si una consulta falla se omite esa parte, y si no
 * queda nada devuelve `null` para que el shell muestre el rol.
 */
export function useServiciosSocio(omitir: boolean): string | null {
  const [servicios, setServicios] = useState<string | null>(null);

  useEffect(() => {
    if (omitir) return;
    let vigente = true;
    Promise.allSettled([estadoGym(), misTurnos(), listarProfesionales()]).then(
      ([gym, turnos, profesionales]) => {
        if (!vigente) return;
        const partes: string[] = [];
        if (gym.status === "fulfilled" && gym.value?.esSocioGym) partes.push("Gimnasio");
        if (
          turnos.status === "fulfilled" &&
          profesionales.status === "fulfilled" &&
          Array.isArray(turnos.value) &&
          Array.isArray(profesionales.value)
        ) {
          const ids = new Set(
            turnos.value
              .filter((t) => t.tipoTurno === "CONSULTORIO" && !estaCancelado(t.estado))
              .map((t) => t.profesionalId),
          );
          const usadas = new Set(
            profesionales.value.filter((p) => ids.has(p.id)).map((p) => p.especialidad),
          );
          for (const e of ESPECIALIDADES) if (usadas.has(e)) partes.push(etiquetaEspecialidad(e));
        }
        setServicios(partes.length > 0 ? partes.join(" + ") : null);
      },
    );
    return () => {
      vigente = false;
    };
  }, [omitir]);

  return servicios;
}
