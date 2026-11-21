'use client';

import {
  ALLOYS,
  ALLOY_ORDER,
  PIECE_INFO,
  PIECE_ORDER,
  type AlloyId,
  type PieceId,
} from '@/lib/catalog';
import { SlidersIcon } from './icons';

interface DockProps {
  piece: PieceId;
  alloy: AlloyId;
  hidden: boolean;
  onPiece: (p: PieceId) => void;
  onAlloy: (a: AlloyId) => void;
  onConfigure: () => void;
}

/** Dock tactile flottant : pièce, alliage, accès à la fiche produit. */
export default function Dock({ piece, alloy, hidden, onPiece, onAlloy, onConfigure }: DockProps) {
  const index = PIECE_ORDER.indexOf(piece);

  return (
    <div
      data-intro="dock"
      className="pointer-events-none invisible fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] opacity-0 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div
        role="toolbar"
        aria-label="Studio : pièce et alliage"
        className={`flex max-w-[94vw] flex-col items-stretch gap-2 rounded-[32px] border border-white/10 bg-[#14131A]/70 p-2 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-[opacity,transform] duration-500 ease-silk sm:flex-row sm:items-center sm:gap-3 sm:rounded-full ${
          hidden ? 'pointer-events-none translate-y-6 opacity-0' : 'pointer-events-auto translate-y-0 opacity-100'
        }`}
      >
        {/* Pièce */}
        <div role="radiogroup" aria-label="Pièce" className="relative grid grid-cols-3 rounded-full bg-white/[0.05] p-1">
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-[#F5F4F7] transition-transform duration-500 ease-silk"
            style={{ transform: `translateX(${index * 100}%)` }}
          />
          {PIECE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={piece === id}
              onClick={() => onPiece(id)}
              className={`relative z-10 rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors duration-300 sm:px-5 ${
                piece === id ? 'text-[#0E0D12]' : 'text-[#F5F4F7]/80 hover:text-[#F5F4F7]'
              }`}
            >
              {PIECE_INFO[id].label}
            </button>
          ))}
        </div>

        <span aria-hidden="true" className="hidden h-7 w-px bg-white/10 sm:block" />

        <div className="flex items-center justify-between gap-3 sm:justify-start">
          {/* Alliage */}
          <div role="radiogroup" aria-label="Alliage" className="flex items-center gap-2 pl-2">
            {ALLOY_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={alloy === id}
                aria-label={ALLOYS[id].label}
                title={ALLOYS[id].label}
                onClick={() => onAlloy(id)}
                className={`h-8 w-8 rounded-full ring-1 ring-white/25 transition-transform duration-300 ease-silk hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288] ${
                  alloy === id ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#14131A]' : ''
                }`}
                style={{ background: ALLOYS[id].swatch }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onConfigure}
            data-cursor="Configurer"
            className="flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#F3DDB4,#E6C288_55%,#D9A96A)] px-4 py-2.5 text-[13px] font-semibold text-[#0E0D12] transition-[filter,transform] duration-300 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288] sm:px-5"
          >
            <SlidersIcon width={16} height={16} />
            Configurer
          </button>
        </div>
      </div>
    </div>
  );
}
