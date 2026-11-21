/**
 * Signaux partagés entre la page (ScrollTrigger / panneaux) et la scène 3D.
 * Objet mutable volontairement hors de React : on écrit dedans à chaque
 * frame de scroll sans provoquer de re-render.
 */
export const studioSignals = {
  /** Rotation pilotée par le scroll (radians) — Séquence 2 */
  spin: 0,
  /** 0 → 1 pendant que le hero quitte l'écran (décale la pièce sur le côté) */
  heroOut: 0,
  /** 0 → 1 : intensité du zoom macro — Séquence 3 */
  macro: 0,
  /** 0 → 1 : la pièce s'efface pendant la collection et le footer */
  outro: 0,
  /** 0 → 1 : léger déplacement vertical pendant la Séquence 2 */
  lift: 0,
};
