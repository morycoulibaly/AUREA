import type { SVGProps } from 'react';
import type { PieceId } from '@/lib/catalog';

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const BagIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 8.5h14l-1.1 10.1a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4L5 8.5Z" />
    <path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const SlidersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4.5 7h15M9.5 7V5h5v2M7 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7" />
  </svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Pictogrammes filaires des trois pièces, utilisés sur les cartes. */
export function PieceGlyph({ piece, ...p }: IconProps & { piece: PieceId }) {
  const props: IconProps = { ...base, width: 72, height: 72, strokeWidth: 1.1, ...p };
  if (piece === 'watch') {
    return (
      <svg {...props}>
        <rect x="7" y="7" width="10" height="10" rx="4" />
        <path d="M9 7 9.8 2.8h4.4L15 7M9 17l.8 4.2h4.4L15 17" />
        <path d="M12 9.6V12l1.7 1.1" />
      </svg>
    );
  }
  if (piece === 'ring') {
    return (
      <svg {...props}>
        <circle cx="12" cy="14.5" r="5.5" />
        <path d="m9.6 6.6 2.4-3.2 2.4 3.2-2.4 2.2-2.4-2.2Z" />
        <path d="M6.4 8.4 9 9.6M17.6 8.4 15 9.6" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M5 4.5c.3 7.4 2.6 13.5 7 15.5 4.4-2 6.7-8.1 7-15.5" />
      <rect x="9.4" y="17.2" width="5.2" height="3.4" rx="1.7" />
      <circle cx="6.5" cy="9.6" r="1.1" />
      <circle cx="17.5" cy="9.6" r="1.1" />
      <circle cx="8.6" cy="14.2" r="1.1" />
      <circle cx="15.4" cy="14.2" r="1.1" />
    </svg>
  );
}
