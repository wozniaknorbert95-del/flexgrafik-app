/**
 * UUID Generator
 *
 * Simple UUID v4 generator for client-side use.
 * For production, consider using a library like 'uuid' or 'crypto.randomUUID()'
 */

/**
 * Generate a UUID v4 (random)
 *
 * @returns UUID string in format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: manual generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a simple ID (timestamp-based, not UUID)
 * Useful for temporary IDs or when UUID is not needed
 *
 * @returns ID string: id_timestamp_random
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
