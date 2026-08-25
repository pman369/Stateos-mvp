import { describe, expect, it } from "vitest";
import { POST } from "../apps/web/app/api/session/route";
import type { StateVector } from "@stateos/core";

const current: StateVector={attention:.4,clarity:.45,energy:.5,presence:.45,intentionality:.6,recovery:.4,adaptability:.55};
const after: StateVector={attention:.7,clarity:.7,energy:.6,presence:.7,intentionality:.75,recovery:.6,adaptability:.7};
const required: StateVector={attention:.8,clarity:.8,energy:.7,presence:.8,intentionality:.85,recovery:.7,adaptability:.8};
const payload=(sessionId:string)=>({action:"complete",sessionId,objective:"API contract test",currentState:current,requiredState:required,afterState:after,reflection:{note:"worked",effectiveness:.9},snapshots:[{id:`${sessionId}-before`,capturedAt:new Date().toISOString(),vector:current,context:"API test"},{id:`${sessionId}-after`,capturedAt:new Date().toISOString(),vector:after,context:"API test"}],baseline:{vector:current,sampleCount:0,updatedAt:new Date().toISOString()}});

async function post(body:unknown){return POST(new Request("http://localhost/api/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));}

describe("POST /api/session",()=>{
  it("accepts a valid completion payload",async()=>{const response=await post(payload(`api-${Date.now()}`));expect(response.status).toBe(200);const body=await response.json();expect(body.step).toBe("adapt");expect(body.transition.euclideanDistance).toBeGreaterThan(0);expect(body.transition).toHaveProperty("capacityChange");});
  it("rejects out-of-range vectors",async()=>{const body=payload(`invalid-${Date.now()}`);body.currentState={...current,attention:-.1};const response=await post(body);expect(response.status).toBe(400);const result=await response.json();expect(result.error).toContain("attention");});
  it("rejects incomplete completion contracts",async()=>{const body=payload(`missing-${Date.now()}`);delete (body as Record<string,unknown>).reflection;const response=await post(body);expect(response.status).toBe(400);});
  it("is idempotent for the same sessionId",async()=>{const id=`idempotent-${Date.now()}`;const first=await post(payload(id));const second=await post(payload(id));expect(first.status).toBe(200);expect(second.status).toBe(200);const a=await first.json();const b=await second.json();expect(a.idempotent).toBe(false);expect(b.idempotent).toBe(true);expect(b.baseline).toEqual(a.baseline);expect(b.transition).toEqual(a.transition);});
});
