# StateOS MVP

StateOS is an execution-oriented system for practicing state transition: recognize the current state, establish intent, select a protocol, execute a guided transition, recover, reflect, and adapt.

## MVP objective

This repository is the production-oriented MVP foundation for the **State Transition Session**. It deliberately separates three core engines:

- **StateEngine** — validates state vectors, computes deltas, and measures transition quality.
- **ProtocolEngine** — matches an intent and current state to a protocol, validates sequencing, and executes deterministic protocol rules.
- **LearningEngine** — aggregates reflection, tracks recurring patterns, and adapts baselines without replacing user agency.
- **RecoveryWindow** — represents a bounded recovery intervention as a first-class protocol step.

## Architecture

```text
                         STATEOS MVP
                              |
                    State Transition Session
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
     StateEngine        ProtocolEngine       LearningEngine
          |                   |                   |
     state vector        protocol match       reflection
     delta analysis      sequencing rules     pattern tracking
     confidence          execution rules      baseline update
          |                   |                   |
          +-------------------+-------------------+
                              |
                              v
                       RecoveryWindow
                              |
                              v
                       Session API/UI
                              |
                              v
                         Human agency
```

## Eight-step lifecycle

1. **Observe** — establish the current state vector.
2. **Interpret** — identify the context and relevant dimensions.
3. **Set Intent** — define the capability or state required for the task.
4. **Select Protocol** — match the situation to an appropriate protocol.
5. **Execute** — run the ordered protocol steps and any RecoveryWindow.
6. **Reassess** — compute the post-session state and delta.
7. **Reflect** — capture structured qualitative learning.
8. **Adapt** — update the personal baseline from evidence while preserving user control.

## Repository layout

```text
.
├── apps/web
│   ├── app
│   │   └── page.tsx
│   ├── api/session.ts
│   └── components/StateSession.tsx
├── packages/core/src
│   ├── engines/StateEngine.ts
│   ├── engines/ProtocolEngine.ts
│   ├── engines/LearningEngine.ts
│   ├── types/state.ts
│   ├── types/protocol.ts
│   └── index.ts
├── tests/core.test.ts
├── .github/workflows/ci.yml
├── .env.example
├── package.json
└── tsconfig.json
```

## Security posture

The MVP keeps the deterministic state/protocol logic separate from the interface layer. Runtime validation uses Zod at trust boundaries. No secrets are committed. The client must not treat model-generated text as an authorization or state-of-record source. Production deployments should add authentication, authorization, encrypted persistence, audit logging, rate limiting, privacy controls, and threat-model-driven hardening before handling sensitive user data at scale.

## Local quickstart

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run dev
```

The Next.js application runs on `http://localhost:3000` by default.

## Environment

Copy `.env.example` to `.env.local` for local configuration. The MVP does not require a third-party secret to exercise the core State Transition Session.

## Engineering principle

StateOS is an execution system, not an autonomous authority. The engines provide structured decision support and repeatable protocols; the person remains the final authority over goals, consent, participation, and action.
