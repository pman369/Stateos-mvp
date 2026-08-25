import { z } from "zod";

export const StateDimensionSchema = z.enum(["attention", "clarity", "energy", "presence", "intentionality", "recovery", "adaptability"]);
export const StateVectorSchema = z.object({
  attention: z.number().min(0).max(1), clarity: z.number().min(0).max(1), energy: z.number().min(0).max(1),
  presence: z.number().min(0).max(1), intentionality: z.number().min(0).max(1), recovery: z.number().min(0).max(1), adaptability: z.number().min(0).max(1),
});
export const StateSnapshotSchema = z.object({ id: z.string().min(1), capturedAt: z.string().datetime(), vector: StateVectorSchema, context: z.string().trim().min(1).max(500) });
export type StateDimension = z.infer<typeof StateDimensionSchema>;
export type StateVector = z.infer<typeof StateVectorSchema>;
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;
export type StateDelta = Record<StateDimension, number>;
export interface StateAssessment { vector: StateVector; mean: number; strongest: StateDimension; weakest: StateDimension; }
export interface TransitionAssessment {
  delta: StateDelta;
  euclideanDistance: number;
  meanAbsoluteDelta: number;
  capacityChange: number;
  direction: "improved" | "declined" | "stable";
}
