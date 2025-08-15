
// --- Type Definitions ---
export interface V4 { x: number; y: number; z: number; w: number; }
export type Edge = [number, number];
export interface Polytope {
  vertices: V4[];
  edges: Edge[];
  description?: string;
}
export interface Point3D { x: number; y: number; z: number; }

// --- Tesseract (8-cell) ---
const TESSERACT_VERTICES: V4[] = [];
for (let i = 0; i < 16; i++) {
  TESSERACT_VERTICES.push({
    x: (i & 8) ? 1 : -1,
    y: (i & 4) ? 1 : -1,
    z: (i & 2) ? 1 : -1,
    w: (i & 1) ? 1 : -1,
  });
}
const TESSERACT_EDGES: Edge[] = [];
for (let i = 0; i < 16; i++) {
  for (let j = i + 1; j < 16; j++) {
    const diff = i ^ j;
    if ((diff & (diff - 1)) === 0) { // Check if Hamming distance is 1
      TESSERACT_EDGES.push([i, j]);
    }
  }
}
const TESSERACT_BASE: Polytope = {
  vertices: TESSERACT_VERTICES,
  edges: TESSERACT_EDGES,
};

// --- 16-Cell (Hexadecachoron) ---
const SIXTEEN_CELL_VERTICES: V4[] = [
  { x: 1, y: 0, z: 0, w: 0 }, { x: -1, y: 0, z: 0, w: 0 },
  { x: 0, y: 1, z: 0, w: 0 }, { x: 0, y: -1, z: 0, w: 0 },
  { x: 0, y: 0, z: 1, w: 0 }, { x: 0, y: 0, z: -1, w: 0 },
  { x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 0, z: 0, w: -1 },
];
const SIXTEEN_CELL_EDGES: Edge[] = [];
for (let i = 0; i < 8; i++) {
  for (let j = i + 1; j < 8; j++) {
    const v1 = SIXTEEN_CELL_VERTICES[i];
    const v2 = SIXTEEN_CELL_VERTICES[j];
    if (v1.x !== -v2.x || v1.y !== -v2.y || v1.z !== -v2.z || v1.w !== -v2.w) {
      SIXTEEN_CELL_EDGES.push([i, j]);
    }
  }
}
const SIXTEEN_CELL_BASE: Polytope = {
  vertices: SIXTEEN_CELL_VERTICES,
  edges: SIXTEEN_CELL_EDGES,
};

// --- Slicing Function ---
export function slicePolytope(polytope: Polytope, w_slice: number): Point3D[] {
  const intersectionPoints: Point3D[] = [];

  for (const edge of polytope.edges) {
    const v1 = polytope.vertices[edge[0]];
    const v2 = polytope.vertices[edge[1]];

    // Check if the edge crosses the slicing plane (w = w_slice)
    if ((v1.w < w_slice && v2.w > w_slice) || (v2.w < w_slice && v1.w > w_slice)) {
      // Linear interpolation to find the exact intersection point
      const t = (w_slice - v1.w) / (v2.w - v1.w);
      const x = v1.x + t * (v2.x - v1.x);
      const y = v1.y + t * (v2.y - v1.y);
      const z = v1.z + t * (v2.z - v1.z);
      intersectionPoints.push({ x, y, z });
    }
  }
  // Future enhancement: Add logic to connect these points into edges/faces.
  return intersectionPoints;
}

// --- Exports ---
export const polytopes = {
  Tesseract: {
    ...TESSERACT_BASE,
    description: 'TesserAct (4D hypercube). In this model, vertices are baton states; edges are valid handoffs across domains.',
  },
  '16-Cell': {
    ...SIXTEEN_CELL_BASE,
    description: '16-Cell (4D cross-polytope). Highlights alternate adjacencies; useful for contrasting sector couplings.',
  }
};

export type ShapeName = keyof typeof polytopes;
export const shapeNames = Object.keys(polytopes) as ShapeName[];

export function tesseractCellId(v: V4): number {
  const sx = v.x >= 0 ? 1 : 0;
  const sy = v.y >= 0 ? 1 : 0;
  const sz = v.z >= 0 ? 1 : 0;
  const sw = v.w >= 0 ? 1 : 0;
  return (sw << 2) | (sx ^ sy ^ sz);
}

export function wLuma(w: number, wMax = 2.0) {
  const t = Math.max(0, Math.min(1, (w + wMax) / (2 * wMax)));
  return 0.4 + 0.6 * Math.pow(t, 0.7);
}