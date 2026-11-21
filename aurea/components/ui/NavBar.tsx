'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { BagIcon } from './icons';

interface NavBarProps {
  count: number;
  /** Atténue la barre (fiche produit ouverte : toute la page s'efface devant la 3D) */
  dimmed?: boolean;
  onOpenBag: () => void;
  onNavigate: (id: string) => void;
}

const LINKS = [
  { id: 'savoir-faire', label: 'Savoir-faire' },
  { id: 'details', label: 'Détails' },
  { id: 'collection', label: 'Collection' },
];

export default function NavBar({ count, dimmed = false, onOpenBag, onNavigate }: NavBarProps) {
  const badge = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  // Petit rebond du compteur à chaque changement
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(badge.current, { scale: 1.7 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    });
    return () => ctx.revert();
  }, [count]);

  return (
    <div
      data-intro="nav"
      className="pointer-events-none invisible fixed inset-x-0 top-3 z-50 flex justify-center px-3 opacity-0 sm:top-4"
    >
      <nav
        aria-label="Navigation principale"
        className={`flex w-full max-w-[44rem] items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.04] py-2 pl-6 pr-2 backdrop-blur-2xl transition-opacity duration-500 ${
          dimmed ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
        }`}
      >
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('hero');
          }}
          className="bg-[linear-gradient(180deg,#FFFFFF,#E6C288)] bg-clip-text text-[15px] font-semibold tracking-[0.36em] text-transparent"
        >
          AUREA
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(l.id);
                }}
                className="rounded-full px-4 py-2 text-[13px] text-[#A19FA8] transition-colors hover:bg-white/[0.07] hover:text-[#F5F4F7]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onOpenBag}
          aria-label={`Ouvrir l'écrin${count > 0 ? `, ${count} pièce${count > 1 ? 's' : ''}` : ''}`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[#F5F4F7] transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E6C288]"
        >
          <BagIcon />
          <span
            className={`absolute -right-1 -top-1 transition-[opacity,transform] duration-500 ease-silk ${
              count > 0 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          >
            <span
              ref={badge}
              className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#E6C288] px-1 text-[11px] font-semibold leading-none text-[#0E0D12]"
            >
              {count}
            </span>
          </span>
        </button>
      </nav>
    </div>
  );
}
