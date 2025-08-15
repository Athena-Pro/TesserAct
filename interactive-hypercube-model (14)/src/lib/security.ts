export type Plane = 'XY'|'XZ'|'YZ'|'XW'|'YW'|'ZW' | string;

export interface DimensionalKeySpec {
  id: string;
  allowed: Plane[];
  publicPlanes: Plane[];
  lockMode?: 'block'|'clamp'|'ghost';
  concealHidden?: boolean;
}

// Default key for training: Allows standard 3D rotations, makes XW public but not allowed.
export const NO_KEY: DimensionalKeySpec = { 
  id: 'no-key-training',
  allowed: ['XY','XZ','YZ'],
  publicPlanes: ['XY','XZ','YZ','XW'],
  lockMode: 'clamp',
  concealHidden: true,
};

// Public training key: W-only unlock path after acquiring the key.
export const TRAINING_W_ONLY: DimensionalKeySpec = {
  id: 'training-w-only',
  allowed: ['XY','XZ','YZ','XW'],
  publicPlanes: ['XY','XZ','YZ','XW'],
  lockMode: 'clamp',
  concealHidden: true
};

// Internal (staff) example: unlock more planes but *don’t* show them in the UI.
export const INTERNAL_W_PLUS: DimensionalKeySpec = {
  id: 'internal-w-plus',
  allowed: ['XY','XZ','YZ','XW','YW','ZW'],
  publicPlanes: ['XY','XZ','YZ','XW'],  // UI still only shows these
  lockMode: 'clamp',
  concealHidden: true
};
