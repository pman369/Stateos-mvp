"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LearningEngine,
  ProtocolEngine,
  StateEngine,
  type Protocol,
  type RecoveryWindow,
  type StateVector,
} from "@stateos/core";

const DIMENSIONS: (keyof StateVector)[] = [
  "attention",
  "clarity",
  "energy",
  "presence",
  "intentionality",
  "recovery",
  "adaptability",
];

const LABELS: Record<keyof StateVector, string> = {
  attention: "Attention",
  clarity: "Clarity",
  energy: "Energy",
  presence: "Presence",
  intentionality: "Intentionality",
  recovery: "Recovery",
  adaptability: "Adaptability",
};

const OBJECTIVES = {
  "Pre-Keynote Presentation": {
    objective: "Prepare for a clear, focused and confident presentation.",
    requiredState: { attention: 0.84, clarity: 0.88, energy: 0.72, presence: 0.9, intentionality: 0.9, recovery: 0.62, adaptability: 0.76 },
  },
  "Context Switching Recovery": {
    objective: "Recover cognitive clarity and presence after rapid context switching.",
    requiredState: { attention: 0.78, clarity: 0.84, energy: 0.66, presence: 0.86, intentionality: 0.78, recovery: 0.82, adaptability: 0.86 },
  },
  "Deep Work": {
    objective: "Enter a sustained state for focused execution.",
    requiredState: { attention: 0.9, clarity: 0.88, energy: 0.72, presence: 0.86, intentionality: 0.92, recovery: 0.58, adaptability: 0.72 },
  },
  "Difficult Conversation": {
    objective: "Prepare for a clear, present and intentional difficult conversation.",
    requiredState: { attention: 0.82, clarity: 0.86, energy: 0.68, presence: 0.92, intentionality: 0.9, recovery: 0.72, adaptability: 0.88 },
  },
  "Cognitive De-escalation": {
    objective: "Reduce cognitive load and recover enough clarity to choose the next action.",
    requiredState: { attention: 0.68, clarity: 0.82, energy: 0.62, presence: 0.82, intentionality: 0.7, recovery: 0.9, adaptability: 0.82 },
  },
} as const;

type ObjectiveName = keyof typeof OBJECTIVES;

const PRESETS: Record<ObjectiveName, StateVector> = {
  "Pre-Keynote Presentation": { attention: 0.58, clarity: 0.64, energy: 0.7, presence: 0.52, intentionality: 0.78, recovery: 0.42, adaptability: 0.62 },
  "Context Switching Recovery": { attention: 0.46, clarity: 0.48, energy: 0.54, presence: 0.42, intentionality: 0.56, recovery: 0.28, adaptability: 0.68 },
  "Deep Work": { attention: 0.62, clarity: 0.66, energy: 0.64, presence: 0.58, intentionality: 0.72, recovery: 0.48, adaptability: 0.58 },
  "Difficult Conversation": { attention: 0.64, clarity: 0.6, energy: 0.58, presence: 0.5, intentionality: 0.74, recovery: 0.46, adaptability: 0.66 },
  "Cognitive De-escalation": { attention: 0.42, clarity: 0.36, energy: 0.46, presence: 0.4, intentionality: 0.5, recovery: 0.24, adaptability: 0.6 },
};

const STORAGE_KEY = "stateos:mvp:sessions:v2";

interface HistoryItem {
  id: string;
  objective: string;
  before: StateVector;
  after: StateVector;
  effectiveness: number;
  note: string;
  completedAt: string;
}

const cloneState = (value: StateVector): StateVector => ({ ...value });

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function deltaLabel(value: number) {
  const sign = value > 0.005 ? "+" : value < -0.005 ? "−" : "±";
  return `${sign}${Math.abs(value * 100).toFixed(0)}%`;
}

function buildProtocol(objective: ObjectiveName): Protocol {
  const base = OBJECTIVES[objective].requiredState;
  return {
    id: `demo-${objective.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: objective,
    objective: OBJECTIVES[objective].objective,
    targetDimensions: ["attention", "clarity", "presence", "intentionality"],
    minimumState: { recovery: Math.min(base.recovery, 0.3) },
    steps: [
      { id: "01", title: "Context isolation", instruction: "Identify the single outcome that matters for this session and remove competing inputs.", durationSeconds: 45, kind: "practice" },
      { id: "02", title: "Attention stabilization", instruction: "Bring attention to the selected objective. Notice distraction without following it.", durationSeconds: 60, kind: "practice" },
      { id: "03", title: "Recovery window", instruction: "Pause. Let cognitive load settle before choosing the next deliberate action.", durationSeconds: 45, kind: "recovery" },
      { id: "04", title: "Intent reinforcement", instruction: "State the capability you need and the action you will take next.", durationSeconds: 45, kind: "reflection" },
    ],
  };
}

export function StateSession() {
  const [step, setStep] = useState(1);
  const [objectiveName, setObjectiveName] = useState<ObjectiveName>("Pre-Keynote Presentation");
  const [state, setState] = useState<StateVector>(cloneState(PRESETS["Pre-Keynote Presentation"]));
  const [after, setAfter] = useState<StateVector>(cloneState(PRESETS["Pre-Keynote Presentation"]));
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [protocolStep, setProtocolStep] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [recoveryWindow, setRecoveryWindow] = useState<RecoveryWindow | null>(null);
  const [note, setNote] = useState("");
  const [effectiveness, setEffectiveness] = useState(0.7);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");

  const stateEngine = useMemo(() => new StateEngine(), []);
  const protocolEngine = useMemo(() => new ProtocolEngine(), []);
  const learningEngine = useMemo(() => new LearningEngine(), []);
  const requiredState = OBJECTIVES[objectiveName].requiredState;
  const assessment = stateEngine.assess(state);
  const gap = stateEngine.transition(state, requiredState);
  const transition = stateEngine.transition(state, after);
  const protocol = selectedProtocol ?? buildProtocol(objectiveName);
  const activeProtocolStep = protocol.steps[protocolStep];
  const completion = selectedProtocol ? Math.round(((protocolStep + (running ? 0 : 1)) / protocol.steps.length) * 100) : 0;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, remaining]);

  useEffect(() => {
    if (!running || remaining !== 0 || !activeProtocolStep) return;
    setRunning(false);
    if (activeProtocolStep.kind === "recovery") {
      setRecoveryWindow({ id: `recovery-${Date.now()}`, durationSeconds: activeProtocolStep.durationSeconds, reason: activeProtocolStep.instruction, completed: true });
    }
    if (protocolStep < protocol.steps.length - 1) {
      setProtocolStep((current) => current + 1);
      setStatus("Protocol step complete. Ready for the next transition.");
    } else {
      setStep(6);
      setStatus("Protocol complete. Reassess the resulting state.");
    }
  }, [remaining, running, activeProtocolStep, protocolStep, protocol.steps.length]);

  const applyPreset = (name: ObjectiveName) => {
    setObjectiveName(name);
    setState(cloneState(PRESETS[name]));
    setAfter(cloneState(PRESETS[name]));
    setSelectedProtocol(null);
    setProtocolStep(0);
    setRecoveryWindow(null);
    setError("");
    setStatus(`Demo preset loaded: ${name}`);
    setStep(1);
  };

  const update = (key: keyof StateVector, value: number) => setState((current) => ({ ...current, [key]: value }));
  const updateAfter = (key: keyof StateVector, value: number) => setAfter((current) => ({ ...current, [key]: value }));

  const selectProtocol = () => {
    try {
      const intent = { objective: OBJECTIVES[objectiveName].objective, requiredState };
      const match = protocolEngine.match(intent, state, [buildProtocol(objectiveName)]);
      setSelectedProtocol(match.protocol);
      setProtocolStep(0);
      setStatus(`Protocol matched at ${Math.round(match.score * 100)}% confidence.`);
      setStep(4);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to match a protocol.");
    }
  };

  const startProtocol = () => {
    if (!activeProtocolStep) return;
    setRemaining(activeProtocolStep.durationSeconds);
    setRunning(true);
    setStatus(`Executing: ${activeProtocolStep.title}`);
    setStep(5);
  };

  const completeSession = async () => {
    const item: HistoryItem = {
      id: crypto.randomUUID(), objective: OBJECTIVES[objectiveName].objective, before: state, after,
      effectiveness, note: note.trim(), completedAt: new Date().toISOString(),
    };
    const nextHistory = [item, ...history].slice(0, 50);
    setHistory(nextHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
    const snapshots = nextHistory.map((entry) => ({ id: entry.id, capturedAt: entry.completedAt, vector: entry.after, context: entry.objective }));
    const baseline = learningEngine.adaptBaseline({ vector: state, sampleCount: 0, updatedAt: new Date().toISOString() }, after);
    try {
      const response = await fetch("/api/session", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "complete", sessionId: item.id, objective: item.objective, currentState: state, requiredState, afterState: after, reflection: { note: item.note || "No written note.", effectiveness }, snapshots, baseline }),
      });
      if (!response.ok) throw new Error("Session API rejected the completion payload.");
      setStatus("Session completed and learning payload dispatched.");
    } catch (caught) {
      setStatus("Session saved locally; API dispatch will need a retry.");
      setError(caught instanceof Error ? caught.message : "API dispatch failed.");
    }
    setStep(8);
  };

  return (
    <main className="stateos-shell">
      <header className="stateos-topbar">
        <div><div className="brand-mark">STATE<span>OS</span></div><div className="system-label">STATE TRANSITION SESSION · INVESTOR DEMO</div></div>
        <div className="demo-controls"><label>Demo mode<select value={objectiveName} onChange={(event) => applyPreset(event.target.value as ObjectiveName)}>{(Object.keys(OBJECTIVES) as ObjectiveName[]).map((name) => <option key={name}>{name}</option>)}</select></label><div className="step-chip">{String(step).padStart(2, "0")} / 08</div></div>
      </header>

      <section className="session-intro"><div><p className="eyebrow">State Transition Session</p><h1>Move from the state you are in toward the state you need.</h1><p className="lead">A closed-loop practice cycle: observe → interpret → intend → select → execute → reassess → reflect → adapt.</p></div><div className="status-card"><span>SESSION STATUS</span><strong>{status}</strong><small>{history.length} completed transition{history.length === 1 ? "" : "s"} stored locally</small></div></section>

      <nav className="lifecycle" aria-label="Session lifecycle">{["Observe", "Interpret", "Intent", "Select", "Execute", "Reassess", "Reflect", "Adapt"].map((label, index) => <button key={label} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} onClick={() => step > index + 1 && setStep(index + 1)} disabled={step <= index + 1}>{String(index + 1).padStart(2, "0")}<span>{label}</span></button>)}</nav>

      {error && <div className="error-banner">{error}</div>}

      {step === 1 && <section className="workspace"><div className="workspace-head"><div><p className="eyebrow">01 · Observe</p><h2>Current State</h2><p>Calibrate the starting vector. Every dimension is explicit, bounded and visible.</p></div><div className="metric"><span>CAPACITY</span><strong>{percent(assessment.mean)}</strong><small>{LABELS[assessment.strongest]} strongest · {LABELS[assessment.weakest]} weakest</small></div></div><div className="dimension-grid">{DIMENSIONS.map((key) => <label className="dimension" key={key}><span><b>{LABELS[key]}</b><em>{percent(state[key])}</em></span><input aria-label={LABELS[key]} type="range" min="0" max="1" step="0.01" value={state[key]} onChange={(event) => update(key, Number(event.target.value))}/><i>{state[key] < 0.4 ? "Constrained" : state[key] < 0.7 ? "Available" : "Strong"}</i></label>)}</div><div className="diagnostics"><div><span>Balance</span><strong>{percent(Math.max(0, 1 - Math.min(1, gap.magnitude)))}</strong></div><div><span>Largest gap</span><strong>{LABELS[DIMENSIONS.reduce((a, b) => Math.abs((requiredState[b] ?? 0) - state[b]) > Math.abs((requiredState[a] ?? 0) - state[a]) ? b : a)]}</strong></div><div><span>Direction</span><strong>{gap.direction}</strong></div></div><button className="primary" onClick={() => setStep(2)}>Interpret current state →</button></section>}

      {step === 2 && <section className="workspace compact"><p className="eyebrow">02 · Interpret</p><h2>What does the state imply?</h2><p className="lead-sm">The vector is not a score to chase. It is a contextual starting condition for choosing an intentional next state.</p><div className="interpret-grid"><div><span>Current capacity</span><strong>{percent(assessment.mean)}</strong></div><div><span>Constraint</span><strong>{LABELS[assessment.weakest]}</strong></div><div><span>Adaptive direction</span><strong>{gap.direction}</strong></div></div><button className="primary" onClick={() => setStep(3)}>Define intent →</button></section>}

      {step === 3 && <section className="workspace"><p className="eyebrow">03 · Intent</p><h2>What are you trying to become capable of doing?</h2><div className="objective-grid">{(Object.keys(OBJECTIVES) as ObjectiveName[]).map((name) => <button key={name} className={objectiveName === name ? "objective active" : "objective"} onClick={() => { setObjectiveName(name); setAfter(cloneState(PRESETS[name])); }}><span>{name}</span><small>{OBJECTIVES[name].objective}</small></button>)}</div><div className="target-preview"><span>Required state vector</span><div>{DIMENSIONS.map((key) => <div key={key}><b>{LABELS[key]}</b><strong>{percent(requiredState[key])}</strong><div className="bar"><i style={{ width: `${requiredState[key] * 100}%` }} /></div></div>)}</div></div><button className="primary" onClick={() => setStep(4)}>Calculate transition gap →</button></section>}

      {step === 4 && <section className="workspace"><p className="eyebrow">04 · Select</p><h2>Required State & protocol match</h2><div className="gap-table">{DIMENSIONS.map((key) => { const d = requiredState[key] - state[key]; return <div key={key}><span>{LABELS[key]}</span><strong className={d >= 0 ? "positive" : "negative"}>{deltaLabel(d)}</strong><div className="gap-track"><i style={{ left: `${Math.min(100, Math.max(0, state[key] * 100))}%` }} /><b style={{ left: `${Math.min(100, Math.max(0, requiredState[key] * 100))}%` }} /></div></div>})}</div><div className="protocol-card"><div><span className="tag">MATCHED PROTOCOL</span><h3>{protocol.name}</h3><p>{protocol.objective}</p></div><div className="match-score">{Math.round(protocolEngine.match({ objective: OBJECTIVES[objectiveName].objective, requiredState }, state, [protocol]).score * 100)}%<small>match</small></div></div><button className="primary" onClick={selectProtocol}>Confirm protocol →</button></section>}

      {step === 5 && <section className="workspace execution"><div className="execution-top"><div><p className="eyebrow">05 · Execute</p><h2>{activeProtocolStep?.title}</h2><p>{activeProtocolStep?.instruction}</p></div><div className="timer">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}<small>{activeProtocolStep?.kind ?? "practice"}</small></div></div><div className="progress-track"><i style={{ width: `${completion}%` }} /></div><div className="execution-actions">{running ? <button className="primary" onClick={() => setRunning(false)}>Pause</button> : <button className="primary" onClick={startProtocol}>{remaining > 0 ? "Resume" : "Start timed step"} →</button>}<span>Protocol step {protocolStep + 1} of {protocol.steps.length}</span></div>{recoveryWindow && <div className="recovery"><span>RECOVERY WINDOW</span><strong>Completed</strong><p>{recoveryWindow.reason}</p></div>}</section>}

      {step === 6 && <section className="workspace"><p className="eyebrow">06 · Reassess</p><h2>What changed?</h2><p>Move the post-session vector to the state you can honestly report now.</p><div className="dimension-grid">{DIMENSIONS.map((key) => <label className="dimension" key={key}><span><b>{LABELS[key]}</b><em>{percent(after[key])}</em></span><input aria-label={`After ${LABELS[key]}`} type="range" min="0" max="1" step="0.01" value={after[key]} onChange={(event) => updateAfter(key, Number(event.target.value))}/><i>{deltaLabel(after[key] - state[key])} transition</i></label>)}</div><div className="diagnostics"><div><span>Transition</span><strong>{transition.direction}</strong></div><div><span>Average magnitude</span><strong>{(transition.magnitude * 100).toFixed(1)}%</strong></div><div><span>Capacity after</span><strong>{percent(stateEngine.assess(after).mean)}</strong></div></div><button className="primary" onClick={() => setStep(7)}>Reflect on the transition →</button></section>}

      {step === 7 && <section className="workspace"><p className="eyebrow">07 · Reflect</p><h2>What did you learn?</h2><div className="reflection-grid"><label>What worked<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe the intervention, context or cue that mattered." /></label><label>Effectiveness<output>{percent(effectiveness)}</output><input type="range" min="0" max="1" step="0.05" value={effectiveness} onChange={(event) => setEffectiveness(Number(event.target.value))}/></label></div><div className="summary-line"><span>Transition delta</span><strong>{deltaLabel(transition.magnitude)}</strong><span>{transition.direction}</span></div><button className="primary" onClick={completeSession}>Complete & adapt baseline →</button></section>}

      {step === 8 && <section className="workspace completion"><div className="completion-mark">✓</div><p className="eyebrow">08 · Adapt</p><h2>Transition recorded.</h2><p className="lead-sm">The session is stored locally and its completion payload has been dispatched to the LearningEngine API boundary for aggregation and baseline adaptation.</p><div className="completion-grid"><div><span>Before</span><strong>{percent(stateEngine.assess(state).mean)}</strong></div><div><span>After</span><strong>{percent(stateEngine.assess(after).mean)}</strong></div><div><span>Delta</span><strong>{deltaLabel(transition.magnitude)}</strong></div><div><span>Effectiveness</span><strong>{percent(effectiveness)}</strong></div></div><div className="history"><h3>Recent transitions</h3>{history.slice(0, 4).map((item) => <div className="history-row" key={item.id}><span>{new Date(item.completedAt).toLocaleString()}</span><b>{item.objective}</b><em>{percent(item.effectiveness)}</em></div>)}</div><button className="primary" onClick={() => applyPreset(objectiveName)}>Run another transition →</button></section>}
    </main>
  );
}
