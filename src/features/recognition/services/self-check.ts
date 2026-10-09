export interface SelfCheck {
  /** Parameters of the synthetic input (see selfCheckInput). */
  input: { a: number; b: number; k: number };
  /** The model's CPU output for that input, measured when it was trained. */
  probabilities: readonly number[];
  /** Largest allowed difference per probability; delegates compute in lower precision. */
  tolerance: number;
}

/**
 * The fixed synthetic image of the model self-check: pixel (x, y, channel c) = ((x*a + y*b) * (c+1) + k) mod 256,
 * as float32 RGB NHWC. Integer arithmetic, so it matches `self_check_input` in ml/train.py exactly.
 */
export function selfCheckInput(size: number, { a, b, k }: SelfCheck['input']): Float32Array {
  const tensor = new Float32Array(size * size * 3);
  for (let y = 0, i = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      for (let c = 0; c < 3; c += 1, i += 1) tensor[i] = ((x * a + y * b) * (c + 1) + k) % 256;
    }
  }
  return tensor;
}

/** Why `scores` disagrees with the self-check's reference output, or null if it matches. */
export function selfCheckMismatch(scores: ArrayLike<number>, check: SelfCheck): string | null {
  const expected = check.probabilities;
  if (scores.length !== expected.length) return `${scores.length} outputs, expected ${expected.length}`;
  let worst = 0, top = 0, expectedTop = 0;
  for (let i = 0; i < expected.length; i += 1) {
    const difference = Math.abs(scores[i] - expected[i]);
    if (!(difference <= check.tolerance)) worst = Math.max(worst, Number.isNaN(difference) ? Infinity : difference);
    if (scores[i] > scores[top]) top = i;
    if (expected[i] > expected[expectedTop]) expectedTop = i;
  }
  if (worst > 0) return `a probability is off by ${worst.toFixed(3)} (tolerance ${check.tolerance})`;
  if (top !== expectedTop) return `top class ${top}, expected ${expectedTop}`;
  return null;
}
