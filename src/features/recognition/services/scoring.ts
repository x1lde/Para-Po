export interface LabelScore {
  label: string;
  confidence: number;
}

export type ScoreDecision =
  | { kind: 'recognized'; top: LabelScore; candidates: LabelScore[] }
  | { kind: 'uncertain'; candidates: LabelScore[] }
  | { kind: 'not-a-landmark'; confidence: number; candidates: LabelScore[] };

const MAX_CANDIDATES = 3;
// Softmax rows sum to 1; GPU/Core ML delegates computing in fp16 drift by ~1e-3. Anything further off
// (wrong dtype, wrong output tensor, corrupted model) is not a probability vector and must not be trusted.
const PROBABILITY_TOLERANCE = 0.05;

/** Throws unless `scores` is one probability per label: finite, within 0-1, summing to 1. */
export function assertValidScores(scores: ArrayLike<number>, labelCount: number): void {
  if (scores.length !== labelCount) {
    throw new Error(`Model returned ${scores.length} scores for ${labelCount} labels.`);
  }
  let sum = 0;
  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i];
    if (!Number.isFinite(score)) throw new Error(`Model returned a non-finite score (${score}).`);
    if (score < -PROBABILITY_TOLERANCE || score > 1 + PROBABILITY_TOLERANCE) {
      throw new Error(`Model returned ${score}, which is not a probability.`);
    }
    sum += score;
  }
  if (Math.abs(sum - 1) > PROBABILITY_TOLERANCE) throw new Error(`Model scores sum to ${sum}, not 1.`);
}

/**
 * Turn model probabilities into a decision. `candidates` never includes the not-a-landmark class,
 * so it can always be offered as "which landmark are you closest to?" choices.
 * Throws on output that is not a valid probability vector (see `assertValidScores`).
 */
export function interpretScores(
  scores: ArrayLike<number>,
  labels: readonly string[],
  threshold: number,
  notALandmarkLabel: string
): ScoreDecision {
  assertValidScores(scores, labels.length);
  const ranked: LabelScore[] = labels
    .map((label, index) => ({ label, confidence: scores[index] }))
    .sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label));

  const candidates = ranked.filter((score) => score.label !== notALandmarkLabel).slice(0, MAX_CANDIDATES);
  const top = ranked[0];
  if (top.confidence >= threshold) {
    return top.label === notALandmarkLabel
      ? { kind: 'not-a-landmark', confidence: top.confidence, candidates }
      : { kind: 'recognized', top, candidates };
  }
  return { kind: 'uncertain', candidates };
}

/** Every model label except the not-a-landmark class must map to exactly one landmark, and back. */
export function findLabelMismatches(
  modelLabels: readonly string[],
  landmarkLabels: readonly (string | null)[],
  notALandmarkLabel: string
): { missingLandmarks: string[]; unknownToModel: string[] } {
  const model = new Set(modelLabels.filter((label) => label !== notALandmarkLabel));
  const dataset = new Set(landmarkLabels.filter((label): label is string => label !== null));
  return {
    missingLandmarks: [...model].filter((label) => !dataset.has(label)).sort(),
    unknownToModel: [...dataset].filter((label) => !model.has(label)).sort(),
  };
}
