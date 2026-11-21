'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import BagDrawer from '@/components/ui/BagDrawer';
import Dock from '@/components/ui/Dock';
import GlowCard from '@/components/ui/GlowCard';
import { ArrowRightIcon, ArrowUpIcon, PieceGlyph } from '@/components/ui/icons';
import NavBar from '@/components/ui/NavBar';
import PillCursor from '@/components/ui/PillCursor';
import Preloader from '@/components/ui/Preloader';
import ProductSheet from '@/components/ui/ProductSheet';
import {
  ALLOYS,
  ALLOY_ORDER,
  PIECE_INFO,
  PIECE_ORDER,
  formatPrice,
  lineKey,
  unitPrice,
  type AlloyId,
  type BagLine,
  type PieceId,
} from '@/lib/catalog';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { studioSignals } from '@/lib/studioSignals';

// Le Canvas WebGL ne se rend jamais côté serveur (pas d'erreur d'hydratation).
const JewelryStudio = dynamic(() => import('@/components/three/JewelryStudio'), { ssr: false });

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

type Panel = 'none' | 'sheet' | 'bag';

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const gradientTitle =
  'bg-[linear-gradient(180deg,#FFFFFF_0%,#F6E9D2_42%,#E6C288_72%,#E5989B_118%)] bg-clip-text text-transparent';

export default function Page() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const [ready, setReady] = useState(false);
  const [piece, setPiece] = useState<PieceId>('watch');
  const [alloy, setAlloy] = useState<AlloyId>('champagne');
  const [sizes, setSizes] = useState<Record<PieceId, string>>({
    watch: PIECE_INFO.watch.sizes[0].value,
    ring: PIECE_INFO.ring.sizes[0].value,
    chain: PIECE_INFO.chain.sizes[0].value,
  });
  const [panel, setPanel] = useState<Panel>('none');
  const [bag, setBag] = useState<BagLine[]>([]);

  const size = sizes[piece];
  const info = PIECE_INFO[piece];
  const bagCount = bag.reduce((n, l) => n + l.qty, 0);

  // Fiche ouverte : le texte de la page s'efface pour laisser la 3D nette au premier plan
  const isConfiguratorOpen = panel === 'sheet';
  const sectionFade = `transition-opacity duration-500 ${
    isConfiguratorOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
  }`;

  /* ------------------------------ Lenis + GSAP ----------------------------- */

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Défilement verrouillé pendant le préchargement
  useEffect(() => {
    if (ready) return;
    const lenis = lenisRef.current;
    lockScroll(lenis);
    return () => unlockScroll(lenis);
  }, [ready]);

  /* ----------------------- Chorégraphie au scroll (GSAP) ------------------- */

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const section = (id: string) => root.querySelector<HTMLElement>(`#${id}`);

    const ctx = gsap.context(() => {
      const hero = section('hero');
      const craft = section('savoir-faire');
      const details = section('details');
      const collection = section('collection');
      if (!hero || !craft || !details || !collection) return;

      const bind = (fn: (p: number) => void) => ({
        onUpdate: (self: ScrollTrigger) => fn(self.progress),
        onRefresh: (self: ScrollTrigger) => fn(self.progress),
      });

      // Signaux envoyés à la scène 3D
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        ...bind((p) => {
          studioSignals.heroOut = p;
        }),
      });
      // Séquence 2 : rotation continue à 360° et léger déplacement vertical, liés au scroll (scrub: 1)
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: craft, start: 'top 85%', end: 'bottom 25%', scrub: 1 },
        })
        .to(studioSignals, { spin: Math.PI * 2, lift: 1, duration: 1 });
      // Séquence 3 : la caméra se rapproche, reste au plus près, puis se retire (scrub: 1)
      gsap
        .timeline({
          scrollTrigger: { trigger: details, start: 'top 75%', end: 'bottom 25%', scrub: 1 },
        })
        .to(studioSignals, { macro: 1, duration: 0.3, ease: 'power2.inOut' })
        .to(studioSignals, { macro: 1, duration: 0.4, ease: 'none' })
        .to(studioSignals, { macro: 0, duration: 0.3, ease: 'power2.inOut' });
      ScrollTrigger.create({
        trigger: collection,
        start: 'top 90%',
        end: 'top 40%',
        ...bind((p) => {
          studioSignals.outro = p;
        }),
      });

      // Séquence 3 : bulles d'information, pilotées par le scroll
      const bubbles = gsap.utils.toArray<HTMLElement>('[data-bubble]', details);
      const bubbleTitle = details.querySelector<HTMLElement>('[data-details-title]');
      gsap.set(bubbles, { autoAlpha: 0, y: 26, scale: 0.92 });
      gsap.set(bubbleTitle, { autoAlpha: 0, y: 20 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: details, start: 'top 75%', end: 'bottom 25%', scrub: 1 },
      });
      tl.to(bubbleTitle, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.28);
      bubbles.forEach((b, i) => {
        tl.to(b, { autoAlpha: 1, y: 0, scale: 1, duration: 0.08, ease: 'power2.out' }, 0.36 + i * 0.07);
      });
      tl.to(bubbleTitle, { autoAlpha: 0, y: -16, duration: 0.06, ease: 'power2.in' }, 0.7);
      bubbles.forEach((b, i) => {
        tl.to(b, { autoAlpha: 0, y: -18, scale: 0.96, duration: 0.06, ease: 'power2.in' }, 0.72 + i * 0.02);
      });
      tl.to({}, { duration: 0.0001 }, 1);

      // Flottement doux des bulles (sur l'enfant, pour ne pas entrer en conflit avec le scrub)
      gsap.utils.toArray<HTMLElement>('[data-bubble-float]', details).forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 ? -9 : 9,
          duration: 2.4 + i * 0.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });

      // Apparitions : cartes Bento et Collection en cascade, titres
      const all = gsap.utils.toArray<HTMLElement>('[data-reveal], [data-bento], [data-collection-card]');
      if (reduce) {
        gsap.set(all, { autoAlpha: 1, y: 0, scale: 1 });
      } else {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 44 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 1.1,
              ease: 'expo.out',
              scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
            },
          );
        });
        const grid = craft.querySelector<HTMLElement>('[data-bento-grid]');
        if (grid) {
          gsap.fromTo(
            '[data-bento]',
            { autoAlpha: 0, y: 70, scale: 0.96 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 1.2,
              ease: 'expo.out',
              stagger: 0.14,
              scrollTrigger: { trigger: grid, start: 'top 82%', toggleActions: 'play none none reverse' },
            },
          );
        }
        const cards = collection.querySelector<HTMLElement>('[data-collection-grid]');
        if (cards) {
          gsap.fromTo(
            '[data-collection-card]',
            { autoAlpha: 0, y: 80, scale: 0.96 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 1.2,
              ease: 'expo.out',
              stagger: 0.14,
              scrollTrigger: { trigger: cards, start: 'top 85%', toggleActions: 'play none none reverse' },
            },
          );
        }
      }

      // Halos d'ambiance : ils dérivent lentement pendant le scroll
      gsap.to('[data-halo="a"]', {
        xPercent: 38,
        yPercent: 70,
        scale: 1.25,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1.4 },
      });
      gsap.to('[data-halo="b"]', {
        xPercent: -42,
        yPercent: -75,
        scale: 1.3,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1.8 },
      });
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
      studioSignals.spin = 0;
      studioSignals.heroOut = 0;
      studioSignals.macro = 0;
      studioSignals.outro = 0;
      studioSignals.lift = 0;
    };
  }, []);

  // Entrée du hero une fois l'écran de chargement retiré
  useEffect(() => {
    if (!ready) return;
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo('[data-intro="nav"]', { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.1)
        .fromTo('[data-hero-line]', { autoAlpha: 0, y: 56 }, { autoAlpha: 1, y: 0, duration: 1.5, stagger: 0.14 }, 0.15)
        .fromTo('[data-hero-fade]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.6)
        .fromTo('[data-intro="dock"]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.8);
    }, root);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [ready]);

  /* -------------------------------- Actions -------------------------------- */

  const scrollToId = useCallback((id: string) => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (id === 'hero') {
      lenis.scrollTo(0, { duration: 1.8, easing: easeOutExpo });
      return;
    }
    lenis.scrollTo(`#${id}`, { offset: -20, duration: 1.8, easing: easeOutExpo });
  }, []);

  const closePanel = useCallback(() => setPanel('none'), []);
  const openSheet = useCallback(() => setPanel('sheet'), []);
  const openBag = useCallback(() => setPanel('bag'), []);
  const browseCollection = useCallback(() => {
    setPanel('none');
    // Lenis est relancé à la fermeture du panneau : on laisse un tick avant de défiler
    window.setTimeout(() => scrollToId('collection'), 120);
  }, [scrollToId]);

  /** Clic sur une carte de la collection : sélectionne, remonte vers la pièce, ouvre la fiche. */
  const pickFromCollection = useCallback(
    (id: PieceId) => {
      setPiece(id);
      const lenis = lenisRef.current;
      if (!lenis) {
        setPanel('sheet');
        return;
      }
      lenis.scrollTo(0, {
        duration: 1.8,
        easing: easeOutExpo,
        onComplete: () => setPanel('sheet'),
      });
    },
    [],
  );

  const setSize = useCallback(
    (value: string) => setSizes((prev) => ({ ...prev, [piece]: value })),
    [piece],
  );

  const addToBag = useCallback(() => {
    const key = lineKey(piece, alloy, size);
    setBag((prev) => {
      const hit = prev.find((l) => l.key === key);
      if (hit) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { key, piece, alloy, size, qty: 1, unitPrice: unitPrice(piece, alloy, size) }];
    });
  }, [piece, alloy, size]);

  const incLine = useCallback(
    (key: string) => setBag((prev) => prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))),
    [],
  );
  const decLine = useCallback(
    (key: string) =>
      setBag((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, l.qty - 1) } : l))),
    [],
  );
  const removeLine = useCallback((key: string) => setBag((prev) => prev.filter((l) => l.key !== key)), []);
  const clearBag = useCallback(() => setBag([]), []);

  const onPreloaderDone = useCallback(() => setReady(true), []);

  /* --------------------------------- Rendu --------------------------------- */

  return (
    <div ref={rootRef} className="relative overflow-x-clip bg-[#0E0D12]">
      <Preloader onDone={onPreloaderDone} />
      <PillCursor />

      {/* Halos d'ambiance */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          data-halo="a"
          className="absolute -left-[12vw] -top-[18vh] h-[62vmax] w-[62vmax] rounded-full bg-[#E6C288]/[0.15] blur-[140px]"
        />
        <div
          data-halo="b"
          className="absolute -bottom-[22vh] -right-[14vw] h-[58vmax] w-[58vmax] rounded-full bg-[#E5989B]/[0.12] blur-[140px]"
        />
      </div>

      {/* Studio 3D */}
      <JewelryStudio piece={piece} alloy={alloy} ready={ready} isConfiguratorOpen={isConfiguratorOpen} />

      <NavBar count={bagCount} dimmed={isConfiguratorOpen} onOpenBag={openBag} onNavigate={scrollToId} />

      <main className="relative">
        {/* ------------------- Séquence 1 : Hero & Lévitation ------------------ */}
        <section
          id="hero"
          data-cursor="Pivoter"
          className="relative flex min-h-[100svh] flex-col items-center justify-between px-6 pb-40 pt-28 text-center sm:pt-32"
        >
          <div className={`relative z-[1] flex flex-col items-center ${sectionFade}`}>
            <span
              data-hero-fade
              className="invisible mb-6 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.3em] text-[#A19FA8] opacity-0 backdrop-blur-2xl"
            >
              Collection Hiver 2026
            </span>
            <h1 className="text-[clamp(2.7rem,8.4vw,7.4rem)] font-semibold leading-[0.96] tracking-tight">
              <span data-hero-line className={`invisible block pb-[0.08em] opacity-0 ${gradientTitle}`}>
                La lumière
              </span>
              <span data-hero-line className={`invisible block pb-[0.08em] opacity-0 ${gradientTitle}`}>
                en apesanteur.
              </span>
            </h1>
          </div>

          <div className={`relative z-10 flex max-w-xl flex-col items-center gap-5 ${sectionFade}`}>
            <p
              data-hero-fade
              className="invisible text-[clamp(0.98rem,1.6vw,1.15rem)] leading-relaxed text-[#A19FA8] opacity-0"
            >
              Montres, bagues et chaînes dessinées comme des galets de lumière. Touchez, tournez, configurez.
            </p>
            <p
              data-hero-fade
              className="invisible rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[13px] text-[#F5F4F7] opacity-0 backdrop-blur-2xl"
            >
              <span className="font-semibold">{info.label}</span>
              <span className="mx-2 text-white/25">·</span>
              <span className="text-[#A19FA8]">{ALLOYS[alloy].label}</span>
            </p>
          </div>
        </section>

        {/* ------------------ Séquence 2 : L'Art des Courbes ------------------- */}
        <section id="savoir-faire" className={`relative z-10 px-5 py-28 md:py-44 ${sectionFade}`}>
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div data-reveal className="invisible opacity-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#E6C288]">Savoir-faire</p>
                <h2 className={`mt-4 text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.02] tracking-tight ${gradientTitle}`}>
                  L&apos;art des courbes.
                </h2>
                <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-[#A19FA8]">
                  Chaque pièce AUREA part d&apos;un galet : un volume doux, sans arête vive, que la lumière
                  traverse sans jamais accrocher.
                </p>
              </div>

              <div data-bento-grid className="mt-12 grid gap-4 sm:grid-cols-2">
                <div data-bento className="invisible opacity-0 sm:col-span-2">
                  <GlowCard radius="rounded-[36px]" cursor="Explorer" className="flex h-full min-h-[15rem] flex-col justify-between p-8 md:p-10">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#A19FA8]">01 — Courbes continues</p>
                      <h3 className="mt-4 max-w-md text-[clamp(1.5rem,3vw,2.2rem)] font-semibold leading-tight tracking-tight">
                        Aucun angle vif, du premier trait au dernier poli.
                      </h3>
                    </div>
                    <div className="mt-8 flex items-end justify-between gap-4">
                      <p className="max-w-[15rem] text-[14px] leading-relaxed text-[#A19FA8]">
                        Faites défiler : la pièce effectue un tour complet pour dévoiler chaque face.
                      </p>
                      <span className={`text-[clamp(3rem,8vw,5.5rem)] font-semibold leading-none tracking-tighter ${gradientTitle}`}>
                        360°
                      </span>
                    </div>
                  </GlowCard>
                </div>

                <div data-bento className="invisible opacity-0">
                  <GlowCard radius="rounded-[36px]" cursor="Explorer" className="flex h-full min-h-[15rem] flex-col justify-between p-8">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#A19FA8]">02 — Alliages vivants</p>
                      <h3 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-tight">
                        Quatre métaux, un seul geste.
                      </h3>
                    </div>
                    <div className="mt-6 flex items-center gap-2.5" role="radiogroup" aria-label="Alliage">
                      {ALLOY_ORDER.map((id) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={alloy === id}
                          aria-label={ALLOYS[id].label}
                          title={ALLOYS[id].label}
                          onClick={() => setAlloy(id)}
                          className={`h-10 w-10 rounded-full ring-1 ring-white/25 transition-transform duration-300 ease-silk hover:scale-110 ${
                            alloy === id ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#14131A]' : ''
                          }`}
                          style={{ background: ALLOYS[id].swatch }}
                        />
                      ))}
                    </div>
                  </GlowCard>
                </div>

                <div data-bento className="invisible opacity-0">
                  <GlowCard radius="rounded-[36px]" cursor="Explorer" className="flex h-full min-h-[15rem] flex-col justify-between p-8">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#A19FA8]">03 — Lumière de studio</p>
                      <h3 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-tight">
                        De longs reflets soyeux sur chaque courbe.
                      </h3>
                    </div>
                    <div aria-hidden="true" className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,transparent,#E6C288,#FFF8EE,transparent)]" />
                    </div>
                  </GlowCard>
                </div>

                <div data-bento className="invisible opacity-0 sm:col-span-2">
                  <GlowCard radius="rounded-[36px]" cursor="Explorer" className="flex h-full flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#A19FA8]">04 — Finitions miroir</p>
                      <h3 className="mt-4 max-w-md text-[1.35rem] font-semibold leading-tight tracking-tight">
                        Polies à la main, une à une, jusqu&apos;à disparaître dans le reflet.
                      </h3>
                    </div>
                    <div className="flex shrink-0 gap-2 text-[12px] text-[#A19FA8]">
                      {['Biseaux adoucis', 'Pierres serties', 'Maillons polis'].map((t) => (
                        <span key={t} className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2">
                          {t}
                        </span>
                      ))}
                    </div>
                  </GlowCard>
                </div>
              </div>
            </div>
            <div className="hidden lg:col-span-5 lg:block" aria-hidden="true" />
          </div>
        </section>

        {/* ------------------ Séquence 3 : Inspection Macro -------------------- */}
        <section id="details" className={`relative z-10 h-[260svh] ${sectionFade}`}>
          <div className="sticky top-0 h-[100svh] overflow-hidden">
            <div
              data-details-title
              className="absolute inset-x-0 top-[17%] px-6 text-center"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#E6C288]">Inspection macro</p>
              <h2 className="mt-3 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold tracking-tight">
                {info.label} : au plus près.
              </h2>
            </div>

            {info.details.map((d, i) => {
              const position = [
                'left-[5%] top-[30%] sm:left-[8%] sm:top-[34%]',
                'right-[5%] top-[52%] sm:right-[8%] sm:top-[42%]',
                'left-[7%] bottom-[22%] sm:left-[17%] sm:bottom-[20%]',
              ][i];
              return (
                <div key={d.title} data-bubble className={`absolute max-w-[78vw] ${position}`}>
                  <div
                    data-bubble-float
                    className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] py-3 pl-4 pr-6 backdrop-blur-2xl"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6C288]/20 text-[12px] font-semibold text-[#E6C288]">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold leading-tight">{d.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-[#A19FA8]">{d.text}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* -------------------- Séquence 4 : La Collection --------------------- */}
        <section id="collection" className={`relative z-10 px-5 pb-24 pt-32 md:pt-44 ${sectionFade}`}>
          <div className="mx-auto max-w-7xl">
            <div data-reveal className="invisible mx-auto max-w-2xl text-center opacity-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#E6C288]">La collection</p>
              <h2 className={`mt-4 text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.02] tracking-tight ${gradientTitle}`}>
                Trois pièces, une signature.
              </h2>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-[#A19FA8]">
                Choisissez une pièce : elle remonte aussitôt dans le studio, prête à être configurée.
              </p>
            </div>

            <div data-collection-grid className="mt-14 grid gap-5 md:grid-cols-3">
              {PIECE_ORDER.map((id, i) => {
                const p = PIECE_INFO[id];
                return (
                  <div key={id} data-collection-card className="invisible opacity-0">
                    <GlowCard
                      radius="rounded-[40px]"
                      cursor="Configurer"
                      onClick={() => pickFromCollection(id)}
                      ariaLabel={`Configurer : ${p.label}`}
                      className="flex min-h-[27rem] w-full flex-col justify-between p-8 md:p-9"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[13px] font-medium tracking-[0.2em] text-[#A19FA8]">0{i + 1}</span>
                        <span className="text-[#E6C288]/80 transition-transform duration-700 ease-silk group-hover:scale-110 group-hover:text-[#E6C288]">
                          <PieceGlyph piece={id} />
                        </span>
                      </div>
                      <div>
                        <h3 className="text-[2.3rem] font-semibold leading-none tracking-tight">{p.label}</h3>
                        <p className="mt-3 max-w-[16rem] text-[14.5px] leading-relaxed text-[#A19FA8]">{p.tagline}</p>
                        <div className="mt-7 flex items-center justify-between">
                          <span className="text-[13px] text-[#A19FA8]">
                            À partir de <span className="font-semibold text-[#F5F4F7]">{formatPrice(unitPrice(id, 'silver', p.sizes[0].value))}</span>
                          </span>
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F4F7] text-[#0E0D12] transition-transform duration-500 ease-silk group-hover:translate-x-1">
                            <ArrowRightIcon />
                          </span>
                        </div>
                      </div>
                    </GlowCard>
                  </div>
                );
              })}
            </div>

            <div data-reveal className="invisible mt-14 flex justify-center opacity-0">
              <button
                type="button"
                onClick={() => pickFromCollection(piece)}
                data-cursor="Configurer"
                className="flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#F3DDB4,#E6C288_55%,#D9A96A)] px-8 py-4 text-[15px] font-semibold text-[#0E0D12] transition-[filter,transform] duration-300 hover:scale-[1.03] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6C288]"
              >
                Composer ma pièce
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------- Footer -------------------------------- */}
        <footer id="footer" className={`relative z-10 px-3 pb-32 pt-6 md:px-5 md:pb-36 ${sectionFade}`}>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] px-7 pt-12 backdrop-blur-2xl md:px-14 md:pt-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[70%] -translate-x-1/2 rounded-full bg-[#E6C288]/[0.12] blur-[110px]"
            />
            <div className="relative flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <div className="max-w-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#E6C288]">Collection Hiver 2026</p>
                <p className="mt-4 text-[15px] leading-relaxed text-[#A19FA8]">
                  AUREA, maison d&apos;accessoires de beauté et de haute fantaisie. Montres, bagues et chaînes
                  imaginées en atelier numérique.
                </p>
              </div>
              <div className="flex flex-col items-start gap-6 md:items-end">
                <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#A19FA8] md:justify-end">
                  {PIECE_ORDER.map((id) => (
                    <li key={id}>{PIECE_INFO[id].label}s</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => lenisRef.current?.scrollTo(0, { duration: 2.2, easing: easeOutExpo })}
                  className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-[14px] font-medium transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C288]"
                >
                  <ArrowUpIcon width={16} height={16} />
                  Retour en haut
                </button>
              </div>
            </div>

            <p
              aria-hidden="true"
              className={`relative mt-14 select-none text-center text-[clamp(4.6rem,25vw,23rem)] font-semibold leading-[0.78] tracking-tighter ${gradientTitle}`}
              style={{
                WebkitMaskImage: 'linear-gradient(180deg,#000 55%,transparent 100%)',
                maskImage: 'linear-gradient(180deg,#000 55%,transparent 100%)',
              }}
            >
              AUREA
            </p>
            <p className="relative pb-6 pt-4 text-center text-[11.5px] tracking-wide text-[#A19FA8]/70">
              © 2026 AUREA. Tous droits réservés.
            </p>
          </div>
        </footer>
      </main>

      <Dock
        piece={piece}
        alloy={alloy}
        hidden={panel !== 'none'}
        onPiece={setPiece}
        onAlloy={setAlloy}
        onConfigure={openSheet}
      />

      <ProductSheet
        open={panel === 'sheet'}
        onClose={closePanel}
        piece={piece}
        alloy={alloy}
        size={size}
        onPiece={setPiece}
        onAlloy={setAlloy}
        onSize={setSize}
        onAdd={addToBag}
        bagCount={bagCount}
        onOpenBag={openBag}
        lenisRef={lenisRef}
      />

      <BagDrawer
        open={panel === 'bag'}
        onClose={closePanel}
        items={bag}
        onInc={incLine}
        onDec={decLine}
        onRemove={removeLine}
        onCheckout={clearBag}
        onBrowse={browseCollection}
        lenisRef={lenisRef}
      />
    </div>
  );
}
