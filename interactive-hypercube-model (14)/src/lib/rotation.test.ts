import { describe, it, expect } from 'vitest';
import { inferPublicIntents } from './rotation';
import { TRAINING_W_ONLY, NO_KEY } from './security';

describe('inferPublicIntents', () => {
  it('should generate XY and YZ intents for a standard drag', () => {
    const intents = inferPublicIntents(10, -10, false, NO_KEY);
    expect(intents.some((i) => i.plane === 'XY')).toBe(true);
    expect(intents.some((i) => i.plane === 'YZ')).toBe(true);
  });

  it('should not generate any W intents in non-W mode', () => {
    const intents = inferPublicIntents(10, 10, false, TRAINING_W_ONLY);
    expect(intents.some((i) => i.plane.includes('W'))).toBe(false);
  });

  it('should not generate any W intents if no W planes are public', () => {
    const spec = { ...NO_KEY, publicPlanes: ['XY', 'YZ'] };
    const intents = inferPublicIntents(10, 10, true, spec);
    expect(intents.length).toBe(0);
  });

  it('should map ANY W-mode drag to XW if its the only public W plane', () => {
    // Horizontal drag
    let intents = inferPublicIntents(20, 5, true, TRAINING_W_ONLY);
    expect(intents.length).toBe(1);
    expect(intents[0].plane).toBe('XW');

    // Vertical drag
    intents = inferPublicIntents(5, 20, true, TRAINING_W_ONLY);
    expect(intents.length).toBe(1);
    expect(intents[0].plane).toBe('XW');

    // Diagonal drag
    intents = inferPublicIntents(-15, -15, true, TRAINING_W_ONLY);
    expect(intents.length).toBe(1);
    expect(intents[0].plane).toBe('XW');
  });

  it('should generate an XW intent for horizontal drag in W-mode when multiple W planes are public', () => {
    const spec = { ...TRAINING_W_ONLY, publicPlanes: ['XW', 'YW', 'ZW'] };
    const intents = inferPublicIntents(20, 5, true, spec);
    expect(intents.length).toBe(1);
    expect(intents[0].plane).toBe('XW');
  });
});
