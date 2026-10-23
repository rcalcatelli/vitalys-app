import { useEffect, useState } from "react";
import { miPerfilProfesional } from "../api/profesionalesApi";
import type { Especialidad } from "../types/profesional";
import { ESPECIALIDADES } from "../utils/formato";

/**
 * Especialidad del profesional autenticado, para la segunda línea de la tarjeta del shell
 * ("Nutrición"). Es decorativa: si la consulta falla devuelve `null` y el shell muestra el rol.
 */
export function useEspecialidadPropia(omitir: boolean): Especialidad | null {
  const [especialidad, setEspecialidad] = useState<Especialidad | null>(null);

  useEffect(() => {
    if (omitir) return;
    let vigente = true;
    miPerfilProfesional()
      .then((perfil) => {
        if (vigente && ESPECIALIDADES.includes(perfil.especialidad)) {
          setEspecialidad(perfil.especialidad);
        }
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [omitir]);

  return especialidad;
}
