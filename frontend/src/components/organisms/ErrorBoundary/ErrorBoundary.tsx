import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "../../atoms/Button";
import { Aviso } from "../../molecules/Aviso";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Qué hace "Volver al inicio". Sin esto se recarga la app desde `/`. */
  onVolverAlInicio?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Organismo: red de seguridad ante errores de render. Sin él, una excepción al dibujar una pantalla
 * desmonta todo el árbol de React y deja la página en blanco. Muestra un aviso con "Reintentar"
 * (vuelve a dibujar los hijos) y "Volver al inicio". Pensado para envolver el `<Outlet/>` del shell
 * (la navegación sigue visible) y, como último recurso, la app entera.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error al dibujar la pantalla", error, info.componentStack);
  }

  private reintentar = () => this.setState({ error: null });

  private volverAlInicio = () => {
    if (this.props.onVolverAlInicio) {
      this.setState({ error: null });
      this.props.onVolverAlInicio();
    } else {
      window.location.assign("/");
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
        <Aviso tono="bad" titulo="Algo salió mal al mostrar esta pantalla">
          Podés reintentar o volver al inicio. Si el problema sigue, avisá a Recepción.
        </Aviso>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={this.reintentar}>
            Reintentar
          </Button>
          <Button variant="outline" onClick={this.volverAlInicio}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }
}
