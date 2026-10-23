import { useSyncExternalStore } from "react";

/**
 * `true` mientras `query` (media query CSS) se cumple. Sin `matchMedia` (jsdom, SSR) devuelve
 * `false`: el shell lo usa con `(max-width: 759px)`, así que sin soporte se ve la versión desktop.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const lista = window.matchMedia(query);
      lista.addEventListener("change", avisar);
      return () => lista.removeEventListener("change", avisar);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}
