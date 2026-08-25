import { z } from "zod";
import type { StateVector } from "./state";

export const ProtocolStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  instruction: z.string().trim().min(1).max(1000),
  durationSeconds: z.number().int().min(0).max(3600),
  kind: z.enum(["practice", "recovery", "reflection"]),
});

export const ProtocolSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(300),
  targetDimensions: z.array(z.string()).min(1),
  minimumState: z.record(z.string(), z.number().min(0).max(1)).default({}),
  steps: z.array(ProtocolStepSchema).min(1).max(20),
});

export const IntentSchema = z.object({
  objective: z.string().trim().min(1).max(300),
  requiredState: z.custom<StateVector>((value) => StateVectorSchema.safeParse(value).success),
});

export const RecoveryWindowSchema = z.object({
  id: z.string().min(1),
  durationSeconds: z.number().int().min(30).max(3600),
  reason: z.string().trim().min(1).max(300),
  completed: z.boolean().default(false),
});

export type ProtocolStep = z.infer<typeof ProtocolStepSchema>;
export type Protocol = z.infer<typeof ProtocolSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type RecoveryWindow = z.infer<typeof RecoveryWindowSchema>;

export interface ProtocolMatch { protocol: Protocol; score: number; rationale: string[] }
export interface ProtocolExecution { protocolId: string; completedStepIds: string[]; recoveryWindow?: RecoveryWindow; completed: boolean }

// Local import is kept after schemas so the public type remains canonical.
import { StateVectorSchema } from "./state";
