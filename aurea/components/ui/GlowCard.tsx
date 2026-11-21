'use client';

import type { PointerEvent, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  /** Rayon des coins, ex. `rounded-[36px]` */
  radius: string;
  className?: string;
  /** Libellé affiché par le curseur pilule */
  cursor?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * Carte en verre dépoli : halo qui suit le curseur (variables CSS
 * --mouse-x / --mouse-y) et micro-élévation au survol.
 */
export default function GlowCard({
  children,
  radius,
  className = '',
  cursor = 'Explorer',
  onClick,
  ariaLabel,
}: GlowCardProps) {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const classes =
    `group relative isolate overflow-hidden border border-white/10 bg-white/[0.04] text-left backdrop-blur-2xl ` +
    `transition-[transform,border-color,box-shadow] duration-500 ease-silk will-change-transform ` +
    `hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_34px_90px_-34px_rgba(230,194,136,0.38)] ` +
    `${radius} ${className}`;

  const glow = (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${radius}`}
        style={{
          background:
            'radial-gradient(380px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(230,194,136,0.17), rgba(229,152,155,0.06) 45%, transparent 70%)',
        }}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 ${radius}`}
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.07), transparent 38%)' }}
      />
      {children}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onPointerMove={onMove}
        data-cursor={cursor}
        aria-label={ariaLabel}
        className={`${classes} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6C288]`}
      >
        {glow}
      </button>
    );
  }

  return (
    <div onPointerMove={onMove} data-cursor={cursor} className={classes}>
      {glow}
    </div>
  );
}
