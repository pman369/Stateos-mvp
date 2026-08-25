import { describe, expect, it } from "vitest";
import { LearningEngine, ProtocolEngine, StateEngine, type Protocol, type StateVector } from "@stateos/core";

const zero: StateVector = { attention:0, clarity:0, energy:0, presence:0, intentionality:0, recovery:0, adaptability:0 };
const max: StateVector = { attention:1, clarity:1, energy:1, presence:1, intentionality:1, recovery:1, adaptability:1 };
const mid: StateVector = { attention:.5, clarity:.5, energy:.5, presence:.5, intentionality:.5, recovery:.5, adaptability:.5 };
const protocol: Protocol = { id:"p1", name:"Recovery", objective:"Recover capacity", targetDimensions:["attention","clarity","recovery"], minimumState:{recovery:.2}, steps:[{id:"01",title:"Recover",instruction:"Pause",durationSeconds:30,kind:"recovery"}] };

describe("StateEngine",()=>{
  const engine=new StateEngine();
  it("assesses all-zero and all-maximum vectors without invalid output",()=>{ expect(engine.assess(zero).mean).toBe(0); expect(engine.assess(max).mean).toBe(1); });
  it("separates Euclidean movement from capacity change",()=>{ const t=engine.transition(zero,max); expect(t.euclideanDistance).toBeCloseTo(Math.sqrt(7),4); expect(t.meanAbsoluteDelta).toBe(1); expect(t.capacityChange).toBe(1); });
  it("rejects negative vectors",()=>{ expect(()=>engine.assess({...mid,attention:-.01})).toThrow(); });
  it("does not call movement percentage an improvement metric",()=>{ const t=engine.transition({...mid,attention:.9},{...mid,attention:.1}); expect(t.euclideanDistance).toBeCloseTo(.8); expect(t.capacityChange).toBeCloseTo(-.1142857,4); expect(t.direction).toBe("declined"); });
});

describe("ProtocolEngine",()=>{
  const engine=new ProtocolEngine();
  it("matches a valid protocol at a bounded score",()=>{ const result=engine.match({objective:"Recover",requiredState:{...mid,recovery:.8}},zero,[protocol]); expect(result.score).toBeGreaterThanOrEqual(0); expect(result.score).toBeLessThanOrEqual(1); });
  it("rejects malformed protocol state",()=>{ expect(()=>engine.match({objective:"Recover",requiredState:zero},zero,[{...protocol,minimumState:{recovery:-1}} as Protocol])).toThrow(); });
  it("rejects unsafe recovery windows",()=>{ expect(()=>engine.recoveryWindow(29,"too short")).toThrow(); expect(()=>engine.recoveryWindow(3601,"too long")).toThrow(); });
  it("executes only known steps and requires completed recovery",()=>{ const recovery=engine.recoveryWindow(30,"recover"); expect(engine.execute(protocol,[],recovery).completed).toBe(false); recovery.completed=true; expect(engine.execute(protocol,["01"],recovery).completed).toBe(true); });
});

describe("LearningEngine",()=>{
  const engine=new LearningEngine();
  it("aggregates empty and bounded reflections",()=>{ expect(engine.aggregate([])).toEqual({count:0,meanEffectiveness:0}); expect(engine.aggregate([{sessionId:"1",note:"ok",effectiveness:1,observedAt:new Date().toISOString()}]).meanEffectiveness).toBe(1); });
  it("tracks patterns only when sufficient snapshots exist",()=>{ expect(engine.trackPatterns([])).toEqual([]); });
  it("adapts a baseline without escaping vector bounds",()=>{ const baseline={vector:zero,sampleCount:0,updatedAt:new Date().toISOString()}; const next=engine.adaptBaseline(baseline,max,.2); expect(next.vector.attention).toBe(.2); expect(next.vector.recovery).toBe(.2); expect(next.sampleCount).toBe(1); });
  it("rejects invalid learning rates",()=>{ expect(()=>engine.adaptBaseline({vector:mid,sampleCount:0,updatedAt:new Date().toISOString()},max,0)).toThrow(); expect(()=>engine.adaptBaseline({vector:mid,sampleCount:0,updatedAt:new Date().toISOString()},max,1.1)).toThrow(); });
});
