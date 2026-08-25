import { describe, expect, it } from "vitest";
import { LearningEngine, ProtocolEngine, StateEngine, type Protocol, type StateVector } from "@stateos/core";

const low: StateVector = { attention: .3, clarity: .4, energy: .5, presence: .4, intentionality: .5, recovery: .4, adaptability: .5 };
const high: StateVector = { attention: .8, clarity: .8, energy: .7, presence: .8, intentionality: .9, recovery: .6, adaptability: .8 };
const protocol: Protocol = { id: "p1", name: "Focus", objective: "Focus", targetDimensions: ["attention", "clarity"], minimumState: {}, steps: [{ id: "01", title: "Focus", instruction: "Focus", durationSeconds: 60, kind: "practice" }] };

describe("StateEngine", () => {
  it("computes a positive transition", () => {
    const result = new StateEngine().transition(low, high);
    expect(result.direction).toBe("improved");
    expect(result.delta.attention).toBe(.5);
  });
});

describe("ProtocolEngine", () => {
  it("matches and completes a protocol", () => {
    const engine = new ProtocolEngine();
    const match = engine.match({ objective: "focus", requiredState: high }, low, [protocol]);
    expect(match.protocol.id).toBe("p1");
    expect(engine.execute(protocol, ["01"]).completed).toBe(true);
  });
});

describe("LearningEngine", () => {
  it("aggregates reflection and adapts a baseline", () => {
    const engine = new LearningEngine();
    expect(engine.aggregate([{ sessionId: "1", note: "worked", effectiveness: .8, observedAt: new Date().toISOString() }]).meanEffectiveness).toBe(.8);
    const adapted = engine.adaptBaseline({ vector: low, sampleCount: 1, updatedAt: new Date().toISOString() }, high);
    expect(adapted.sampleCount).toBe(2);
    expect(adapted.vector.attention).toBeGreaterThan(low.attention);
  });
});
