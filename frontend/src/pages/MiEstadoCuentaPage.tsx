import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { miEstadoCuenta } from "../api/pagosApi";
import { Button } from "../components/atoms/Button";
import { Aviso } from "../components/molecules/Aviso";
import { EstadoCuentaView } from "../components/organisms/EstadoCuentaView";
import { PageHeader } from "../components/molecules/PageHeader";
import { useAuth } from "../context/AuthContext";
import type { EstadoCuenta } from "../types/pago";
import { Cargando } from "../components/molecules/Cargando";

interface ErrorUi {
  mensaje: string;
  /** Un 422 (sin ficha) no se arregla reintentando. */
  reintentable: boolean;
}

function errorUi(err: unknown): ErrorUi {
  if (err instanceof ApiError && err.status === 422) {
    return {
      mensaje:
        "Todavía no tenés tu ficha cargada. Pedila en recepción para ver tu estado de cuenta.",
      reintentable: false,
    };
  }
  return {
    mensaje: "No pudimos cargar tu estado de cuenta. Probá de nuevo en unos segundos.",
    reintentable: true,
  };
}

/** W-04 — Estado de cuenta del socio: cuota mensual, períodos y sesiones pagadas. Contenedor. */
export function MiEstadoCuentaPage() {
  const { usuario } = useAuth();
  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ");
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [error, setError] = useState<ErrorUi | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    miEstadoCuenta()
      .then((e) => {
        if (!vigente) return;
        setEstado(e);
        setError(null);
      })
      .catch((err: unknown) => {
        if (vigente) setError(errorUi(err));
      });
    return () => {
      vigente = false;
    };
  }, [recarga]);

  return (
    <>
      <PageHeader eyebrow={nombre || "Socio"} titulo="Mi estado de cuenta" />
      <div className="flex flex-col gap-4">
        {error && (
          <>
            <Aviso tono="bad">{error.mensaje}</Aviso>
            {error.reintentable && (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => {
                  setError(null);
                  setRecarga((r) => r + 1);
                }}
              >
                Reintentar
              </Button>
            )}
          </>
        )}
        {!estado && !error && <Cargando texto="Cargando estado de cuenta…" />}
        {estado && !error && <EstadoCuentaView estado={estado} vista="socio" />}
      </div>
    </>
  );
}
