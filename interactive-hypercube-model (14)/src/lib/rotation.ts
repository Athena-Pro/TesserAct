import { DimensionalKeySpec, Plane } from './security';

const ROT_K = 0.005;

/**
 * Map a drag (dx,dy) into rotation intents, respecting *public* planes.
 * If only XW is public among W-planes, *force* all W-mode drags to XW.
 */
export function inferPublicIntents(dx:number, dy:number, wMode:boolean, keySpec:DimensionalKeySpec): { plane: Plane; angle: number }[] {
  const pub = keySpec.publicPlanes;
  if (!wMode) {
    const out: {plane:Plane; angle:number}[] = [];
    if (pub.includes('XY') && dx) out.push({ plane:'XY', angle: dx*ROT_K });
    if (pub.includes('YZ') && dy) out.push({ plane:'YZ', angle: dy*ROT_K });
    if (pub.includes('XZ') && Math.abs(dx)>0 && Math.abs(dy)>0) {
      out.push({ plane:'XZ', angle: 0.2*(dx+dy)*ROT_K });
    }
    return out;
  }

  const wPublic = ['XW','YW','ZW'].filter(p => pub.includes(p));
  if (wPublic.length === 0) return [];
  if (wPublic.length === 1 && wPublic[0] === 'XW') {
    const mag = Math.hypot(dx, dy);
    const sign = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx || 0.0001) : Math.sign(dy || 0.0001);
    return [{ plane:'XW', angle: sign * mag * ROT_K }];
  }

  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax > ay * 1.2 && wPublic.includes('XW')) return [{ plane:'XW', angle: dx*ROT_K }];
  if (ay > ax * 1.2 && wPublic.includes('YW')) return [{ plane:'YW', angle: dy*ROT_K }];
  if (wPublic.includes('ZW')) {
    const s = (dx*dy)>=0 ? 1 : -1;
    return [{ plane:'ZW', angle: s * Math.hypot(dx,dy) * ROT_K * 0.7 }];
  }
  return [{ plane:wPublic[0], angle: (Math.hypot(dx,dy) * ROT_K) * (dx>=0?1:-1) }];
}
