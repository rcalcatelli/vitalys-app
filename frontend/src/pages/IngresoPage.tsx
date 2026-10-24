import { useEffect, useState } from "react";
import { cupoGym, listarTurnos, marcarCompletado } from "../api/turnosApi";
import { Buscador } from "../components/atoms/Buscador";
import { FieldError } from "../components/atoms/FieldError";
import { PageHeader } from "../components/molecules/PageHeader";
import { FranjaEnCursoCard } from "../components/organisms/FranjaEnCursoCard";
import { IngresoLista } from "../components/organisms/IngresoLista";
import { useAhora } from "../hooks/useAhora";
import { useToast } from "../hooks/useToast";
import type { FranjaGym, Turno } from "../types/turno";
import { mensajeDeError } from "../utils/errores";
import { hoyBA } from "../utils/fechaBA";
import {
  coincideBusqueda,
  franjaDeIngreso,
  franjaIniciada,
  ordenarIngresos,
  turnosDeFranja,
} from "../utils/ingresoUi";
import { Cargando } from "../components/molecules/Cargando";

interface Datos {
  franjas: FranjaGym[];
  turnos: Turno[];
}

/**
 * Ingreso al gimnasio (`/admin/ingreso`, ADMIN): la franja que se está atendiendo con las personas
 * que reservaron. "Marcar ingreso" registra el check-in (con la hora real) desde 15 minutos antes
 * del inicio, que es lo que permite el backend. Contenedor: consulta la grilla y los turnos del día.
 */
export function IngresoPage() {
  const ahora = useAhora();
  const { mostrar } = useToast();
  const hoy = hoyBA(ahora);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [errorMarcar, setErrorMarcar] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([cupoGym(hoy), listarTurnos({ tipo: "GYM", fecha: hoy })])
      .then(([franjas, turnos]) => {
        if (vigente) setDatos({ franjas, turnos });
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDeError(err));
      });
    return () => {
      vigente = false;
    };
  }, [hoy]);

  async function marcar(turno: Turno) {
    setMarcandoId(turno.id);
    setErrorMarcar(null);
    try {
      const actualizado = await marcarCompletado(turno.id);
      setDatos((previo) =>
        previo
          ? {
              ...previo,
              turnos: previo.turnos.map((t) =>
                t.id === actualizado.id ? { ...t, ...actualizado } : t,
              ),
            }
          : previo,
      );
      mostrar(`${turno.personaNombre} ${turno.personaApellido} ingresó al gimnasio`);
    } catch (err) {
      setErrorMarcar(mensajeDeError(err));
    } finally {
      setMarcandoId(null);
    }
  }

  const franja = datos ? franjaDeIngreso(datos.franjas, ahora) : null;
  const delaFranja = datos && franja ? turnosDeFranja(datos.turnos, franja) : [];
  const ingresaron = delaFranja.filter((t) => t.estado === "COMPLETADO").length;
  const visibles = ordenarIngresos(delaFranja.filter((t) => coincideBusqueda(t, texto)));

  return (
    <>
      <PageHeader eyebrow="Recepción" titulo="Ingreso al gimnasio" />
      <div className="flex flex-col gap-3.5">
        {error && <FieldError>{error}</FieldError>}
        {datos === null && !error && <Cargando texto="Cargando la franja…" />}
        {datos && !franja && (
          <div className="rounded-xl border border-dashed border-border-2 px-4 py-6 text-center text-ink-2">
            No hay una franja de gimnasio en curso. Cuando abra la próxima, vas a poder registrar
            los ingresos acá.
          </div>
        )}
        {datos && franja && (
          <>
            <FranjaEnCursoCard
              inicio={franja.inicio}
              fin={franja.fin}
              enCurso={franjaIniciada(franja, ahora)}
              ingresaron={ingresaron}
              total={delaFranja.length}
            />
            <Buscador
              aria-label="Buscar por nombre o DNI"
              placeholder="Buscar por nombre o DNI"
              acento="gym"
              alto="lg"
              value={texto}
              onChange={setTexto}
            />
            {errorMarcar && <FieldError>{errorMarcar}</FieldError>}
            <IngresoLista
              turnos={visibles}
              marcandoId={marcandoId}
              onMarcar={(t) => void marcar(t)}
              vacio={
                delaFranja.length === 0
                  ? "Nadie reservó esta franja."
                  : "Nadie coincide con la búsqueda."
              }
            />
          </>
        )}
      </div>
    </>
  );
}
