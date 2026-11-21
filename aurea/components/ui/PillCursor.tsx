'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * Badge flottant qui suit la souris (desktop uniquement) et affiche un libellé
 * court au survol des zones portant un attribut `data-cursor`.
 * Totalement désactivé sur les écrans tactiles.
 */
export default function PillCursor() {
  const [enabled, setEnabled] = useState(false);
  const pill = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = pill.current;
    if (!enabled || !el) return;

    let current = '';
    const ctx = gsap.context(() => {
      gsap.set(el, { autoAlpha: 0, scale: 0.6 });
    }, el);

    const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });

    const show = (text: string) => {
      if (label.current) label.current.textContent = text;
      gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
    };
    const hide = () => {
      gsap.to(el, { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      qx(e.clientX + 18);
      qy(e.clientY + 20);
      const zone = (e.target as Element | null)?.closest?.('[data-cursor]');
      const next = zone?.getAttribute('data-cursor') ?? '';
      if (next === current) return;
      current = next;
      if (next) show(next);
      else hide();
    };
    const onLeave = () => {
      current = '';
      hide();
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      ctx.revert();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={pill}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-[#F5F4F7] backdrop-blur-md md:flex"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#E6C288]" />
      <span ref={label} />
    </div>
  );
}
