import { describe, it, expect } from 'vitest';
import { verifyKey } from './keyVerification';

describe('verifyKey', () => {
  it('should return true for a valid key object', () => {
    const validKey = { signature: 'valid-training-key' };
    expect(verifyKey(validKey)).toBe(true);
  });

  it('should return false for an object with an invalid signature', () => {
    const invalidKey = { signature: 'invalid' };
    expect(verifyKey(invalidKey)).toBe(false);
  });

  it('should return false for an object without a signature', () => {
    const malformedKey = { foo: 'bar' };
    expect(verifyKey(malformedKey)).toBe(false);
  });

  it('should return false for non-object inputs', () => {
    expect(verifyKey(null)).toBe(false);
    expect(verifyKey(undefined)).toBe(false);
    expect(verifyKey('a string')).toBe(false);
    expect(verifyKey(123)).toBe(false);
  });
});
