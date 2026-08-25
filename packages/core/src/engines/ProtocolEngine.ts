import type { Intent, Protocol, ProtocolExecution, ProtocolMatch, ProtocolStep, RecoveryWindow } from "../types/protocol";
import type { StateVector } from "../types/state";
import { ProtocolSchema, IntentSchema } from "../types/protocol";

export class ProtocolEngine {
  match(intent: Intent, current: StateVector, protocols: Protocol[]): ProtocolMatch {
    const validIntent = IntentSchema.parse(intent);
    let best: ProtocolMatch | undefined;
    for (const candidate of protocols) {
      const protocol = ProtocolSchema.parse(candidate);
      const targetScore = protocol.targetDimensions.reduce((sum, dimension) => {
        const currentValue = current[dimension as keyof StateVector] ?? 0;
        const requiredValue = validIntent.requiredState[dimension as keyof StateVector] ?? 0;
        return sum + Math.max(0, requiredValue - currentValue);
      }, 0);
      const thresholdScore = Object.entries(protocol.minimumState).reduce((sum, [dimension, threshold]) => {
        const value = current[dimension as keyof StateVector] ?? 0;
        return sum + Math.max(0, threshold - value);
      }, 0);
      const score = Math.max(0, 1 - (targetScore + thresholdScore) / Math.max(1, protocol.targetDimensions.length));
      const match: ProtocolMatch = {
        protocol,
        score,
        rationale: [`Targets ${protocol.targetDimensions.length} state dimensions.`, `Match score: ${score.toFixed(2)}.`],
      };
      if (!best || match.score > best.score) best = match;
    }
    if (!best) throw new Error("No protocol is available for the requested intent.");
    return best;
  }

  sequence(protocol: Protocol): ProtocolStep[] {
    const valid = ProtocolSchema.parse(protocol);
    return [...valid.steps].sort((a, b) => a.id.localeCompare(b.id));
  }

  execute(protocol: Protocol, completedStepIds: string[], recoveryWindow?: RecoveryWindow): ProtocolExecution {
    const valid = ProtocolSchema.parse(protocol);
    const allowed = new Set(valid.steps.map((step) => step.id));
    const completed = completedStepIds.filter((id) => allowed.has(id));
    const recovery = recoveryWindow ? { ...recoveryWindow } : undefined;
    const allStepsComplete = completed.length === valid.steps.length;
    return {
      protocolId: valid.id,
      completedStepIds: completed,
      ...(recovery ? { recoveryWindow: recovery } : {}),
      completed: allStepsComplete && (!recovery || recovery.completed),
    };
  }

  recoveryWindow(durationSeconds: number, reason: string): RecoveryWindow {
    if (!Number.isInteger(durationSeconds) || durationSeconds < 30 || durationSeconds > 3600) {
      throw new Error("RecoveryWindow duration must be between 30 and 3600 seconds.");
    }
    return { id: `recovery-${Date.now()}`, durationSeconds, reason: reason.trim(), completed: false };
  }
}
