'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import type Lenis from 'lenis';
import {
  ALLOYS,
  ALLOY_ORDER,
  PIECE_INFO,
  PIECE_ORDER,
  formatPrice,
  unitPrice,
  type AlloyId,
  type PieceId,
} from '@/lib/catalog';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { BagIcon, CheckIcon, CloseIcon, EyeIcon, SlidersIcon } from './icons';

interface ProductSheetProps {
  open: boolean;
  onClose: () => void;
  piece: PieceId;
  alloy: AlloyId;
  size: string;
  onPiece: (p: PieceId) => void;
  onAlloy: (a: AlloyId) => void;
  onSize: (s: string) => void;
  onAdd: () => void;
  bagCount: number;
  onOpenBag: () => void;
  lenisRef: RefObject<Lenis | null>;
}

const pillBase =
  'rounded-full border px-4 py-2.5 text-[13px] font-medium transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288]';

export default function ProductSheet({
  open,
  onClose,
  piece,
  alloy,
  size,
  onPiece,
  onAlloy,
  onSize,
  onAdd,
  bagCount,
  onOpenBag,
  lenisRef,
}: ProductSheetProps) {
  const info = PIECE_INFO[piece];
  const price = unitPrice(piece, alloy, size);
  const [added, setAdded] = useState(false);
  // Mobile uniquement : masque la fiche pour manipuler le bijou en plein écran
  const [isPreviewingModel, setIsPreviewingModel] = useState(false);

  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const priceEl = useRef<HTMLSpanElement>(null);
  const priceState = useRef({ v: price });
  const priceReady = useRef(false);
  const addBtn = useRef<HTMLButtonElement>(null);
  const check = useRef<HTMLSpanElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);
  const firstRun = useRef(true);

  // Contexte GSAP unique : état fermé au montage, nettoyage propre au démontage
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(panel.current, { xPercent: 112, autoAlpha: 0 });
    });
    ctxRef.current = ctx;
    return () => {
      ctx.revert();
      ctxRef.current = null;
    };
  }, []);

  // Ouverture / fermeture + pause de Lenis
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (firstRun.current) {
      firstRun.current = false;
      if (!open) return;
    }

    if (open) {
      const lenis = lenisRef.current;
      lockScroll(lenis);
      ctx.add(() => {
        gsap.to(panel.current, { xPercent: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', overwrite: 'auto' });
        gsap.fromTo(
          '[data-sheet-item]',
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, delay: 0.18, overwrite: 'auto' },
        );
      });
      const focusTimer = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 450);
      return () => {
        clearTimeout(focusTimer);
        unlockScroll(lenis);
        ctxRef.current?.add(() => {
          gsap.to(panel.current, { xPercent: 112, autoAlpha: 0, duration: 0.6, ease: 'power3.in', overwrite: 'auto' });
        });
      };
    }
  }, [open, lenisRef]);

  // Chaque ouverture repart sur la fiche (pas sur l'aperçu 3D)
  useEffect(() => {
    if (open) setIsPreviewingModel(false);
  }, [open]);

  // Échap pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Prix animé
  useEffect(() => {
    const el = priceEl.current;
    if (!el) return;
    if (!priceReady.current) {
      priceReady.current = true;
      priceState.current.v = price;
      el.textContent = formatPrice(price);
      return;
    }
    const ctx = gsap.context(() => {
      gsap.to(priceState.current, {
        v: price,
        duration: 0.7,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: () => {
          el.textContent = formatPrice(Math.round(priceState.current.v));
        },
      });
    });
    return () => ctx.kill();
  }, [price]);

  // Confirmation visuelle de l'ajout
  useEffect(() => {
    if (!added) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(addBtn.current, { scale: 0.95 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
      gsap.fromTo(
        check.current,
        { scale: 0, rotate: -90 },
        { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.6)' },
      );
    });
    const timer = setTimeout(() => setAdded(false), 2200);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [added]);

  // Une modification de la configuration annule la confirmation précédente
  useEffect(() => {
    setAdded(false);
  }, [piece, alloy, size]);

  const handleAdd = () => {
    onAdd();
    setAdded(true);
  };

  return (
    <>
      <aside
        ref={panel}
        role="dialog"
        aria-label="Configurer votre pièce"
        inert={!open}
        data-lenis-prevent
        className="pointer-events-none invisible fixed bottom-3 right-3 top-[4.75rem] z-40 w-[min(30rem,calc(100vw-1.5rem))] md:top-3"
      >
        <div
          className={`pointer-events-auto relative flex h-full w-full flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#14131A]/90 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-[transform,opacity] duration-700 ease-silk ${
            isPreviewingModel ? 'max-md:pointer-events-none max-md:translate-y-full max-md:opacity-0' : ''
          }`}
        >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#E6C288]/[0.09] blur-[90px]"
        />

        <header className="relative flex items-start justify-between gap-4 px-7 pb-4 pt-7" data-sheet-item>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#A19FA8]">
              Configurer · {info.reference}
            </p>
            <h2 className="mt-2 text-[clamp(1.9rem,5vw,2.5rem)] font-semibold leading-none tracking-tight">
              {info.label}
            </h2>
            <p className="mt-2 text-[14px] text-[#A19FA8]">
              {ALLOYS[alloy].label} · {size}
            </p>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[#F5F4F7] transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E6C288]"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="aurea-scroll relative flex-1 space-y-7 overflow-y-auto px-7 pb-6 pt-2" data-lenis-prevent>
          <p className="text-[14.5px] leading-relaxed text-[#A19FA8]" data-sheet-item>
            {info.description}
          </p>

          <section data-sheet-item>
            <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.22em] text-[#A19FA8]">Pièce</h3>
            <div role="radiogroup" aria-label="Pièce" className="grid grid-cols-3 gap-2">
              {PIECE_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={piece === id}
                  onClick={() => onPiece(id)}
                  className={`${pillBase} ${
                    piece === id
                      ? 'border-transparent bg-[#F5F4F7] text-[#0E0D12]'
                      : 'border-white/10 bg-white/[0.04] text-[#F5F4F7] hover:bg-white/10'
                  }`}
                >
                  {PIECE_INFO[id].label}
                </button>
              ))}
            </div>
          </section>

          <section data-sheet-item>
            <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.22em] text-[#A19FA8]">Alliage</h3>
            <div role="radiogroup" aria-label="Alliage" className="grid grid-cols-2 gap-2">
              {ALLOY_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={alloy === id}
                  onClick={() => onAlloy(id)}
                  className={`${pillBase} flex items-center gap-3 ${
                    alloy === id
                      ? 'border-[#E6C288]/70 bg-white/10 text-[#F5F4F7]'
                      : 'border-white/10 bg-white/[0.04] text-[#F5F4F7] hover:bg-white/10'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/25"
                    style={{ background: ALLOYS[id].swatch }}
                  />
                  {ALLOYS[id].label}
                </button>
              ))}
            </div>
          </section>

          <section data-sheet-item>
            <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.22em] text-[#A19FA8]">
              {info.sizeTitle}
            </h3>
            <div role="radiogroup" aria-label={info.sizeTitle} className="flex flex-wrap gap-2">
              {info.sizes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={size === s.value}
                  onClick={() => onSize(s.value)}
                  className={`${pillBase} min-w-[4.25rem] ${
                    size === s.value
                      ? 'border-transparent bg-[#F5F4F7] text-[#0E0D12]'
                      : 'border-white/10 bg-white/[0.04] text-[#F5F4F7] hover:bg-white/10'
                  }`}
                >
                  {s.label}
                  {s.delta > 0 && (
                    <span className="ml-1.5 text-[11px] opacity-60">+{formatPrice(s.delta)}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="relative space-y-4 border-t border-white/10 bg-[#14131A]/60 px-7 pb-7 pt-5" data-sheet-item>
          <div className="flex items-end justify-between">
            <span className="text-[12px] uppercase tracking-[0.22em] text-[#A19FA8]">Prix</span>
            <span ref={priceEl} className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums" />
          </div>

          <button
            ref={addBtn}
            type="button"
            onClick={handleAdd}
            className={`flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-4 text-[15px] font-semibold transition-colors duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288] ${
              added
                ? 'bg-[#F5F4F7] text-[#0E0D12]'
                : 'bg-[linear-gradient(135deg,#F3DDB4,#E6C288_55%,#D9A96A)] text-[#0E0D12] hover:brightness-105'
            }`}
          >
            {added ? (
              <>
                <span ref={check} className="inline-flex">
                  <CheckIcon />
                </span>
                Ajouté à votre écrin
              </>
            ) : (
              'Ajouter à la sélection'
            )}
          </button>

          <button
            type="button"
            onClick={onOpenBag}
            className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-[13px] text-[#A19FA8] transition-colors hover:text-[#F5F4F7]"
          >
            <BagIcon width={16} height={16} />
            {bagCount > 0
              ? `Voir mon écrin (${bagCount} pièce${bagCount > 1 ? 's' : ''})`
              : 'Voir mon écrin'}
          </button>
        </footer>
        </div>
      </aside>

      {/* Mobile : bascule entre la fiche et l'aperçu 3D plein écran */}
      <div
        inert={!open}
        className={`pointer-events-none fixed inset-x-0 top-4 z-[45] flex justify-center transition-opacity duration-500 md:hidden ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsPreviewingModel((v) => !v)}
          aria-pressed={isPreviewingModel}
          className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/20 bg-white/15 px-5 py-3 text-[13px] font-medium text-[#F5F4F7] backdrop-blur-xl transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288]"
        >
          {isPreviewingModel ? (
            <>
              <SlidersIcon width={17} height={17} />
              Retour aux infos
            </>
          ) : (
            <>
              <EyeIcon width={17} height={17} />
              Voir le modèle 3D
            </>
          )}
        </button>
      </div>
    </>
  );
}
