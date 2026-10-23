import { useState } from "react";
import { cancelarTurno } from "../../../api/turnosApi";
import type { Profesional } from "../../../types/profesional";
import type { Turno } from "../../../types/turno";
import { mensajeDeError } from "../../../utils/errores";
import { Modal } from "../../molecules/Modal";
import { CancelarTurnoDialog } from "../CancelarTurnoDialog";

export interface ResultadoCancelacion {
  ok: boolean;
  texto: string;
}

export interface CancelarTurnoModalProps {
  turno: Turno;
  profesionales: Profesional[];
  ahora: Date;
  /** Se llama siempre al terminar (éxito o error) para que la pantalla informe y recargue. */
  onResultado: (resultado: ResultadoCancelacion) => void;
  onCerrar: () => void;
}

/**
 * Modal de cancelación del socio (Inicio y Mis turnos): pide el motivo, cancela por la API y avisa
 * el resultado a la pantalla. El estado final (en término / fuera de término) lo decide el servidor.
 */
export function CancelarTurnoModal({
  turno,
  profesionales,
  ahora,
  onResultado,
  onCerrar,
}: CancelarTurnoModalProps) {
  const [cancelando, setCancelando] = useState(false);

  async function confirmar(motivo: string) {
    setCancelando(true);
    try {
      await cancelarTurno(turno.id, motivo);
      onResultado({ ok: true, texto: "Turno cancelado." });
    } catch (err) {
      onResultado({ ok: false, texto: mensajeDeError(err) });
    } finally {
      setCancelando(false);
      onCerrar();
    }
  }

  return (
    <Modal titulo="Cancelar turno" onClose={onCerrar}>
      <CancelarTurnoDialog
        turno={turno}
        profesionales={profesionales}
        ahora={ahora}
        cargando={cancelando}
        onConfirmar={(motivo) => void confirmar(motivo)}
        onVolver={onCerrar}
      />
    </Modal>
  );
}
