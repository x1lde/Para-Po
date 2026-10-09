export interface LabelScore {
  label: string;
  confidence: number;
}

export type ScoreDecision =
  | { kind: 'recognized'; top: LabelScore; candidates: LabelScore[] }
  | { kind: 'uncertain'; candidates: LabelScore[] }
  | { kind: 'not-a-landmark'; confidence: number; candidates: LabelScore[] };

const MAX_CANDIDATES = 3;

/**
 * Turn model probabilities into a decision. `candidates` never includes the not-a-landmark class,
 * so it can always be offered as "which landmark are you closest to?" choices.
 */
export function interpretScores(
  scores: ArrayLike<number>,
  labels: readonly string[],
  threshold: number,
  notALandmarkLabel: string
): ScoreDecision {
  if (scores.length !== labels.length) {
    throw new Error(`Model returned ${scores.length} scores for ${labels.length} labels.`);
  }
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('Confidence threshold must be between 0 and 1.');
  }
  for (let index = 0; index < scores.length; index += 1) {
    if (!Number.isFinite(scores[index]) || scores[index] < 0 || scores[index] > 1) {
      throw new Error('Model returned invalid probability scores.');
    }
  }
  const ranked: LabelScore[] = labels
    .map((label, index) => ({ label, confidence: scores[index] }))
    .sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label));
  if (ranked.length === 0) throw new Error('Model returned no finite scores.');

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
