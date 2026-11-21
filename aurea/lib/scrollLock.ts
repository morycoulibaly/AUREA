import type Lenis from 'lenis';

/**
 * Verrou de défilement avec compteur : Lenis est arrêté tant qu'au moins
 * un panneau (fiche, écrin) ou l'écran de chargement est actif.
 */
let locks = 0;

export function lockScroll(lenis: Lenis | null): void {
  locks += 1;
  if (locks === 1) lenis?.stop();
}

export function unlockScroll(lenis: Lenis | null): void {
  locks = Math.max(0, locks - 1);
  if (locks === 0) lenis?.start();
}
