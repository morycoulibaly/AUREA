// Copie le décodeur Draco de three vers public/draco pour que les .glb
// compressés se chargent sans dépendre d'un CDN externe.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const dest = join(root, 'public', 'draco');

if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log('[aurea] Décodeur Draco copié dans public/draco');
} else {
  console.warn('[aurea] Décodeur Draco introuvable, le CDN par défaut sera utilisé.');
}
