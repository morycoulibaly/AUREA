export type PieceId = 'watch' | 'ring' | 'chain';
export type AlloyId = 'champagne' | 'rose' | 'silver' | 'obsidian';

export const PIECE_ORDER: PieceId[] = ['watch', 'ring', 'chain'];
export const ALLOY_ORDER: AlloyId[] = ['champagne', 'rose', 'silver', 'obsidian'];

export interface SizeOption {
  value: string;
  label: string;
  /** Supplément de prix (en euros) */
  delta: number;
}

export interface PieceDetail {
  title: string;
  text: string;
}

export interface PieceInfo {
  id: PieceId;
  label: string;
  tagline: string;
  description: string;
  reference: string;
  sizeTitle: string;
  sizes: SizeOption[];
  basePrice: number;
  /** Trois bulles de la séquence « Inspection macro » */
  details: [PieceDetail, PieceDetail, PieceDetail];
}

export const PIECE_INFO: Record<PieceId, PieceInfo> = {
  watch: {
    id: 'watch',
    label: 'Montre',
    tagline: 'Le temps, poli comme un galet.',
    description:
      'Un boîtier aux arêtes adoucies, un cadran épuré et un verre galbé qui capte la lumière sans jamais éblouir.',
    reference: 'AUR-M01',
    sizeTitle: 'Diamètre du boîtier',
    sizes: [
      { value: '38 mm', label: '38 mm', delta: 0 },
      { value: '41 mm', label: '41 mm', delta: 280 },
    ],
    basePrice: 4200,
    details: [
      { title: 'Lunette biseautée', text: 'Polie miroir, arêtes adoucies à la main' },
      { title: 'Cadran épuré', text: 'Index fins, lecture immédiate' },
      { title: 'Verre galbé', text: 'Reflets longs et maîtrisés' },
    ],
  },
  ring: {
    id: 'ring',
    label: 'Bague',
    tagline: 'Deux ailes, une seule pierre.',
    description:
      "Deux courbes sculptées qui s'ouvrent comme un envol autour d'une pierre claire, pour un volume léger au doigt.",
    reference: 'AUR-B02',
    sizeTitle: 'Tour de doigt',
    sizes: [
      { value: '50', label: '50', delta: 0 },
      { value: '52', label: '52', delta: 0 },
      { value: '54', label: '54', delta: 0 },
      { value: '56', label: '56', delta: 0 },
      { value: '58', label: '58', delta: 0 },
    ],
    basePrice: 1480,
    details: [
      { title: 'Ailes sculptées', text: "Deux courbes qui s'ouvrent vers la pierre" },
      { title: 'Pierre centrale', text: 'Taille brillant, sertie au plus près' },
      { title: 'Anneau confort', text: 'Section arrondie, finition miroir' },
    ],
  },
  chain: {
    id: 'chain',
    label: 'Chaîne',
    tagline: 'Des maillons denses, un éclat continu.',
    description:
      'Une maille serrée au volume généreux, polie maillon par maillon pour que la lumière glisse sans à-coup.',
    reference: 'AUR-C03',
    sizeTitle: 'Longueur',
    sizes: [
      { value: '45 cm', label: '45 cm', delta: 0 },
      { value: '50 cm', label: '50 cm', delta: 320 },
    ],
    basePrice: 2350,
    details: [
      { title: 'Maillons serrés', text: 'Une maille dense, un volume net' },
      { title: 'Polissage miroir', text: 'Chaque maillon est poli séparément' },
      { title: 'Retombée fluide', text: 'La chaîne épouse la courbe du cou' },
    ],
  },
};

export interface AlloyInfo {
  id: AlloyId;
  label: string;
  hex: string;
  /** Dégradé utilisé pour les pastilles métalliques */
  swatch: string;
  metalness: number;
  roughness: number;
  priceFactor: number;
}

export const ALLOYS: Record<AlloyId, AlloyInfo> = {
  champagne: {
    id: 'champagne',
    label: 'Or Champagne',
    hex: '#E6C288',
    swatch: 'linear-gradient(135deg,#FFF3DB 0%,#E6C288 48%,#A5804B 100%)',
    metalness: 0.95,
    roughness: 0.16,
    priceFactor: 1,
  },
  rose: {
    id: 'rose',
    label: 'Or Rose',
    hex: '#E5989B',
    swatch: 'linear-gradient(135deg,#FCE4E5 0%,#E5989B 48%,#9A585C 100%)',
    metalness: 0.95,
    roughness: 0.16,
    priceFactor: 1.04,
  },
  silver: {
    id: 'silver',
    label: 'Argent',
    hex: '#E8EAED',
    swatch: 'linear-gradient(135deg,#FFFFFF 0%,#E8EAED 48%,#8C9097 100%)',
    metalness: 0.95,
    roughness: 0.13,
    priceFactor: 0.84,
  },
  obsidian: {
    id: 'obsidian',
    label: 'Titane',
    hex: '#2A2C32',
    swatch: 'linear-gradient(135deg,#5B5E68 0%,#2A2C32 55%,#121317 100%)',
    metalness: 0.92,
    roughness: 0.26,
    priceFactor: 0.92,
  },
};

export function unitPrice(piece: PieceId, alloy: AlloyId, size: string): number {
  const info = PIECE_INFO[piece];
  const delta = info.sizes.find((s) => s.value === size)?.delta ?? 0;
  const raw = (info.basePrice + delta) * ALLOYS[alloy].priceFactor;
  return Math.round(raw / 10) * 10;
}

/** Format déterministe (identique serveur / client, pas de dépendance à Intl). */
export function formatPrice(value: number): string {
  const digits = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${digits} €`;
}

export interface BagLine {
  key: string;
  piece: PieceId;
  alloy: AlloyId;
  size: string;
  qty: number;
  unitPrice: number;
}

export function lineKey(piece: PieceId, alloy: AlloyId, size: string): string {
  return `${piece}|${alloy}|${size}`;
}
