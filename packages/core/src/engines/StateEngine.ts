import type { StateAssessment, StateDelta, StateSnapshot, StateVector, TransitionAssessment } from "../types/state";
import { StateSnapshotSchema, StateVectorSchema } from "../types/state";

const DIMENSIONS = ["attention", "clarity", "energy", "presence", "intentionality", "recovery", "adaptability"] as const;
type Dimension = (typeof DIMENSIONS)[number];

export class StateEngine {
  assess(vector: StateVector): StateAssessment {
    const valid = StateVectorSchema.parse(vector);
    const entries = DIMENSIONS.map((dimension) => [dimension, valid[dimension]] as const);
    const mean = entries.reduce((sum, [, value]) => sum + value, 0) / DIMENSIONS.length;
    const strongest = entries.reduce((best, current) => current[1] > best[1] ? current : best)[0] as Dimension;
    const weakest = entries.reduce((worst, current) => current[1] < worst[1] ? current : worst)[0] as Dimension;
    return { vector: valid, mean, strongest, weakest };
  }

  snapshot(snapshot: StateSnapshot): StateSnapshot {
    return StateSnapshotSchema.parse(snapshot);
  }

  delta(before: StateVector, after: StateVector): StateDelta {
    const a = StateVectorSchema.parse(before);
    const b = StateVectorSchema.parse(after);
    return Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, Number((b[dimension] - a[dimension]).toFixed(4))]));
  }

  transition(before: StateVector, after: StateVector): TransitionAssessment {
    const delta = this.delta(before, after);
    const values = Object.values(delta);
    const magnitude = values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;
    const net = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { delta, magnitude, direction: net > 0.02 ? "improved" : net < -0.02 ? "declined" : "stable" };
  }
}
