'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import type Lenis from 'lenis';
import { ALLOYS, PIECE_INFO, formatPrice, type BagLine } from '@/lib/catalog';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { BagIcon, CheckIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from './icons';

interface BagDrawerProps {
  open: boolean;
  onClose: () => void;
  items: BagLine[];
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;
  /** Vide la sélection (appelé après l'affichage de la confirmation) */
  onCheckout: () => void;
  onBrowse: () => void;
  lenisRef: RefObject<Lenis | null>;
}

const roundBtn =
  'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[#F5F4F7] transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E6C288]';

export default function BagDrawer({
  open,
  onClose,
  items,
  onInc,
  onDec,
  onRemove,
  onCheckout,
  onBrowse,
  lenisRef,
}: BagDrawerProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState({ count: 0, total: 0 });

  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const tick = useRef<SVGPathElement>(null);
  const confirmBox = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);
  const firstRun = useRef(true);

  const count = items.reduce((n, l) => n + l.qty, 0);
  const subtotal = items.reduce((n, l) => n + l.qty * l.unitPrice, 0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(panel.current, { xPercent: 112, autoAlpha: 0 });
      gsap.set(backdrop.current, { autoAlpha: 0 });
    });
    ctxRef.current = ctx;
    return () => {
      ctx.revert();
      ctxRef.current = null;
    };
  }, []);

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
        gsap.to(backdrop.current, { autoAlpha: 1, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(panel.current, { xPercent: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', overwrite: 'auto' });
      });
      const focusTimer = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 450);
      return () => {
        clearTimeout(focusTimer);
        unlockScroll(lenis);
        ctxRef.current?.add(() => {
          gsap.to(backdrop.current, { autoAlpha: 0, duration: 0.45, ease: 'power2.in', overwrite: 'auto' });
          gsap.to(panel.current, { xPercent: 112, autoAlpha: 0, duration: 0.6, ease: 'power3.in', overwrite: 'auto' });
        });
        // L'écran de confirmation est réinitialisé une fois le panneau refermé
        setTimeout(() => setConfirmed(false), 700);
      };
    }
  }, [open, lenisRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Animation de la confirmation + vidage de la sélection
  useEffect(() => {
    if (!confirmed) return;
    const ctx = gsap.context(() => {
      const circle = ring.current;
      const path = tick.current;
      if (circle && path) {
        const c = circle.getTotalLength();
        const p = path.getTotalLength();
        gsap.set(circle, { strokeDasharray: c, strokeDashoffset: c });
        gsap.set(path, { strokeDasharray: p, strokeDashoffset: p });
        gsap
          .timeline()
          .to(circle, { strokeDashoffset: 0, duration: 0.9, ease: 'power3.inOut' })
          .to(path, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, '-=0.25');
      }
      gsap.fromTo(
        confirmBox.current,
        { autoAlpha: 0, y: 24, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out' },
      );
    }, confirmBox);
    const timer = setTimeout(onCheckout, 2200);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [confirmed, onCheckout]);

  const finalize = () => {
    if (items.length === 0) return;
    setReceipt({ count, total: subtotal });
    setConfirmed(true);
  };

  return (
    <>
      <div
        ref={backdrop}
        onClick={onClose}
        aria-hidden="true"
        className="invisible fixed inset-0 z-[60] bg-black/45 backdrop-blur-[3px]"
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Votre écrin"
        inert={!open}
        data-lenis-prevent
        className="invisible fixed bottom-3 right-3 top-3 z-[70] flex w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#14131A]/90 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#E5989B]/[0.09] blur-[90px]"
        />

        <header className="relative flex items-center justify-between gap-4 px-7 pb-4 pt-7">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#A19FA8]">Votre sélection</p>
            <h2 className="mt-2 text-[clamp(1.7rem,5vw,2.2rem)] font-semibold leading-none tracking-tight">
              Écrin{count > 0 ? ` · ${count}` : ''}
            </h2>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Fermer l'écrin"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E6C288]"
          >
            <CloseIcon />
          </button>
        </header>

        {confirmed ? (
          <div ref={confirmBox} className="relative flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
              <circle
                ref={ring}
                cx="48"
                cy="48"
                r="40"
                stroke="#E6C288"
                strokeWidth="2"
                strokeLinecap="round"
                transform="rotate(-90 48 48)"
              />
              <path
                ref={tick}
                d="m31 49 11 11 23-25"
                stroke="#E6C288"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="text-2xl font-semibold tracking-tight">Votre sélection est réservée</h3>
            <p className="max-w-[18rem] text-[14px] leading-relaxed text-[#A19FA8]">
              {receipt.count} pièce{receipt.count > 1 ? 's' : ''} · {formatPrice(receipt.total)}. Un conseiller
              AUREA vous contactera pour finaliser la livraison.
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A19FA8]/70">
              Démonstration : aucun paiement n&apos;est effectué
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-[14px] font-medium transition-colors hover:bg-white/15"
            >
              Retour à la collection
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#A19FA8]">
              <BagIcon width={26} height={26} />
            </span>
            <h3 className="text-xl font-semibold tracking-tight">Votre écrin est vide</h3>
            <p className="max-w-[16rem] text-[14px] leading-relaxed text-[#A19FA8]">
              Configurez une montre, une bague ou une chaîne, puis ajoutez-la à votre sélection.
            </p>
            <button
              type="button"
              onClick={onBrowse}
              className="mt-1 rounded-full bg-[#F5F4F7] px-6 py-3 text-[14px] font-semibold text-[#0E0D12] transition-transform hover:scale-[1.03]"
            >
              Explorer la collection
            </button>
          </div>
        ) : (
          <>
            <ul className="aurea-scroll relative flex-1 space-y-3 overflow-y-auto px-7 pb-4 pt-2" data-lenis-prevent>
              {items.map((line) => (
                <li
                  key={line.key}
                  className="aurea-rise rounded-[28px] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 h-11 w-11 shrink-0 rounded-full ring-1 ring-white/25"
                      style={{ background: ALLOYS[line.alloy].swatch }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold leading-tight">{PIECE_INFO[line.piece].label}</p>
                      <p className="mt-1 text-[13px] text-[#A19FA8]">
                        {ALLOYS[line.alloy].label} · {line.size}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold tabular-nums">{formatPrice(line.unitPrice * line.qty)}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onDec(line.key)}
                        disabled={line.qty <= 1}
                        aria-label="Retirer une unité"
                        className={`${roundBtn} disabled:opacity-35`}
                      >
                        <MinusIcon width={15} height={15} />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-[15px] font-medium tabular-nums" aria-live="polite">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onInc(line.key)}
                        aria-label="Ajouter une unité"
                        className={roundBtn}
                      >
                        <PlusIcon width={15} height={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      aria-label={`Supprimer ${PIECE_INFO[line.piece].label}`}
                      className={`${roundBtn} text-[#E5989B] hover:text-[#E5989B]`}
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="relative space-y-4 border-t border-white/10 bg-[#14131A]/60 px-7 pb-7 pt-5">
              <div className="flex items-end justify-between">
                <span className="text-[12px] uppercase tracking-[0.22em] text-[#A19FA8]">Sous-total</span>
                <span className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={finalize}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(135deg,#F3DDB4,#E6C288_55%,#D9A96A)] px-6 py-4 text-[15px] font-semibold text-[#0E0D12] transition-[filter,transform] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288]"
              >
                <CheckIcon />
                Finaliser la commande
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
