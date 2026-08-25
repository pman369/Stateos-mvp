import type { StateSnapshot, StateVector } from "../types/state";

export interface Reflection { sessionId: string; note: string; effectiveness: number; observedAt: string }
export interface LearningPattern { dimension: keyof StateVector; occurrences: number; averageDelta: number; confidence: number }
export interface Baseline { vector: StateVector; sampleCount: number; updatedAt: string }

export class LearningEngine {
  aggregate(reflections: Reflection[]): { count: number; meanEffectiveness: number } {
    if (reflections.length === 0) return { count: 0, meanEffectiveness: 0 };
    const meanEffectiveness = reflections.reduce((sum, item) => sum + item.effectiveness, 0) / reflections.length;
    return { count: reflections.length, meanEffectiveness };
  }

  trackPatterns(snapshots: StateSnapshot[]): LearningPattern[] {
    if (snapshots.length < 2) return [];
    const dimensions: (keyof StateVector)[] = ["attention", "clarity", "energy", "presence", "intentionality", "recovery", "adaptability"];
    return dimensions.map((dimension) => {
      const deltas = snapshots.slice(1).map((current, index) => current.vector[dimension] - snapshots[index]!.vector[dimension]);
      const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
      const occurrences = deltas.filter((value) => Math.abs(value) >= 0.05).length;
      return { dimension, occurrences, averageDelta, confidence: Math.min(1, snapshots.length / 10) };
    });
  }

  adaptBaseline(baseline: Baseline, observed: StateVector, learningRate = 0.2): Baseline {
    if (learningRate <= 0 || learningRate > 1) throw new Error("learningRate must be > 0 and <= 1.");
    const keys: (keyof StateVector)[] = ["attention", "clarity", "energy", "presence", "intentionality", "recovery", "adaptability"];
    const vector = Object.fromEntries(keys.map((key) => [key, Number((baseline.vector[key] + (observed[key] - baseline.vector[key]) * learningRate).toFixed(4))])) as StateVector;
    return { vector, sampleCount: baseline.sampleCount + 1, updatedAt: new Date().toISOString() };
  }
}
