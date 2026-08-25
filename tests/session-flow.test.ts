import { describe, expect, it } from "vitest";
import { handleSession } from "../apps/web/api/session";
import type { StateVector } from "@stateos/core";

const start: StateVector = { attention:.5,clarity:.5,energy:.5,presence:.5,intentionality:.5,recovery:.5,adaptability:.5 };
const target: StateVector = { attention:.8,clarity:.8,energy:.7,presence:.8,intentionality:.85,recovery:.7,adaptability:.8 };
const after: StateVector = { attention:.7,clarity:.75,energy:.65,presence:.75,intentionality:.8,recovery:.65,adaptability:.75 };
const snapshot=(id:string,vector:StateVector)=>({id,capturedAt:new Date().toISOString(),vector,context:"integration test"});

describe("State Transition Session lifecycle",()=>{
  it("advances Observe → Adapt with no illegal engine boundary",async()=>{
    const sessionId="flow-test"; const context={reflections:[] as never[]};
    const observed=await handleSession({action:"observe",sessionId,currentState:start},context); expect(observed.step).toBe("observe");
    const interpreted=await handleSession({action:"interpret",sessionId,currentState:start},context); expect(interpreted.step).toBe("interpret");
    const intent=await handleSession({action:"intent",sessionId,currentState:start,requiredState:target,objective:"Integration objective"},context); expect(intent.step).toBe("intent");
    const selected=await handleSession({action:"select",sessionId,currentState:start},context); expect(selected.step).toBe("select");
    const executed=await handleSession({action:"execute",sessionId,currentState:start},context); expect(executed.step).toBe("execute");
    const reassessed=await handleSession({action:"reassess",sessionId,currentState:start,afterState:after},context); expect(reassessed.step).toBe("reassess");
    const reflected=await handleSession({action:"reflect",sessionId,currentState:start,reflection:{note:"clearer",effectiveness:.8}},context); expect(reflected.step).toBe("reflect");
    const adapted=await handleSession({action:"adapt",sessionId,currentState:start,snapshots:[snapshot("before",start),snapshot("after",after)]},context); expect(adapted.step).toBe("adapt");
  });

  it("rejects illegal ordering",async()=>{
    await expect(handleSession({action:"select",sessionId:"illegal",currentState:start},{reflections:[]})).rejects.toThrow("Intent must be established");
    await expect(handleSession({action:"reassess",sessionId:"illegal",currentState:start},{reflections:[]})).rejects.toThrow("afterState is required");
  });
});
