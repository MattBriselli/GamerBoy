/**
 * Mulberry32 deterministic 32-bit PRNG.
 * Produces repeatable sequences across iOS, Android, and Web.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Formats a Date object as local YYYY-MM-DD.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deterministically hashes a YYYY-MM-DD date string (+ draw mode) into a 32-bit seed
 * using FNV-1a so every player gets the exact same Daily Challenge deal.
 */
export function dateToSeed(dateStr: string, salt: string = 'gamerboy-klondike'): number {
  const input = `${salt}:${dateStr}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) || 1;
}

/**
 * Generates a fresh random 32-bit unsigned seed.
 */
export function randomSeed(): number {
  return ((Math.random() * 0xffffffff) >>> 0) || 1;
}

/**
 * Deterministic Fisher-Yates shuffle using Mulberry32.
 */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const rand = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}
