# AUREA

Site immersif d'une maison d'accessoires de beauté et de haute fantaisie (montres, bagues, chaînes).
Next.js 15 (App Router), TypeScript strict, Tailwind CSS 3, React Three Fiber, drei, GSAP (ScrollTrigger) et Lenis.

## Lancer le projet

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

- Node 18.18 ou plus récent.
- `npm run build` pour la production. Le build télécharge la police Plus Jakarta Sans depuis Google Fonts (`next/font`), il faut donc une connexion internet.
- `npm run typecheck` pour vérifier TypeScript.
- Le script `postinstall` copie le décodeur Draco dans `public/draco` : les trois `.glb` sont compressés et se chargent sans CDN externe.

## Structure

```
app/
  layout.tsx            Police, métadonnées
  page.tsx              Lenis + ScrollTrigger, les 4 séquences, état global (pièce, alliage, écrin)
  globals.css
components/
  three/JewelryStudio.tsx   Canvas, éclairage, MODEL_CONFIG, changement d'alliage, caméra macro
  ui/NavBar.tsx             Barre pilule + badge de l'écrin
  ui/Dock.tsx               Dock du bas : pièce, alliage, Configurer
  ui/ProductSheet.tsx       Fiche produit latérale (taille, prix, ajout)
  ui/BagDrawer.tsx          Écrin : quantités, sous-total, confirmation
  ui/Preloader.tsx          Écran de chargement (useProgress)
  ui/PillCursor.tsx         Curseur pilule (desktop uniquement)
  ui/GlowCard.tsx           Carte verre dépoli avec halo suivant le curseur
lib/
  catalog.ts            Pièces, alliages, tailles, prix, formatage
  studioSignals.ts      Signaux scroll -> scène 3D (hors React)
  scrollLock.ts         Verrou de défilement Lenis (fiche, écrin, préchargement)
public/models/          watch.glb, ring.glb, chain.glb
```

## Régler une pièce 3D

Tout se passe dans `MODEL_CONFIG` (`components/three/JewelryStudio.tsx`) :

| Champ | Rôle |
| --- | --- |
| `scale` | Taille de la plus grande dimension du modèle, en unités de scène (chaque `.glb` est normalisé au chargement) |
| `baseRotation` | Orientation de départ `[x, y, z]`, ordre d'Euler YXZ : `x` redresse la pièce, `y` la tourne autour de la verticale |
| `macroCameraPos` | Position de la caméra pendant la Séquence 3 |
| `macroTarget` | Point visé par la caméra pendant la Séquence 3 |

Les positions macro sont exprimées pour un écran large. Sur mobile, la caméra recule et la pièce est réduite automatiquement.

## Changement d'alliage

Seuls les métaux clairs sont recolorés : les matériaux transparents, le verre, les pierres et les matériaux très sombres (bracelet) sont ignorés. La montre utilise une palette en texture : un petit shader remplace uniquement les zones dorées par l'alliage choisi, le cadran et le bracelet restent intacts.

## Fiche produit et 3D interactive

- Fiche ouverte : le texte de la page s'efface (`opacity-0`), le canvas passe en `z-30`, sans aucun flou, et la fiche est en `z-40`. Sur grand écran (>= 768 px) la pièce se décale à gauche (`CONFIGURATOR_OFFSET_X = -1.65` dans `JewelryStudio.tsx`).
- Cliquer-glisser pour tourner la pièce (`OrbitControls` sans zoom ni déplacement, amorti à 0.06). La pièce suit aussi le pointeur. À la fermeture, elle revient en douceur à sa position.
- Scroll (`scrub: 1`) : rotation de 360° et léger déplacement vertical pendant « L'art des courbes », rapprochement de la caméra pendant « Inspection macro ».
- Mobile : un bouton pilule en haut de l'écran bascule entre la fiche et l'aperçu 3D plein écran.

## Notes

- La commande est une démonstration : aucun paiement n'est effectué et rien n'est envoyé.
- Les trois modèles 3D proviennent de fichiers fournis (`ring_wings`, `cuban_link_chain`, `golden_watch`). Vérifier leur licence d'utilisation et ajouter les crédits d'auteur si elle l'exige.
- Les prix et les textes sont fictifs, à adapter dans `lib/catalog.ts`.
