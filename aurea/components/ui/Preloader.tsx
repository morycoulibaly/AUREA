'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useProgress } from '@react-three/drei';

interface PreloaderProps {
  /** Appelé au moment où l'overlay commence à se retirer. */
  onDone: () => void;
}

const SAFETY_DELAY = 500; // ms entre 100 % et la sortie, évite tout flash
const MAX_WAIT = 14000; // ms : filet de sécurité si un chargement reste bloqué

export default function Preloader({ onDone }: PreloaderProps) {
  const { progress } = useProgress();
  const [gone, setGone] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: 0 });
  const leaving = useRef(false);
  const leaveCtx = useRef<gsap.Context | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Barre de progression (suit le chargement réel des .glb)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(bar.current, { scaleX: progress / 100, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(shown.current, {
        v: progress,
        duration: 0.7,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: () => {
          if (percent.current) percent.current.textContent = `${Math.round(shown.current.v)}`;
        },
      });
    }, root);
    return () => ctx.kill();
  }, [progress]);

  // Sortie : opacité + léger dézoom
  useEffect(() => {
    const leave = () => {
      if (leaving.current) return;
      leaving.current = true;
      leaveCtx.current = gsap.context(() => {
        const tl = gsap.timeline({ onComplete: () => setGone(true) });
        tl.to(bar.current, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, 0)
          .to(content.current, { scale: 0.92, y: -8, autoAlpha: 0, duration: 0.8, ease: 'power3.inOut' }, 0.15)
          .add(() => doneRef.current(), 0.3)
          .to(root.current, { autoAlpha: 0, scale: 0.97, duration: 0.9, ease: 'power3.inOut' }, 0.35);
      }, root);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (progress >= 100) timer = setTimeout(leave, SAFETY_DELAY);
    const fallback = setTimeout(leave, MAX_WAIT);

    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, [progress]);

  useEffect(() => () => leaveCtx.current?.revert(), []);

  if (gone) return null;

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      aria-label="Chargement de la collection"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E0D12]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[46vmax] w-[46vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6C288]/[0.07] blur-[140px]"
      />
      <div ref={content} className="relative flex w-[min(78vw,320px)] flex-col items-center gap-9">
        <span className="bg-[linear-gradient(180deg,#FFFFFF,#E6C288)] bg-clip-text text-[clamp(2rem,7vw,2.75rem)] font-semibold tracking-[0.42em] text-transparent">
          AUREA
        </span>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          <div
            ref={bar}
            className="h-full w-full origin-left rounded-full bg-[#E6C288]"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#A19FA8]">
          Ouverture de l&apos;atelier · <span ref={percent}>0</span>%
        </p>
      </div>
    </div>
  );
}
