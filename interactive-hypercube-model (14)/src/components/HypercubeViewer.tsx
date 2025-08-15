import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Polytope,
  V4,
  Point3D,
  slicePolytope,
  tesseractCellId,
  wLuma,
  Edge,
} from '../lib/polytopes';
import { ThemeName } from './Controls';
import { TrainingEvent } from '../App';
import { DimensionalKeySpec, Plane } from '../lib/security';
import { inferPublicIntents } from '../lib/rotation';
import { verifyKey, MAX_KEY_FILE_SIZE } from '../lib/keyVerification';

// --- Type Definitions ---
interface Point2D {
  x: number;
  y: number;
}
type P2 = Point2D;
type EdgeKey = string;

interface ProjectedPoint {
  point: Point2D;
  depth: number;
  w: number;
}

interface ProjectedLine {
  key: string;
  edgeKey: EdgeKey;
  p1: Point2D;
  p2: Point2D;
  color: string;
  strokeWidth: number;
  depth: number;
}
interface ProjectedBraid {
  key: string;
  edgeKey: EdgeKey;
  d: string;
  stroke?: string;
  fill?: string;
  opacity: number;
  width?: number;
  depth: number;
}
interface ProjectedHalo {
  key: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
  opacity: number;
}
interface Effect {
  id: number;
  type: 'denied' | 'granted_ripple';
  x: number;
  y: number;
  t0: number;
}
interface Keycap {
  id: number;
  label: string;
  x: number;
  y: number;
  t0: number;
  tone: 'neutral' | 'locked' | 'ok';
}

// --- Math Helpers ---
const V3 = {
  subtract: (a: Point3D, b: Point3D): Point3D => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),
  dot: (a: Point3D, b: Point3D): number => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a: Point3D, b: Point3D): Point3D => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  length: (a: Point3D): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
  normalize: (a: Point3D): Point3D => {
    const l = V3.length(a);
    return l > 0
      ? { x: a.x / l, y: a.y / l, z: a.z / l }
      : { x: 0, y: 0, z: 0 };
  },
};
function edgeKey(i: number, j: number) {
  return i < j ? `${i}-${j}` : `${j}-${i}`;
}
function lerp2(a: P2, b: P2, t: number): P2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function perp2(a: P2, b: P2): P2 {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = Math.max(1e-6, Math.hypot(dx, dy));
  return { x: -dy / len, y: dx / len };
}
function pkgAmp(t: number, centers: number[], width: number, enable: boolean) {
  if (!enable) return 0;
  return centers.reduce((acc, c) => {
    const sigma = Math.max(0.03, width * 0.5);
    const dist = Math.abs(t - c);
    const wrap_dist = Math.min(dist, 1 - dist);
    const d_wrap = wrap_dist / sigma;
    const g = Math.exp(-0.5 * d_wrap * d_wrap);
    return acc + g;
  }, 0);
}
function braidPathsForEdge(
  p1: P2,
  p2: P2,
  opts: {
    strands: number;
    amplitude: number;
    segments: number;
    phase: number;
    sectorSkew: number;
    packageCenters: number[];
    packageWidth: number;
    enableDataPackage: boolean;
  },
) {
  const {
    strands,
    amplitude,
    segments,
    phase,
    sectorSkew,
    packageCenters,
    packageWidth,
    enableDataPackage,
  } = opts;
  const normal = perp2(p1, p2);
  const paths: P2[][] = [];
  for (let s = 0; s < strands; s++) {
    const strandPhase = phase + (s / strands) * Math.PI * 2 + sectorSkew;
    const pts: P2[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const base = lerp2(p1, p2, t);
      const totalPackageAmp = pkgAmp(
        t,
        packageCenters,
        packageWidth,
        enableDataPackage,
      );
      const taper = Math.sin(t * Math.PI);
      const amp = amplitude * taper * (1 + 1.5 * totalPackageAmp);
      const wrap = Math.sin(t * Math.PI * 2 * 1.0 + strandPhase);
      const ripple = 0.35 * Math.sin(t * Math.PI * 2 * 4.0 - strandPhase * 0.7);
      pts.push({
        x: base.x + normal.x * amp * (wrap + ripple),
        y: base.y + normal.y * amp * (wrap + ripple),
      });
    }
    paths.push(pts);
  }
  return paths;
}
function ribbonPathD(points: P2[]): string {
  return !points.length
    ? ''
    : 'M ' +
        points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ');
}
function pickEdgeColor(cellMix: number, wAvg: number, theme: ThemeName) {
  const hueTable = {
    Cyber: [190, 210, 230, 260, 280, 300, 320, 340],
    Mono: [0, 0, 0, 0, 0, 0, 0, 0],
    Aurora: [160, 180, 200, 220, 240, 260, 280, 300],
  }[theme];
  const hue = hueTable[cellMix % hueTable.length];
  const sat =
    theme === 'Mono' ? 0 : Math.round(50 + 40 * wLuma(wAvg) * 100) / 100;
  const light = Math.round(45 + 40 * wLuma(wAvg) * 100) / 100;
  return `hsl(${hue} ${sat}% ${light}%)`;
}
function pickCellColor(cell: number, theme: ThemeName) {
  const base = { Cyber: 180, Mono: 0, Aurora: 210 }[theme];
  return `hsl(${(base + cell * 16) % 360}, 80%, 55%)`;
}

let effectIdSeq = 1;
const EFFECT_LIFETIME_MS = 1000;

// --- Component Props ---
interface HypercubeViewerProps {
  polytope: Polytope;
  theme: ThemeName;
  braidEnabled: boolean;
  braidStrands: number;
  braidAmplitude: number;
  sectorTwist: number;
  enableDataPackage: boolean;
  packageSpeed: number;
  packageWidth: number;
  cellHalo: boolean;
  showLegend: boolean;
  glowEnabled: boolean;
  bloomStrength: number;
  haloStrength: number;
  additiveBlend: boolean;
  edgeColorLock: boolean;
  isSlicing: boolean;
  sliceW: number;
  isCarving: boolean;
  onSliceCarved: (points: Point3D[]) => void;
  spriteTraversalEnabled: boolean;
  spriteDimension: 'X' | 'Y' | 'Z' | 'W';
  spriteSpeed: number;
  hasSecureKey: boolean;
  keySpec: DimensionalKeySpec;
  onTrainingEvent: (event: TrainingEvent) => void;
  trainingStep: TrainingEvent;
  onImportKey: () => void;
}

const GlowStroke: React.FC<{
  d: string;
  color: string;
  core?: number;
  glow?: number;
  opacity?: number;
  blendMode: any;
}> = ({ d, color, core = 1.5, glow = 10, opacity = 1, blendMode }) => {
  return (
    <g style={{ mixBlendMode: blendMode }} opacity={opacity}>
      <path
        d={d}
        stroke={color}
        strokeWidth={glow}
        strokeLinecap="round"
        fill="none"
        opacity={0.2}
      />
      <path
        d={d}
        stroke={color}
        strokeWidth={glow * 0.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.35}
      />
      <path
        d={d}
        stroke={color}
        strokeWidth={core}
        strokeLinecap="round"
        fill="none"
        opacity={0.95}
      />
    </g>
  );
};

const GlowLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  core?: number;
  glow?: number;
  opacity?: number;
  blendMode: any;
}> = ({
  x1,
  y1,
  x2,
  y2,
  color,
  core = 2,
  glow = 12,
  opacity = 1,
  blendMode,
}) => {
  return (
    <g style={{ mixBlendMode: blendMode }} opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={glow}
        strokeLinecap="round"
        opacity={0.18}
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={glow * 0.55}
        strokeLinecap="round"
        opacity={0.32}
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={core}
        strokeLinecap="round"
        opacity={0.95}
      />
    </g>
  );
};

const OcclusionVeils: React.FC<{ intensity?: number }> = ({
  intensity = 0.25,
}) => {
  return (
    <g
      pointerEvents="none"
      style={{ mixBlendMode: 'screen' }}
      opacity={intensity}
    >
      <defs>
        <linearGradient id="veilA" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(210 90% 60%)" stopOpacity="0" />
          <stop offset="60%" stopColor="hsl(220 90% 65%)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="hsl(260 90% 70%)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="veilB" x1="1" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(280 90% 60%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(300 90% 65%)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(320 90% 70%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x="-820"
        y="-820"
        width="1640"
        height="1640"
        fill="url(#veilA)"
        transform="translate(-6,-4) rotate(1.2)"
      />
      <rect
        x="-840"
        y="-840"
        width="1680"
        height="1680"
        fill="url(#veilB)"
        transform="translate(5,3) rotate(-1.1)"
      />
    </g>
  );
};

const HypercubeViewer: React.FC<HypercubeViewerProps> = (props) => {
  const {
    polytope,
    theme,
    braidEnabled,
    braidStrands,
    braidAmplitude,
    sectorTwist,
    enableDataPackage,
    packageSpeed,
    packageWidth,
    cellHalo,
    showLegend,
    glowEnabled,
    bloomStrength,
    haloStrength,
    additiveBlend,
    edgeColorLock,
    isSlicing,
    sliceW,
    isCarving,
    onSliceCarved,
    spriteTraversalEnabled,
    spriteDimension,
    spriteSpeed,
    hasSecureKey,
    keySpec,
    onTrainingEvent,
    trainingStep,
    onImportKey,
  } = props;

  const [lines, setLines] = useState<ProjectedLine[]>([]);
  const [ghostLines, setGhostLines] = useState<ProjectedLine[]>([]);
  const [braidStrokes, setBraidStrokes] = useState<ProjectedBraid[]>([]);
  const [halos, setHalos] = useState<ProjectedHalo[]>([]);
  const [slicePoints, setSlicePoints] = useState<Point2D[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [keycaps, setKeycaps] = useState<Keycap[]>([]);
  const [keyNode, setKeyNode] = useState<{
    pos: Point2D;
    visible: boolean;
  } | null>(null);
  const [showWBadge, setShowWBadge] = useState(false);

  const rotationAngles = useRef({ XY: 0, YZ: 0, XZ: 0, XW: 0, YW: 0, ZW: 0.5 });
  const spriteState = useRef<{ edge: Edge | null; position: number }>({
    edge: null,
    position: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const [wMode, setWMode] = useState(false);
  const zoom = useRef(1);
  const requestRef = useRef<number | null>(null);
  const time = useRef(0);
  const TESSERACT_SCALE = 120;

  const screenBlend = (additiveBlend ? 'screen' : 'normal') as any;

  const lockedEdgeColorMap = useMemo(() => {
    const colors = new Map<EdgeKey, string>();
    if (!edgeColorLock) return colors;

    const hueTable = {
      Cyber: [190, 210, 230, 260, 280, 300, 320, 340],
      Mono: [0, 0, 0, 0, 0, 0, 0, 0],
      Aurora: [160, 180, 200, 220, 240, 260, 280, 300],
    }[theme];
    const sat = theme === 'Mono' ? 0 : 80;
    const light = 65;

    polytope.edges.forEach(([i, j]) => {
      const v1_orig = polytope.vertices[i];
      const v2_orig = polytope.vertices[j];
      const cellA_orig = tesseractCellId(v1_orig);
      const cellB_orig = tesseractCellId(v2_orig);
      const cellMix_orig = (cellA_orig + cellB_orig) >> 1;
      const hue = hueTable[cellMix_orig % hueTable.length];
      const color = `hsl(${hue} ${sat}% ${light}%)`;
      colors.set(edgeKey(i, j), color);
    });
    return colors;
  }, [polytope, theme, edgeColorLock]);

  let keycapId = useRef(1);
  const spawnKeycap = (
    label: string,
    tone: 'neutral' | 'locked' | 'ok',
    at: { x: number; y: number },
  ) => {
    setKeycaps((list) => [
      ...list,
      {
        id: keycapId.current++,
        label,
        tone,
        x: at.x,
        y: at.y,
        t0: performance.now(),
      },
    ]);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const label = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const cursor = lastCursorRef.current ?? { x: 0, y: 0 };
      if (label === 'W') {
        setWMode(true);
        setShowWBadge(true);
        spawnKeycap('W', 'ok', cursor);
        return;
      }
      if (['Y', 'Z'].includes(label)) {
        spawnKeycap(label, 'locked', cursor);
        return;
      }
      if (
        e.key.length === 1 &&
        !/\s/.test(e.key) &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        spawnKeycap(label, 'neutral', cursor);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'w') {
        setWMode(false);
        setShowWBadge(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [wMode]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = performance.now();
      setKeycaps((list) => list.filter((k) => now - k.t0 < 900));
    }, 120);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = setInterval(() => {
      const now = performance.now();
      setEffects((prev) => prev.filter((e) => now - e.t0 < EFFECT_LIFETIME_MS));
    }, 60);
    return () => clearInterval(h);
  }, []);

  // Path Carver effect
  useEffect(() => {
    if (isCarving && isSlicing) {
      let rotated4DVertices = polytope.vertices.map((v) => ({ ...v }));
      const planeMap: { [key in Plane]: [keyof V4, keyof V4] } = {
        XY: ['x', 'y'],
        YZ: ['y', 'z'],
        XZ: ['x', 'z'],
        XW: ['x', 'w'],
        YW: ['y', 'w'],
        ZW: ['z', 'w'],
      };
      (Object.keys(planeMap) as Plane[]).forEach((plane) => {
        const angle =
          rotationAngles.current[plane as keyof typeof rotationAngles.current];
        if (angle === 0) return;
        const [aKey, bKey] = planeMap[plane];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        rotated4DVertices.forEach((p) => {
          const a = p[aKey];
          const b = p[bKey];
          p[aKey] = a * cos - b * sin;
          p[bKey] = a * sin + b * cos;
        });
      });
      const rotatedPolytope: Polytope = {
        vertices: rotated4DVertices,
        edges: polytope.edges,
      };
      const sliced3DPoints = slicePolytope(rotatedPolytope, sliceW);
      onSliceCarved(sliced3DPoints);
    }
  }, [
    isCarving,
    isSlicing,
    sliceW,
    polytope.edges,
    polytope.vertices,
    onSliceCarved,
  ]);

  // Dimensional Sprite edge finder
  useEffect(() => {
    const dimKey = spriteDimension.toLowerCase() as keyof V4;
    const foundEdge = polytope.edges.find(([i, j]) => {
      const v1 = polytope.vertices[i];
      const v2 = polytope.vertices[j];
      const otherDimsMatch = (['x', 'y', 'z', 'w'] as (keyof V4)[]).every(
        (key) => {
          return key === dimKey || v1[key] === v2[key];
        },
      );
      return v1[dimKey] !== v2[dimKey] && otherDimsMatch;
    });
    spriteState.current.edge = foundEdge || null;
  }, [polytope, spriteDimension]);

  useEffect(() => {
    const animate = () => {
      time.current += 0.002;

      const planeMap: { [key in Plane]: [keyof V4, keyof V4] } = {
        XY: ['x', 'y'],
        YZ: ['y', 'z'],
        XZ: ['x', 'z'],
        XW: ['x', 'w'],
        YW: ['y', 'w'],
        ZW: ['z', 'w'],
      };

      const projectV4toP2 = (v4: V4): ProjectedPoint => {
        const distance = 4;
        const perspective = distance / (distance - v4.w);
        const p3d = {
          x: v4.x * perspective * TESSERACT_SCALE,
          y: v4.y * perspective * TESSERACT_SCALE,
          z: v4.z * perspective * TESSERACT_SCALE,
        };
        const cameraPos: Point3D = {
          x: 0,
          y: 0,
          z: (TESSERACT_SCALE * 5) / zoom.current,
        };
        const forward = V3.normalize(
          V3.subtract({ x: 0, y: 0, z: 0 }, cameraPos),
        );
        const right = V3.normalize(V3.cross({ x: 0, y: 1, z: 0 }, forward));
        const up = V3.normalize(V3.cross(forward, right));
        const v_camera = V3.subtract(p3d, cameraPos);
        const v_transformed = {
          x: V3.dot(v_camera, right),
          y: V3.dot(v_camera, up),
          z: V3.dot(v_camera, forward),
        };
        const p_persp = 600 / (v_transformed.z > 1 ? v_transformed.z : 1);
        return {
          point: { x: v_transformed.x * p_persp, y: v_transformed.y * p_persp },
          depth: v_transformed.z,
          w: v4.w,
        };
      };

      // --- Ghost Polytope for "Glass Layers" effect ---
      const ghostTime = time.current * 0.2;
      let ghostRotated4DVertices = polytope.vertices.map((v) => ({ ...v }));
      const ghostCos = Math.cos(ghostTime);
      const ghostSin = Math.sin(ghostTime);
      ghostRotated4DVertices.forEach((p) => {
        // Apply a slow, constant rotation on a hidden plane (YW)
        const y = p.y;
        const w = p.w;
        p.y = y * ghostCos - w * ghostSin;
        p.w = y * ghostSin + w * ghostCos;
      });
      // Now apply user rotation on top of that
      (Object.keys(planeMap) as Plane[]).forEach((plane) => {
        const angle =
          rotationAngles.current[plane as keyof typeof rotationAngles.current];
        if (angle === 0) return;
        const [aKey, bKey] = planeMap[plane];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ghostRotated4DVertices.forEach((p) => {
          const a = p[aKey];
          const b = p[bKey];
          p[aKey] = a * cos - b * sin;
          p[bKey] = a * sin + b * cos;
        });
      });

      const projectedGhost2D = ghostRotated4DVertices.map((v) =>
        projectV4toP2(v),
      );
      const allGhostLines: ProjectedLine[] = [];
      if (!isSlicing) {
        polytope.edges.forEach((edge, edgeIndex) => {
          const [i, j] = edge;
          const p1 = projectedGhost2D[i].point;
          const p2 = projectedGhost2D[j].point;
          const depth =
            (projectedGhost2D[i].depth + projectedGhost2D[j].depth) / 2;
          allGhostLines.push({
            key: `ghost-line-${edgeIndex}`,
            edgeKey: edgeKey(i, j),
            p1,
            p2,
            color: 'hsl(220 80% 30%)',
            strokeWidth: 0.5,
            depth,
          });
        });
      }

      let rotated4DVertices = polytope.vertices.map((v) => ({ ...v }));
      (Object.keys(planeMap) as Plane[]).forEach((plane) => {
        const angle =
          rotationAngles.current[plane as keyof typeof rotationAngles.current];
        if (angle === 0) return;
        const [aKey, bKey] = planeMap[plane];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        rotated4DVertices.forEach((p) => {
          const a = p[aKey];
          const b = p[bKey];
          p[aKey] = a * cos - b * sin;
          p[bKey] = a * sin + b * cos;
        });
      });

      // --- Key Node ---
      if (trainingStep === 'acquire_key' && !hasSecureKey) {
        const keyNodeBase: Point3D = {
          x: 1.2 * Math.sin(time.current * 0.4),
          y: 0.8 * Math.cos(time.current * 0.6),
          z: 1.2 * Math.cos(time.current * 0.4),
        };
        let keyNodeRotatedV4: V4 = { ...keyNodeBase, w: 0 };
        (Object.keys(planeMap) as Plane[]).forEach((plane) => {
          if (plane.includes('W')) return; // Don't apply W rotation to key
          const angle =
            rotationAngles.current[
              plane as keyof typeof rotationAngles.current
            ];
          if (angle === 0) return;
          const [aKey, bKey] = planeMap[plane];
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const a = keyNodeRotatedV4[aKey];
          const b = keyNodeRotatedV4[bKey];
          keyNodeRotatedV4[aKey] = a * cos - b * sin;
          keyNodeRotatedV4[bKey] = a * sin + b * cos;
        });
        const projectedKeyNode = projectV4toP2(keyNodeRotatedV4);
        setKeyNode({ pos: projectedKeyNode.point, visible: true });
      } else {
        setKeyNode((k) => (k?.visible ? { ...k, visible: false } : null));
      }

      if (isSlicing) {
        const rotatedPolytope: Polytope = {
          vertices: rotated4DVertices,
          edges: polytope.edges,
        };
        const sliced3DPoints = slicePolytope(rotatedPolytope, sliceW);
        const cameraPos: Point3D = {
          x: 0,
          y: 0,
          z: (TESSERACT_SCALE * 5) / zoom.current,
        };
        const forward = V3.normalize(
          V3.subtract({ x: 0, y: 0, z: 0 }, cameraPos),
        );
        const right = V3.normalize(V3.cross({ x: 0, y: 1, z: 0 }, forward));
        const up = V3.normalize(V3.cross(forward, right));
        const projected2Dslice = sliced3DPoints.map((p3d) => {
          const v_camera = V3.subtract(
            {
              x: p3d.x * TESSERACT_SCALE,
              y: p3d.y * TESSERACT_SCALE,
              z: p3d.z * TESSERACT_SCALE,
            },
            cameraPos,
          );
          const v_transformed = {
            x: V3.dot(v_camera, right),
            y: V3.dot(v_camera, up),
            z: V3.dot(v_camera, forward),
          };
          const perspective = 600 / (v_transformed.z > 1 ? v_transformed.z : 1);
          return {
            x: v_transformed.x * perspective,
            y: v_transformed.y * perspective,
          };
        });
        setSlicePoints(projected2Dslice);
        setLines([]);
        setBraidStrokes([]);
        setHalos([]);
        setGhostLines([]);
      } else {
        const allLines: ProjectedLine[] = [];
        const allBraidStrokes: ProjectedBraid[] = [];
        const allHalos: ProjectedHalo[] = [];

        const pkgCount = 3;
        const globalPkgCenters = enableDataPackage
          ? new Array(pkgCount)
              .fill(0)
              .map((_, k) => (time.current * packageSpeed + k / pkgCount) % 1)
          : [];

        let sprite_t: number | null = null;
        let spriteEdgeKey: EdgeKey | null = null;
        if (
          braidEnabled &&
          spriteTraversalEnabled &&
          spriteState.current.edge
        ) {
          sprite_t = (Math.sin(time.current * spriteSpeed * 2) + 1) / 2;
          const [v1_idx, v2_idx] = spriteState.current.edge;
          spriteEdgeKey = edgeKey(v1_idx, v2_idx);
        }

        const projected2D = rotated4DVertices.map((v) => projectV4toP2(v));

        polytope.edges.forEach((edge, edgeIndex) => {
          const [i, j] = edge;
          const p1 = projected2D[i].point;
          const p2 = projected2D[j].point;
          const v1_4d = rotated4DVertices[i];
          const v2_4d = rotated4DVertices[j];
          const wAvg = (projected2D[i].w + projected2D[j].w) / 2;
          const depth = (projected2D[i].depth + projected2D[j].depth) / 2;
          const opacity = Math.max(0.1, 1 - depth / (TESSERACT_SCALE * 8));
          const cellA = tesseractCellId(v1_4d);
          const cellB = tesseractCellId(v2_4d);
          const cellMix = (cellA + cellB) >> 1;
          const edgeKeyStr = edgeKey(i, j);
          const baseColor = edgeColorLock
            ? lockedEdgeColorMap.get(edgeKeyStr)!
            : pickEdgeColor(cellMix, wAvg, theme);

          allLines.push({
            key: `line-${edgeIndex}`,
            edgeKey: edgeKeyStr,
            p1,
            p2,
            color: baseColor,
            strokeWidth: braidEnabled ? 0.75 : 2,
            depth,
          });
          if (braidEnabled) {
            let currentPackageCenters = globalPkgCenters;
            let currentEnableDataPackage = enableDataPackage;
            let currentPackageWidth = packageWidth;

            if (
              spriteEdgeKey &&
              edgeKeyStr === spriteEdgeKey &&
              sprite_t !== null
            ) {
              currentPackageCenters = [sprite_t];
              currentEnableDataPackage = true;
              currentPackageWidth = 0.3;
            }

            const braidPaths = braidPathsForEdge(p1, p2, {
              strands: braidStrands,
              amplitude: braidAmplitude,
              segments: 24,
              phase: time.current * 2,
              sectorSkew: sectorTwist,
              packageCenters: currentPackageCenters,
              packageWidth: currentPackageWidth,
              enableDataPackage: currentEnableDataPackage,
            });
            braidPaths.forEach((pathPoints, s) => {
              allBraidStrokes.push({
                key: `bstroke-${edgeIndex}-${s}`,
                edgeKey: edgeKeyStr,
                d: ribbonPathD(pathPoints),
                stroke: baseColor,
                width: Math.max(1, 0.75 + (0.8 * braidAmplitude) / 12),
                opacity,
                depth,
              });
            });
          }
        });
        if (cellHalo) {
          type Centroid = { sumx: number; sumy: number; count: number };
          const cellAcc: Record<number, Centroid> = {};
          rotated4DVertices.forEach((v4, idx) => {
            const c = tesseractCellId(v4);
            const p = projected2D[idx].point;
            const acc = (cellAcc[c] ??= { sumx: 0, sumy: 0, count: 0 });
            acc.sumx += p.x;
            acc.sumy += p.y;
            acc.count++;
          });
          Object.entries(cellAcc).forEach(([cid, acc]) => {
            if (acc.count === 0) return;
            const cx = acc.sumx / acc.count;
            const cy = acc.sumy / acc.count;
            const r = 120;
            allHalos.push({
              key: `halo-${cid}`,
              cx,
              cy,
              r,
              color: pickCellColor(Number(cid), theme),
              opacity: 0.06,
            });
          });
        }

        setLines(allLines.sort((a, b) => b.depth - a.depth));
        setGhostLines(allGhostLines.sort((a, b) => b.depth - a.depth));
        setBraidStrokes(allBraidStrokes.sort((a, b) => b.depth - a.depth));
        setHalos(allHalos);
        setSlicePoints([]);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [
    polytope,
    theme,
    braidEnabled,
    braidStrands,
    braidAmplitude,
    sectorTwist,
    enableDataPackage,
    packageSpeed,
    packageWidth,
    cellHalo,
    edgeColorLock,
    lockedEdgeColorMap,
    isSlicing,
    sliceW,
    spriteTraversalEnabled,
    spriteSpeed,
    spriteDimension,
    hasSecureKey,
    trainingStep,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleDrag = (
    dx: number,
    dy: number,
    cursor: { x: number; y: number },
  ) => {
    const intents = inferPublicIntents(dx, dy, wMode, keySpec);
    let allowed_3d_move = false;
    for (const intent of intents) {
      const isWplane = intent.plane.includes('W');
      const telemetry = {
        plane: intent.plane,
        cap_id: `rotate_${intent.plane}`,
        result: 'denied',
        timestamp: new Date().toISOString(),
      };

      if (keySpec.allowed.includes(intent.plane)) {
        rotationAngles.current[
          intent.plane as keyof typeof rotationAngles.current
        ] += intent.angle;
        telemetry.result = 'allowed';
        if (isWplane) onTrainingEvent('try_w_granted');
        else allowed_3d_move = true;
      } else {
        if (intent.plane === 'XW') {
          setEffects((prev) => [
            ...prev,
            {
              id: effectIdSeq++,
              type: 'denied',
              x: cursor.x,
              y: cursor.y - 100,
              t0: performance.now(),
            },
          ]);
        }
        if (isWplane) onTrainingEvent('try_w_denied');
      }
      console.log('TesserAct Telemetry:', telemetry);
    }
    if (allowed_3d_move) onTrainingEvent('try_3d');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    handleDrag(dx, dy, { x: e.clientX, y: e.clientY });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    zoom.current = Math.max(0.2, Math.min(5, zoom.current + e.deltaY * -0.001));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    lastCursorRef.current = {
      x: (svgX / rect.width) * 1600 - 800,
      y: (svgY / rect.height) * 1600 - 800,
    };
  };

  const preventDefaults = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDropKeyFile = async (files: FileList) => {
    const f = files?.[0];
    if (!f) return;
    const cursor = lastCursorRef.current ?? { x: 0, y: 0 };
    const deny = (message: string) => {
      console.error('Key import failed:', message);
      setEffects((prev) => [
        ...prev,
        {
          id: effectIdSeq++,
          type: 'denied',
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          t0: performance.now(),
        },
      ]);
      spawnKeycap('KEY', 'locked', cursor);
    };

    if (f.size > MAX_KEY_FILE_SIZE) {
      deny(`File is too large (max ${MAX_KEY_FILE_SIZE / 1024} KB).`);
      return;
    }
    if (f.type && f.type !== 'application/json') {
      deny(`Invalid file type. Please drop a JSON file.`);
      return;
    }

    try {
      const txt = await f.text();
      const key = JSON.parse(txt);
      if (verifyKey(key)) {
        onImportKey();
        setEffects((prev) => [
          ...prev,
          {
            id: effectIdSeq++,
            type: 'granted_ripple',
            x: 0,
            y: 0,
            t0: performance.now(),
          },
        ]);
        spawnKeycap('KEY', 'ok', cursor);
      } else {
        deny('Invalid key signature.');
      }
    } catch {
      deny('Failed to parse key file.');
    }
  };

  const Legend: React.FC = () => {
    if (!showLegend) return null;
    return (
      <div className="absolute bottom-4 left-4 rounded-xl bg-black/60 text-gray-100 p-3 w-72 backdrop-blur-md pointer-events-none">
        {' '}
        <div className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-2">
          Legend
        </div>{' '}
        <ul className="text-sm space-y-1">
          {' '}
          <li>
            <span className="font-semibold">Planes</span>: XY, XZ, YZ
            (baseline).
          </li>{' '}
          <li>
            <span className="font-semibold">Secure Key</span>: Grants access to
            rotate in the encrypted XW-plane.
          </li>{' '}
          <li>
            <span className="font-semibold">Hue/Luma</span>: Encodes knowledge
            domain and temporal state.
          </li>{' '}
        </ul>{' '}
      </div>
    );
  };

  const RenderEffects: React.FC = () => {
    const now = performance.now();
    return (
      <g pointerEvents="none" transform="translate(800 800)">
        {' '}
        {effects.map((e) => {
          const age = now - e.t0;
          const k = Math.min(1, age / EFFECT_LIFETIME_MS);
          const opacity = 0.9 * (1 - k);
          const screenX = e.x - window.innerWidth / 2;
          const screenY = e.y - window.innerHeight / 2;
          if (e.type === 'granted_ripple') {
            const r = 10 + k * 200;
            return (
              <circle
                key={e.id}
                cx={screenX}
                cy={screenY}
                r={r}
                stroke="hsl(140 80% 60%)"
                strokeWidth={5 * (1 - k)}
                fill="none"
                opacity={opacity}
                style={{ mixBlendMode: 'screen' }}
              />
            );
          }
          const jitter = Math.sin(age * 0.05) * 4;
          return (
            <g key={e.id} opacity={opacity} style={{ mixBlendMode: 'screen' }}>
              {' '}
              <rect
                x={screenX - 60 + jitter}
                y={screenY - 16 - jitter}
                width={120}
                height={32}
                fill="hsl(0 90% 55%)"
                rx={4}
              />{' '}
              <text
                x={screenX}
                y={screenY + 4}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight={700}
              >
                {' '}
                ACCESS DENIED{' '}
              </text>{' '}
            </g>
          );
        })}{' '}
      </g>
    );
  };

  const RenderKeycaps: React.FC = () => {
    const now = performance.now();
    return (
      <g pointerEvents="none" style={{ mixBlendMode: 'screen' }}>
        {keycaps.map((k) => {
          const age = now - k.t0;
          const k01 = Math.min(1, age / 900);
          const lift = (1 - Math.pow(1 - k01, 3)) * 8;
          const op = 1 - k01 * k01;
          const fill =
            k.tone === 'ok'
              ? 'hsl(145 80% 55%)'
              : k.tone === 'locked'
                ? 'hsl(10 85% 55%)'
                : 'hsl(210 60% 60%)';
          return (
            <g
              key={k.id}
              opacity={op}
              transform={`translate(${k.x},${k.y - lift})`}
            >
              <rect
                x={-16}
                y={-14}
                width={32}
                height={24}
                rx={6}
                fill={fill}
                opacity={0.8}
              />
              <text
                x={0}
                y={2}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight={700}
              >
                {k.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div
      className={`relative w-full h-full bg-transparent flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onPointerMove={onPointerMove}
      onDragEnter={preventDefaults}
      onDragOver={preventDefaults}
      onDrop={(e) => {
        preventDefaults(e);
        onDropKeyFile(e.dataTransfer.files);
      }}
      role="application"
      aria-label="An animation of a rotating 4D polytope."
    >
      <svg width="100%" height="100%" viewBox="-800 -800 1600 1600">
        <defs>
          <filter
            id="bloom"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="s1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="s2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="s3" />
            <feMerge>
              <feMergeNode in="s1" />
              <feMergeNode in="s2" />
              <feMergeNode in="s3" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopOpacity="0" />
            <stop offset="100%" stopOpacity="0.45" />
          </radialGradient>
        </defs>

        <rect
          x="-800"
          y="-800"
          width="1600"
          height="1600"
          fill="url(#vignette)"
          pointerEvents="none"
        />

        <g
          filter={
            glowEnabled && bloomStrength > 0.01 ? 'url(#bloom)' : undefined
          }
        >
          <OcclusionVeils />
        </g>

        <g opacity={0.2} style={{ filter: 'blur(1px)' }}>
          {ghostLines.map(({ key, p1, p2, color, strokeWidth }) => (
            <line
              key={key}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        <g>
          {cellHalo &&
            halos.map((h) => (
              <circle
                key={h.key}
                cx={h.cx}
                cy={h.cy}
                r={120 + 140 * haloStrength}
                fill="url(#haloGrad)"
                opacity={0.18 * haloStrength}
                style={{ mixBlendMode: 'screen' }}
              />
            ))}
        </g>

        <g
          filter={
            glowEnabled && bloomStrength > 0.01 ? 'url(#bloom)' : undefined
          }
        >
          {braidStrokes.map((bs) => {
            const simple =
              !glowEnabled || (braidStrokes.length > 800 && zoom.current < 0.9);
            return simple ? (
              <path
                key={bs.key}
                d={bs.d}
                fill="none"
                stroke={bs.stroke}
                strokeWidth={bs.width}
                strokeLinecap="round"
                opacity={bs.opacity}
              />
            ) : (
              <GlowStroke
                key={bs.key}
                d={bs.d}
                color={bs.stroke!}
                core={bs.width!}
                glow={bs.width! * 6 * (0.5 + bloomStrength)}
                opacity={bs.opacity}
                blendMode={screenBlend}
              />
            );
          })}
        </g>

        <g
          filter={
            glowEnabled && bloomStrength > 0.01 ? 'url(#bloom)' : undefined
          }
        >
          {lines.map(({ key, p1, p2, color, strokeWidth, depth }) => {
            const o = Math.max(0.15, 1 - depth / (TESSERACT_SCALE * 8));
            const simple =
              !glowEnabled || (lines.length > 500 && zoom.current < 0.9);
            return simple ? (
              <line
                key={key}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={o}
              />
            ) : (
              <GlowLine
                key={key}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                color={color}
                core={strokeWidth}
                glow={strokeWidth * 6 * (0.5 + bloomStrength)}
                opacity={o}
                blendMode={screenBlend}
              />
            );
          })}
        </g>

        <g filter={glowEnabled ? 'url(#bloom)' : undefined}>
          {slicePoints.map((p, i) => (
            <circle key={`slice-pt-${i}`} cx={p.x} cy={p.y} r="3" fill="cyan" />
          ))}
        </g>

        {keyNode && (
          <g
            transform={`translate(${keyNode.pos.x}, ${keyNode.pos.y})`}
            onClick={onImportKey}
            className="cursor-pointer"
            style={{
              transition: 'opacity 0.3s',
              opacity: keyNode.visible ? 1 : 0,
            }}
          >
            <defs>
              <filter id="keyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle r={20} fill="hsl(50 100% 50% / 0.2)" />
            <circle r={14} fill="hsl(50 100% 50% / 0.3)" />
            <g filter="url(#keyGlow)">
              <text
                fontSize="24"
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(50 100% 70%)"
              >
                🔑
              </text>
            </g>
          </g>
        )}

        <RenderEffects />
        <RenderKeycaps />
      </svg>
      {showWBadge && lastCursorRef.current && (
        <div
          className="pointer-events-none absolute text-xs font-bold text-emerald-300 bg-black/50 px-1.5 py-0.5 rounded"
          style={{
            left: `calc(50% + ${lastCursorRef.current.x}px)`,
            top: `calc(50% + ${lastCursorRef.current.y}px)`,
            transform: 'translate(10px, -20px)',
          }}
        >
          W
        </div>
      )}
      <Legend />
    </div>
  );
};

export default HypercubeViewer;
