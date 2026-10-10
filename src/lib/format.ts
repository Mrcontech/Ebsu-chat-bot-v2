/**
 * Scores are shown rounded DOWN to two decimals, so a score of 0.316 shows as
 * 0.31 and never looks as if it reached a threshold of 0.32 that it missed.
 */
export function formatScore(score: number): string {
  return (Math.floor(score * 100 + 1e-9) / 100).toFixed(2);
}
