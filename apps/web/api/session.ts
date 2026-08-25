import { z } from "zod";
import { LearningEngine, ProtocolEngine, StateEngine, type Reflection } from "@stateos/core";
import type { Intent, Protocol, RecoveryWindow, StateSnapshot, StateVector } from "@stateos/core";

const StateVectorSchema = z.object({
  attention: z.number().min(0).max(1), clarity: z.number().min(0).max(1), energy: z.number().min(0).max(1),
  presence: z.number().min(0).max(1), intentionality: z.number().min(0).max(1), recovery: z.number().min(0).max(1), adaptability: z.number().min(0).max(1),
});
const SessionRequestSchema = z.object({
  action: z.enum(["observe", "interpret", "intent", "select", "execute", "reassess", "reflect", "adapt", "complete"]),
  sessionId: z.string().min(1), currentState: StateVectorSchema, requiredState: StateVectorSchema.optional(), objective: z.string().trim().min(1).max(300).optional(), afterState: StateVectorSchema.optional(),
  reflection: z.object({ note: z.string().max(2000), effectiveness: z.number().min(0).max(1) }).optional(),
  snapshots: z.array(z.object({ id: z.string().min(1), capturedAt: z.string().datetime(), vector: StateVectorSchema, context: z.string().min(1).max(500) })).max(100).optional(),
  baseline: z.object({ vector: StateVectorSchema, sampleCount: z.number().int().min(0), updatedAt: z.string().datetime() }).optional(),
});
export interface SessionContext { intent?: Intent; protocol?: Protocol; recoveryWindow?: RecoveryWindow; reflections: Reflection[]; }
const stateEngine = new StateEngine(); const protocolEngine = new ProtocolEngine(); const learningEngine = new LearningEngine();
const completions = new Map<string, ReturnType<typeof completeResponse>>();

export async function handleSession(input: unknown, context: SessionContext = { reflections: [] }) {
  const request = SessionRequestSchema.parse(input);
  switch (request.action) {
    case "observe": return { step: "observe", assessment: stateEngine.assess(request.currentState) };
    case "interpret": return { step: "interpret", weakestDimension: stateEngine.assess(request.currentState).weakest, context: "Current state interpreted against the supplied session context." };
    case "intent": {
      if (!request.requiredState || !request.objective) throw new Error("requiredState and objective are required for intent.");
      context.intent = { objective: request.objective, requiredState: request.requiredState }; return { step: "intent", intent: context.intent };
    }
    case "select": {
      if (!context.intent) throw new Error("Intent must be established before protocol selection.");
      const match = protocolEngine.match(context.intent, request.currentState, demoProtocols()); context.protocol = match.protocol; return { step: "select", match };
    }
    case "execute": {
      if (!context.protocol) throw new Error("A protocol must be selected before execution.");
      const completedStepIds = context.protocol.steps.map((item) => item.id); context.recoveryWindow = protocolEngine.recoveryWindow(120, "Allow cognitive recovery before reassessment."); context.recoveryWindow.completed = true;
      return { step: "execute", execution: protocolEngine.execute(context.protocol, completedStepIds, context.recoveryWindow) };
    }
    case "reassess": {
      if (!request.afterState) throw new Error("afterState is required for reassessment."); return { step: "reassess", transition: stateEngine.transition(request.currentState, request.afterState) };
    }
    case "reflect": {
      if (!request.reflection) throw new Error("reflection is required."); const reflection: Reflection = { sessionId: request.sessionId, ...request.reflection, observedAt: new Date().toISOString() }; context.reflections.push(reflection); return { step: "reflect", aggregate: learningEngine.aggregate(context.reflections) };
    }
    case "adapt": return { step: "adapt", patterns: learningEngine.trackPatterns((request.snapshots ?? []) as StateSnapshot[]) };
    case "complete": {
      if (!request.afterState || !request.reflection || !request.snapshots?.length || !request.baseline) throw new Error("afterState, reflection, snapshots and baseline are required for completion.");
      const existing = completions.get(request.sessionId); if (existing) return { ...existing, idempotent: true };
      const response = completeResponse(request); completions.set(request.sessionId, response); return { ...response, idempotent: false };
    }
  }
}

function completeResponse(request: z.infer<typeof SessionRequestSchema>) {
  const transition = stateEngine.transition(request.currentState, request.afterState!);
  const reflection: Reflection = { sessionId: request.sessionId, ...request.reflection!, observedAt: new Date().toISOString() };
  const aggregate = learningEngine.aggregate([reflection]);
  const patterns = learningEngine.trackPatterns(request.snapshots! as StateSnapshot[]);
  const baseline = learningEngine.adaptBaseline(request.baseline!, request.afterState!);
  return { step: "adapt", sessionId: request.sessionId, transition, reflection: aggregate, patterns, baseline, persisted: true, persistence: "MVP idempotency store: process-local completion ledger." };
}

export async function POST(request: Request) {
  try { return Response.json(await handleSession(await request.json())); }
  catch (error) { const message = error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") : error instanceof Error ? error.message : "Invalid session request."; return Response.json({ error: message }, { status: 400 }); }
}

function demoProtocols(): Protocol[] { return [{ id: "focus-transition", name: "Focus Transition", objective: "Move toward clear, present, intentional execution.", targetDimensions: ["attention", "clarity", "presence", "intentionality"], minimumState: { recovery: 0.2 }, steps: [
  { id: "01", title: "Context isolation", instruction: "Identify the single task that matters for this session.", durationSeconds: 60, kind: "practice" },
  { id: "02", title: "Attention stabilization", instruction: "Reduce competing inputs and return attention to the chosen task.", durationSeconds: 120, kind: "practice" },
  { id: "03", title: "Recovery window", instruction: "Pause, breathe, and allow cognitive load to settle.", durationSeconds: 120, kind: "recovery" },
  { id: "04", title: "Intent reinforcement", instruction: "State the outcome you intend to produce in one sentence.", durationSeconds: 60, kind: "reflection" },
] }] as Protocol[]; }
