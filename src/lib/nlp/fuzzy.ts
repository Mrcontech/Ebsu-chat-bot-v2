/**
 * Fuzzy (approximate) string matching. Two measures are used:
 *
 * 1. Damerau-Levenshtein edit distance: how many single-letter insertions,
 *    deletions, substitutions or swaps turn one word into another
 *    ("transcrip" -> "transcript" is 1 edit). Used to correct typos.
 * 2. Character trigram (3-letter chunk) overlap, measured with the Dice
 *    coefficient. Used as a second, spelling-tolerant similarity score
 *    between a whole message and a whole stored question.
 */

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent swaps). */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1); // swap of two neighbouring letters
      }
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; // early exit: already too different
  }
  return d[a.length][b.length];
}

/** How many typos we tolerate for a word of this length. */
export function allowedEdits(length: number): number {
  if (length <= 3) return 0; // short words ("fee", "dey") are too easy to confuse
  if (length <= 7) return 1; // "reslt" -> "result", but not "sports" -> "scores"
  return 2; // long words: "trancsript" -> "transcript"
}

/** Character trigrams of a string, padded so word starts and ends count. */
export function trigrams(text: string): Map<string, number> {
  const grams = new Map<string, number>();
  const padded = `  ${text} `;
  for (let i = 0; i < padded.length - 2; i++) {
    const g = padded.slice(i, i + 3);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return grams;
}

/** Dice coefficient between two trigram bags: 2|A n B| / (|A| + |B|), from 0 to 1. */
export function diceSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let sizeA = 0;
  let sizeB = 0;
  let overlap = 0;
  for (const n of a.values()) sizeA += n;
  for (const n of b.values()) sizeB += n;
  if (sizeA === 0 || sizeB === 0) return 0;
  for (const [g, n] of a) {
    const m = b.get(g);
    if (m) overlap += Math.min(n, m);
  }
  return (2 * overlap) / (sizeA + sizeB);
}
