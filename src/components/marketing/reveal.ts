import type { CSSProperties } from "react";

/**
 * Apparition au scroll : poser `data-reveal` + la classe `RV` sur un élément.
 * `RevealObserver` ajoute `data-in` quand l'élément entre dans l'écran.
 */
export const RV =
  "opacity-0 translate-y-4 transition-[opacity,transform] duration-500 ease-out-expo [transition-delay:calc(min(var(--d,0),5)*70ms)] data-in:opacity-100 data-in:translate-y-0 motion-reduce:opacity-100 motion-reduce:translate-y-0";

/** Délai en cascade (multiples de 90 ms). */
export function d(i: number): CSSProperties {
  return { "--d": i } as CSSProperties;
}
