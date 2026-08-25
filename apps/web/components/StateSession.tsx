"use client";

import { useMemo, useState } from "react";
import { StateEngine, type StateVector } from "@stateos/core";

const initialState: StateVector = { attention: 0.42, clarity: 0.5, energy: 0.55, presence: 0.48, intentionality: 0.62, recovery: 0.4, adaptability: 0.58 };
const dimensions: (keyof StateVector)[] = ["attention", "clarity", "energy", "presence", "intentionality", "recovery", "adaptability"];
const labels: Record<keyof StateVector, string> = { attention: "Attention", clarity: "Clarity", energy: "Energy", presence: "Presence", intentionality: "Intentionality", recovery: "Recovery", adaptability: "Adaptability" };

export function StateSession() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<StateVector>(initialState);
  const [after, setAfter] = useState<StateVector>(initialState);
  const [objective, setObjective] = useState("Prepare for focused execution");
  const engine = useMemo(() => new StateEngine(), []);
  const assessment = engine.assess(state);
  const transition = engine.transition(state, after);

  const update = (key: keyof StateVector, value: number) => setState((current) => ({ ...current, [key]: value }));
  const updateAfter = (key: keyof StateVector, value: number) => setAfter((current) => ({ ...current, [key]: value }));

  return <main className="session">
    <header className="session-header"><div><p className="eyebrow">State Transition Session</p><h1>Move intentionally from the state you are in toward the state you need.</h1></div><span className="step">Step {step} / 8</span></header>
    <section className="panel"><p className="eyebrow">01 · Observe</p><h2>Current State</h2><p className="muted">Adjust the state vector to represent the starting condition.</p>
      <div className="sliders">{dimensions.map((key) => <label key={key}>{labels[key]}<input type="range" min="0" max="1" step="0.01" value={state[key]} onChange={(event) => update(key, Number(event.target.value))}/><span>{Math.round(state[key] * 100)}%</span></label>)}</div>
      <div className="assessment"><strong>Mean capacity: {Math.round(assessment.mean * 100)}%</strong><span>Strongest: {labels[assessment.strongest]}</span><span>Weakest: {labels[assessment.weakest]}</span></div>
    </section>
    <section className="panel"><p className="eyebrow">02–04 · Interpret → Intent → Select</p><h2>Required State</h2><label className="field">Session objective<input value={objective} onChange={(event) => setObjective(event.target.value)} /></label><p className="muted">MVP demonstration: the objective anchors protocol selection while the deterministic engines remain the source of state calculations.</p><button onClick={() => setStep(5)}>Select and execute protocol →</button></section>
    <section className="panel"><p className="eyebrow">05–08 · Execute → Reassess → Reflect → Adapt</p><h2>Reassessment</h2><div className="sliders">{dimensions.map((key) => <label key={key}>{labels[key]}<input type="range" min="0" max="1" step="0.01" value={after[key]} onChange={(event) => updateAfter(key, Number(event.target.value))}/><span>{Math.round(after[key] * 100)}%</span></label>)}</div><div className="assessment"><strong>Transition: {transition.direction}</strong><span>Average magnitude: {(transition.magnitude * 100).toFixed(1)}%</span></div><button onClick={() => setStep(8)}>Complete session</button></section>
  </main>;
}
