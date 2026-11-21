'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { ALLOYS, PIECE_INFO, PIECE_ORDER, type AlloyId, type PieceId } from '@/lib/catalog';
import { studioSignals } from '@/lib/studioSignals';

/* -------------------------------------------------------------------------- */
/*  Calibration par modèle                                                     */
/* -------------------------------------------------------------------------- */

export type Vec3 = [number, number, number];

export interface ModelConfig {
  path: string;
  label: string;
  /**
   * Taille finale de la plus grande dimension du modèle, en unités de scène.
   * Chaque .glb est d'abord normalisé (ils n'ont pas la même unité d'origine),
   * donc ce nombre se règle de la même façon pour les trois pièces.
   */
  scale: number;
  /**
   * Orientation de départ (radians, ordre d'Euler YXZ) : X redresse la pièce,
   * puis Y la tourne autour de la verticale du monde.
   */
  baseRotation: Vec3;
  /** Position de la caméra pendant l'inspection macro (Séquence 3). */
  macroCameraPos: Vec3;
  /** Point visé par la caméra pendant l'inspection macro. */
  macroTarget: Vec3;
}

export const MODEL_CONFIG: Record<PieceId, ModelConfig> = {
  watch: {
    path: '/models/watch.glb',
    label: PIECE_INFO.watch.label,
    scale: 2.5,
    baseRotation: [1.4, -0.35, 0],
    macroCameraPos: [0.4, 0.6, 5.0],
    macroTarget: [0, -0.05, 1.05],
  },
  ring: {
    path: '/models/ring.glb',
    label: PIECE_INFO.ring.label,
    scale: 1.8,
    baseRotation: [-1.25, 0.55, 0],
    macroCameraPos: [0.7, 1.3, 3.0],
    macroTarget: [0, 0.65, 0],
  },
  chain: {
    path: '/models/chain.glb',
    label: PIECE_INFO.chain.label,
    scale: 2.3,
    baseRotation: [1.25, 0.1, 0],
    macroCameraPos: [1.5, 0.6, 2.7],
    macroTarget: [0.75, 0.1, 0],
  },
};

/* -------------------------------------------------------------------------- */
/*  Chargement (décodeur Draco local + préchargement)                          */
/* -------------------------------------------------------------------------- */

useGLTF.setDecoderPath('/draco/');
PIECE_ORDER.forEach((id) => useGLTF.preload(MODEL_CONFIG[id].path));

/* -------------------------------------------------------------------------- */
/*  Matériaux : détection des métaux et recoloration                           */
/* -------------------------------------------------------------------------- */

type TintMode = 'solid' | 'mask';

interface Tint {
  mat: THREE.MeshStandardMaterial;
  mode: TintMode;
  /** Couleur injectée dans le shader pour les matériaux texturés (palette). */
  uniform: { value: THREE.Color } | null;
}

function luminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/**
 * Seuls les métaux clairs sont recolorés. On ignore le verre, les pierres et
 * tout matériau transparent, ainsi que les matériaux très sombres (bracelet
 * caoutchouc / cuir) pour préserver le réalisme.
 */
function classify(mat: THREE.Material): TintMode | null {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return null;
  if (mat.transparent || mat.opacity < 0.98) return null;
  const transmission = (mat as THREE.MeshPhysicalMaterial).transmission ?? 0;
  if (transmission > 0) return null;
  if (mat.metalness < 0.5) return null;
  // Matériau texturé (palette de la montre) : on ne recolore que les zones dorées.
  if (mat.map) return 'mask';
  if (luminance(mat.color) < 0.04) return null;
  return 'solid';
}

function applyMaskShader(mat: THREE.MeshStandardMaterial, uniform: { value: THREE.Color }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAlloy = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uAlloy;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          // Les zones saturées de la palette (or, bronze) deviennent l'alliage choisi.
          // Blanc, gris et noir (cadran, index, bracelet) restent intacts.
          float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
          float mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
          float gold = smoothstep(0.10, 0.28, mx - mn);
          diffuseColor.rgb = mix(diffuseColor.rgb, uAlloy, gold);
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'aurea-alloy-mask';
  mat.needsUpdate = true;
}

interface BuiltPiece {
  root: THREE.Object3D;
  /** Facteur ramenant la plus grande dimension du modèle à 1 unité. */
  norm: number;
  tints: Tint[];
}

function buildPiece(source: THREE.Object3D, alloy: AlloyId): BuiltPiece {
  const root = source.clone(true);
  const cache = new Map<THREE.Material, THREE.Material>();
  const tints: Tint[] = [];
  const initial = new THREE.Color(ALLOYS[alloy].hex);

  const swap = (original: THREE.Material): THREE.Material => {
    const hit = cache.get(original);
    if (hit) return hit;
    const copy = original.clone();
    cache.set(original, copy);

    const mode = classify(copy);
    if (mode && copy instanceof THREE.MeshStandardMaterial) {
      if (mode === 'solid') {
        copy.color.copy(initial);
        copy.metalness = ALLOYS[alloy].metalness;
        copy.roughness = ALLOYS[alloy].roughness;
        tints.push({ mat: copy, mode, uniform: null });
      } else {
        const uniform = { value: initial.clone() };
        applyMaskShader(copy, uniform);
        tints.push({ mat: copy, mode, uniform });
      }
    }
    return copy;
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });

  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;
  return { root, norm: 1 / longest, tints };
}

/* -------------------------------------------------------------------------- */
/*  Une pièce (clone + matériaux + changement d'alliage en temps réel)         */
/* -------------------------------------------------------------------------- */

const targetColor = new THREE.Color();

function Piece({ id, alloy, visible }: { id: PieceId; alloy: AlloyId; visible: boolean }) {
  const cfg = MODEL_CONFIG[id];
  const { scene } = useGLTF(cfg.path);

  // Clone de la scène et de ses matériaux, une seule fois au montage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const built = useMemo(() => buildPiece(scene, alloy), [scene]);

  useEffect(() => {
    return () => {
      built.tints.forEach((t) => t.mat.dispose());
    };
  }, [built]);

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * 6);
    const info = ALLOYS[alloy];
    targetColor.set(info.hex);
    for (const tint of built.tints) {
      if (tint.mode === 'solid') {
        tint.mat.color.lerp(targetColor, k);
        tint.mat.metalness = THREE.MathUtils.lerp(tint.mat.metalness, info.metalness, k);
        tint.mat.roughness = THREE.MathUtils.lerp(tint.mat.roughness, info.roughness, k);
      } else if (tint.uniform) {
        tint.uniform.value.lerp(targetColor, k);
      }
    }
  });

  return (
    <group visible={visible}>
      <group rotation={[cfg.baseRotation[0], cfg.baseRotation[1], cfg.baseRotation[2], 'YXZ']} scale={built.norm * cfg.scale}>
        <Center>
          <primitive object={built.root} />
        </Center>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Éclairage de studio                                                        */
/* -------------------------------------------------------------------------- */

function StudioEnvironment() {
  // Grand panneau incurvé : une rangée de rectangles qui regardent tous le centre.
  const arc = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const angle = THREE.MathUtils.degToRad(-72 + i * 24);
        const radius = 8;
        const position: Vec3 = [Math.sin(angle) * radius, 6.4 - Math.abs(i - 3) * 0.35, Math.cos(angle) * radius * 0.55 - 2.4];
        return { key: i, position };
      }),
    [],
  );

  return (
    <Environment resolution={256} environmentIntensity={1}>
      {arc.map((p) => (
        <Lightformer key={p.key} form="rect" intensity={2.4} color="#FFF8EE" scale={[4.6, 2.4, 1]} position={p.position} />
      ))}
      {/* Panneaux champagne latéraux : longs reflets soyeux sur les courbes */}
      <Lightformer form="rect" intensity={2.6} color="#E6C288" scale={[2.6, 10, 1]} position={[-8.5, 1, 1.5]} />
      <Lightformer form="rect" intensity={2.1} color="#E6C288" scale={[2.6, 10, 1]} position={[8.5, 0.5, 0.5]} />
      {/* Contre-jour quartz rose, très léger */}
      <Lightformer form="rect" intensity={1.3} color="#E5989B" scale={[8, 2, 1]} position={[-2, 1.5, -8]} />
      {/* Filet spéculaire fin et intense : dessine une ligne nette sur les biseaux */}
      <Lightformer form="rect" intensity={14} color="#FFFFFF" scale={[0.22, 9, 1]} position={[6.2, 1.2, 4.2]} />
      {/* Remplissage bas, pour que les faces inférieures ne tombent pas dans le noir */}
      <Lightformer form="rect" intensity={0.45} color="#FFF8EE" scale={[14, 3, 1]} position={[0, -6, 2]} />
    </Environment>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scène                                                                      */
/* -------------------------------------------------------------------------- */

type Phase = 'wait' | 'idle' | 'out' | 'in';

const BASE_DISTANCE = 7.4;
const BASE_HEIGHT = 0.35;
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Décalage (unités de scène) de la pièce vers la gauche quand la fiche est ouverte sur grand écran. */
const CONFIGURATOR_OFFSET_X = -1.65;
/** En dessous de cette largeur (px, breakpoint md), la fiche couvre l'écran : pas de côte à côte. */
const SIDE_BY_SIDE_MIN_WIDTH = 768;

interface SceneProps {
  piece: PieceId;
  alloy: AlloyId;
  ready: boolean;
  isConfiguratorOpen: boolean;
}

function Scene({ piece, alloy, ready, isConfiguratorOpen }: SceneProps) {
  const viewport = useThree((s) => s.viewport);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const pointer = useThree((s) => s.pointer);
  const gl = useThree((s) => s.gl);

  const [shown, setShown] = useState<PieceId>(piece);
  const [warm, setWarm] = useState(true);
  const [shadowLive, setShadowLive] = useState(true);

  const shownRef = useRef<PieceId>(piece);
  const pieceRef = useRef<PieceId>(piece);
  const shadowRef = useRef(true);
  const motion = useRef<THREE.Group>(null);
  const shadowGroup = useRef<THREE.Group>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const openRef = useRef(isConfiguratorOpen);
  openRef.current = isConfiguratorOpen;

  // Caméra factice pilotée par OrbitControls : on n'en lit que les angles pour
  // faire tourner le bijou, la vraie caméra reste gérée par la chorégraphie du scroll.
  const orbitCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    return cam;
  }, []);

  const st = useRef({
    phase: 'wait' as Phase,
    t: 0,
    /** échelle élastique (ressort) et sa vitesse */
    s: 0,
    sv: 0,
    /** impulsion de rotation (ressort) et sa vitesse */
    k: 0,
    kv: 0,
    spin: 0,
    px: 0,
    py: 0,
    macro: 0,
    presence: 1,
    side: 0,
    lift: 0,
    panel: 0,
    /** rotation libre au cliquer-glisser (lue sur OrbitControls) */
    oy: 0,
    ox: 0,
    accAz: 0,
    prevAz: 0,
    dragged: false,
  });

  const vec = useMemo(
    () => ({
      camPos: new THREE.Vector3(0, BASE_HEIGHT, BASE_DISTANCE),
      camLook: new THREE.Vector3(),
      base: new THREE.Vector3(),
      macroPos: new THREE.Vector3(),
      macroTarget: new THREE.Vector3(),
      look: new THREE.Vector3(),
    }),
    [],
  );

  // Cadrage responsive : plus le viewport est étroit, plus on recule et on réduit.
  const responsive = useMemo(() => {
    const portrait = THREE.MathUtils.clamp(viewport.aspect / 1.15, 0.38, 1);
    return {
      portrait,
      distMul: 1 + (1 - portrait) * 0.95,
      scaleMul: 1 - (1 - portrait) * 0.3,
      desktop: viewport.aspect >= 1.1,
    };
  }, [viewport.aspect]);

  // Suivi du pointeur : la scène est derrière le contenu (pointer-events: none),
  // on alimente donc state.pointer depuis la fenêtre.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [pointer]);

  // Entrée en scène une fois le préchargement terminé.
  useEffect(() => {
    const s = st.current;
    if (ready && s.phase === 'wait') {
      if (shownRef.current !== pieceRef.current) {
        shownRef.current = pieceRef.current;
        setShown(pieceRef.current);
      }
      s.phase = 'in';
      s.s = 0;
      s.sv = 0;
      s.k = -1.5;
      s.kv = 0;
      setWarm(false);
    }
  }, [ready]);

  // Changement d'accessoire : sortie rapide, puis réapparition avec rebond.
  useEffect(() => {
    pieceRef.current = piece;
    const s = st.current;
    if (piece === shownRef.current) return;
    if (s.phase === 'wait') {
      shownRef.current = piece;
      setShown(piece);
      return;
    }
    s.phase = 'out';
  }, [piece]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const s = st.current;
    const sig = studioSignals;
    const rate = (r: number) => 1 - Math.exp(-r * dt);
    const { desktop, distMul, scaleMul, portrait } = responsive;

    s.t += dt;

    // Fiche ouverte : la pièce est toujours présente et cadrée comme dans le hero,
    // quel que soit l'endroit de la page où l'on se trouve.
    const open = openRef.current;
    const wide = state.size.width >= SIDE_BY_SIDE_MIN_WIDTH && viewport.aspect >= 1.1;

    // Le scroll est déjà lissé par GSAP (scrub: 1) : on garde peu d'inertie ici.
    s.spin = THREE.MathUtils.lerp(s.spin, sig.spin, rate(9));
    s.macro = THREE.MathUtils.lerp(s.macro, open ? 0 : sig.macro, rate(8));
    s.lift = THREE.MathUtils.lerp(s.lift, open ? 0 : sig.lift, rate(6));
    s.side = THREE.MathUtils.lerp(s.side, open ? 0 : sig.heroOut, rate(3.2));
    s.presence = THREE.MathUtils.lerp(s.presence, open ? 1 : 1 - sig.outro, rate(4));
    s.panel = THREE.MathUtils.lerp(s.panel, open && wide ? 1 : 0, rate(4));

    // Rotation libre (OrbitControls) : angles cumulés sans saut au passage de ±π
    const ctl = controls.current;
    if (ctl) {
      if (open) {
        s.dragged = true;
        const az = ctl.getAzimuthalAngle();
        let d = az - s.prevAz;
        if (d > Math.PI) d -= Math.PI * 2;
        else if (d < -Math.PI) d += Math.PI * 2;
        s.accAz += d;
        s.prevAz = az;
        s.oy = THREE.MathUtils.lerp(s.oy, -s.accAz, rate(16));
        s.ox = THREE.MathUtils.lerp(s.ox, Math.PI / 2 - ctl.getPolarAngle(), rate(16));
      } else {
        if (s.dragged) {
          ctl.reset();
          s.prevAz = 0;
          s.accAz = 0;
          s.dragged = false;
        }
        s.oy = THREE.MathUtils.lerp(s.oy, 0, rate(4));
        s.ox = THREE.MathUtils.lerp(s.ox, 0, rate(4));
      }
    }

    // Inertie lourde du pointeur (0.05 à 60 FPS, indépendante du framerate)
    const pk = 1 - Math.pow(1 - 0.05, dt * 60);
    s.px = THREE.MathUtils.lerp(s.px, pointer.x, pk);
    s.py = THREE.MathUtils.lerp(s.py, pointer.y, pk);

    // Impulsion élastique au changement de pièce
    if (s.phase === 'out') {
      s.s = THREE.MathUtils.lerp(s.s, 0, rate(16));
      s.k = THREE.MathUtils.lerp(s.k, 0.5, rate(8));
      if (s.s < 0.04) {
        shownRef.current = pieceRef.current;
        setShown(pieceRef.current);
        s.phase = 'in';
        s.s = 0;
        s.sv = 0;
        s.k = -1.3;
        s.kv = 0;
      }
    } else if (s.phase === 'in' || s.phase === 'idle') {
      // Ressorts sous-amortis : dépassement visible, puis stabilisation.
      s.sv += ((1 - s.s) * 78 - s.sv * 7.2) * dt;
      s.s += s.sv * dt;
      s.kv += ((0 - s.k) * 46 - s.kv * 6.4) * dt;
      s.k += s.kv * dt;
      if (s.phase === 'in' && Math.abs(1 - s.s) < 0.002 && Math.abs(s.sv) < 0.01) {
        s.phase = 'idle';
        s.s = 1;
        s.k = 0;
      }
    }

    // --- Caméra (zoom macro de la Séquence 3) ---
    const cfg = MODEL_CONFIG[shownRef.current];
    const em = smooth(THREE.MathUtils.clamp(s.macro, 0, 1));
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const baseDist = BASE_DISTANCE * distMul;
    const macroMul = 1 + (1 - portrait) * 0.55;

    vec.macroTarget.set(...cfg.macroTarget).multiplyScalar(scaleMul);
    vec.macroPos
      .set(...cfg.macroCameraPos)
      .multiplyScalar(scaleMul)
      .sub(vec.macroTarget)
      .multiplyScalar(macroMul)
      .add(vec.macroTarget);
    vec.base.set(0, BASE_HEIGHT, baseDist).lerp(vec.macroPos, em);
    vec.look.set(0, 0, 0).lerp(vec.macroTarget, em);

    const ck = rate(6);
    vec.camPos.lerp(vec.base, ck);
    vec.camLook.lerp(vec.look, ck);
    camera.position.copy(vec.camPos);
    camera.lookAt(vec.camLook);

    // --- Pièce ---
    const g = motion.current;
    if (g) {
      const halfH = Math.tan(fov / 2) * baseDist;
      const halfW = halfH * viewport.aspect;
      const sideAmount = desktop ? 0.3 : 0;
      // Position issue du scroll, puis côte à côte avec la fiche (-1.65) sur grand écran
      const xScroll = halfW * sideAmount * s.side * (1 - em);
      const x = THREE.MathUtils.lerp(xScroll, CONFIGURATOR_OFFSET_X, s.panel);
      // Dans le hero la pièce est légèrement plus basse (le titre respire au-dessus),
      // puis elle monte doucement pendant la Séquence 2.
      const y =
        -0.1 * halfH * (1 - s.side) * (1 - em) +
        0.14 * halfH * s.lift * (1 - em) +
        (!desktop ? 0.04 * halfH * s.side : 0);
      const breathe = Math.sin(s.t * 0.9) * 0.07;

      const scale = Math.max(0.0001, s.s * s.presence * scaleMul);
      g.position.set(x, y + breathe, 0);
      g.scale.setScalar(scale);
      g.visible = s.phase === 'wait' || scale > 0.003;
      g.rotation.set(
        -s.py * 0.22 + Math.sin(s.t * 0.7) * 0.03 + s.ox,
        s.spin + s.px * 0.5 + s.k + s.oy,
        Math.sin(s.t * 0.55) * 0.025,
        'YXZ',
      );

      if (shadowGroup.current) {
        shadowGroup.current.position.set(x, -1.5 * scaleMul, 0);
      }

      const live = s.presence > 0.02;
      if (live !== shadowRef.current) {
        shadowRef.current = live;
        setShadowLive(live);
      }
    }

    state.gl.toneMappingExposure = 1.05;
  });

  return (
    <>
      <StudioEnvironment />
      <OrbitControls
        ref={controls}
        camera={orbitCamera}
        domElement={gl.domElement}
        enabled={isConfiguratorOpen}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.9}
        minPolarAngle={Math.PI / 2 - 1.05}
        maxPolarAngle={Math.PI / 2 + 1.05}
      />
      <ambientLight intensity={0.1} />
      <spotLight position={[3.5, 6, 4.5]} angle={0.5} penumbra={1} intensity={60} color="#FFF3E0" />

      <group ref={shadowGroup} position={[0, -1.5, 0]}>
        <ContactShadows
          opacity={0.45}
          scale={10}
          blur={2.4}
          far={4}
          frames={shadowLive ? Infinity : 1}
          color="#000000"
        />
      </group>

      <group ref={motion} scale={0.0001}>
        {PIECE_ORDER.map((id) => (
          <Piece key={id} id={id} alloy={alloy} visible={warm || shown === id} />
        ))}
      </group>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Canvas                                                                     */
/* -------------------------------------------------------------------------- */

export interface JewelryStudioProps {
  piece: PieceId;
  alloy: AlloyId;
  /** Passe à true quand l'écran de chargement se retire : lance l'entrée en scène. */
  ready: boolean;
  /**
   * Fiche produit ouverte : le canvas passe au premier plan (z-30), net et
   * interactif (cliquer-glisser pour tourner), et la pièce se décale à gauche sur PC.
   */
  isConfiguratorOpen: boolean;
}

export default function JewelryStudio({ piece, alloy, ready, isConfiguratorOpen }: JewelryStudioProps) {
  return (
    <div
      className={`fixed inset-0 ${
        isConfiguratorOpen
          ? 'pointer-events-auto z-30 cursor-grab active:cursor-grabbing'
          : 'pointer-events-none z-[5] [&_*]:!pointer-events-none'
      }`}
      data-cursor={isConfiguratorOpen ? 'Pivoter' : undefined}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, BASE_HEIGHT, BASE_DISTANCE], fov: 32, near: 0.1, far: 80 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        style={{ pointerEvents: isConfiguratorOpen ? 'auto' : 'none' }}
      >
        <Suspense fallback={null}>
          <Scene piece={piece} alloy={alloy} ready={ready} isConfiguratorOpen={isConfiguratorOpen} />
        </Suspense>
      </Canvas>
    </div>
  );
}
