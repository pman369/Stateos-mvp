import { z } from "zod";
import { LearningEngine, ProtocolEngine, StateEngine, type Reflection } from "@stateos/core";
import type { Intent, Protocol, RecoveryWindow } from "@stateos/core";

const SessionRequestSchema = z.object({
  action: z.enum(["observe", "interpret", "intent", "select", "execute", "reassess", "reflect", "adapt"]),
  sessionId: z.string().min(1),
  currentState: z.object({ attention: z.number().min(0).max(1), clarity: z.number().min(0).max(1), energy: z.number().min(0).max(1), presence: z.number().min(0).max(1), intentionality: z.number().min(0).max(1), recovery: z.number().min(0).max(1), adaptability: z.number().min(0).max(1) }),
  requiredState: z.object({ attention: z.number().min(0).max(1), clarity: z.number().min(0).max(1), energy: z.number().min(0).max(1), presence: z.number().min(0).max(1), intentionality: z.number().min(0).max(1), recovery: z.number().min(0).max(1), adaptability: z.number().min(0).max(1) }).optional(),
  objective: z.string().trim().min(1).max(300).optional(),
  afterState: z.object({ attention: z.number().min(0).max(1), clarity: z.number().min(0).max(1), energy: z.number().min(0).max(1), presence: z.number().min(0).max(1), intentionality: z.number().min(0).max(1), recovery: z.number().min(0).max(1), adaptability: z.number().min(0).max(1) }).optional(),
  reflection: z.object({ note: z.string().trim().min(1).max(2000), effectiveness: z.number().min(0).max(1) }).optional(),
});

export interface SessionContext {
  intent?: Intent;
  protocol?: Protocol;
  recoveryWindow?: RecoveryWindow;
  reflections: Reflection[];
}

const stateEngine = new StateEngine();
const protocolEngine = new ProtocolEngine();
const learningEngine = new LearningEngine();

export async function handleSession(input: unknown, context: SessionContext = { reflections: [] }) {
  const request = SessionRequestSchema.parse(input);
  switch (request.action) {
    case "observe": return { step: "observe", assessment: stateEngine.assess(request.currentState) };
    case "interpret": return { step: "interpret", weakestDimension: stateEngine.assess(request.currentState).weakest, context: "Current state interpreted against the supplied session context." };
    case "intent": {
      if (!request.requiredState || !request.objective) throw new Error("requiredState and objective are required for intent.");
      context.intent = { objective: request.objective, requiredState: request.requiredState };
      return { step: "intent", intent: context.intent };
    }
    case "select": {
      if (!context.intent) throw new Error("Intent must be established before protocol selection.");
      const protocols = demoProtocols();
      const match = protocolEngine.match(context.intent, request.currentState, protocols);
      context.protocol = match.protocol;
      return { step: "select", match };
    }
    case "execute": {
      if (!context.protocol) throw new Error("A protocol must be selected before execution.");
      const completedStepIds = context.protocol.steps.map((step) => step.id);
      context.recoveryWindow = protocolEngine.recoveryWindow(120, "Allow cognitive recovery before reassessment.");
      context.recoveryWindow.completed = true;
      return { step: "execute", execution: protocolEngine.execute(context.protocol, completedStepIds, context.recoveryWindow) };
    }
    case "reassess": {
      if (!request.afterState) throw new Error("afterState is required for reassessment.");
      return { step: "reassess", transition: stateEngine.transition(request.currentState, request.afterState) };
    }
    case "reflect": {
      if (!request.reflection) throw new Error("reflection is required.");
      const reflection: Reflection = { sessionId: request.sessionId, ...request.reflection, observedAt: new Date().toISOString() };
      context.reflections.push(reflection);
      return { step: "reflect", aggregate: learningEngine.aggregate(context.reflections) };
    }
    case "adapt": return { step: "adapt", patterns: learningEngine.trackPatterns([]), message: "Baseline adaptation requires a supplied observation history in the persistence layer." };
  }
}

function demoProtocols(): Protocol[] {
  return [{
    id: "focus-transition",
    name: "Focus Transition",
    objective: "Move toward clear, present, intentional execution.",
    targetDimensions: ["attention", "clarity", "presence", "intentionality"],
    minimumState: { recovery: 0.2 },
    steps: [
      { id: "01", title: "Context isolation", instruction: "Identify the single task that matters for this session.", durationSeconds: 60, kind: "practice" },
      { id: "02", title: "Attention stabilization", instruction: "Reduce competing inputs and return attention to the chosen task.", durationSeconds: 120, kind: "practice" },
      { id: "03", title: "Recovery window", instruction: "Pause, breathe, and allow cognitive load to settle.", durationSeconds: 120, kind: "recovery" },
      { id: "04", title: "Intent reinforcement", instruction: "State the outcome you intend to produce in one sentence.", durationSeconds: 60, kind: "reflection" },
    ],
  }];
}
