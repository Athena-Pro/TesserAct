export const MAX_KEY_FILE_SIZE = 64 * 1024; // 64 KB

/**
 * Verifies a dropped key file.
 * For the demo, this is a very simple check.
 * @param key The parsed JSON object from the file.
 * @returns True if the key is valid, false otherwise.
 */
export function verifyKey(key: any): boolean {
  if (typeof key !== 'object' || key === null) {
    return false;
  }
  return key.signature === 'valid-training-key';
}
