# iExec WTF Hackathon Summer Edition — Project Instructions

## 1. Objective

This workspace contains the context for the iExec WTF Hackathon Summer Edition. The competition is a strong fit for web/mobile applications because the brief requires a functional front end, end-to-end accessibility, deployment on Ethereum Sepolia, and good UX.

Preferred product types:

- Web application.
- Mobile application.
- Progressive Web App.
- Web/mobile client combined with APIs, a backend, an AI service, or sponsor technology.

## 2. Required Reading

After this file, read `PLAN.md` to determine the current phase, approvals, and next action.

Before conducting research or planning, also read:

1. `docs/competition-summary.md`
2. `docs/competition-summary-detailed.md`
3. `docs/requirements.md`
4. `docs/judging-criteria.md`
5. `docs/important-notes.md`

Then read the relevant file in `plan/` for the current phase.

## 3. Source of Truth

`docs/original/` stores source inputs. Do not assume that every document in that directory is an official source.

Source priority:

1. Official rules.
2. Official challenge or track page.
3. Official FAQ.
4. Sponsor technical documentation.
5. Official organizer email.
6. Third-party sources.
7. User-provided information without independent confirmation.
8. Agent inference.

If context, a translation, or a plan conflicts with a higher-priority source:

1. Stop using the conflicting information.
2. Check the source ID and original document in `docs/original/`.
3. Update the canonical file.
4. Record the conflict in `docs/important-notes.md`.

## 4. Canonical Responsibilities

- `PLAN.md`: phases, status, approvals, blockers, and next actions.
- `docs/competition-summary.md`: concise overview and Participation Fit Gate.
- `docs/competition-summary-detailed.md`: detailed English competition summary.
- `docs/requirements.md`: eligibility, product requirements, technology, IP, constraints, and submission.
- `docs/judging-criteria.md`: rubric, weights, and evidence mapping.
- `docs/important-notes.md`: sources, deadline, conflicts, disqualification risks, and unresolved questions.

When the same fact appears in multiple places, the canonical file takes precedence.

## 5. Work Sequence

### Phase 1 — Understand the Competition

- Confirm the Participation Fit Gate.
- Verify requirements, rubric, deadline, and unresolved information.
- Do not begin research or coding while mandatory requirements remain unclear.

### Phase 2 — Research and Brainstorm

Follow:

- `plan/research-plan.md`
- `plan/brainstorm-plan.md`

### Phase 3 — Product Plan

Complete `plan/product-plan.md` only after the user selects an idea.

### Phase 4 — Build Plan

Complete `plan/build-plan.md` only after the Product Plan is approved.

### Phase 5 — Development and Submission

- Web/mobile client, landing page, and Vercel Agent API: `apps/web/`
- Stateless keeper: `apps/keeper/`
- MCP stdio server: `apps/mcp-server/`
- Solidity, Hardhat, deployment, and canonical artifacts: `packages/contracts/`
- Slides: `submission/slide/`
- Video: `submission/video/`

## 6. Web/App Rules

- Viewers must understand the product value quickly.
- The core flow must be short, stable, and directly demonstrate the challenge.
- Sponsor technology must have a real role rather than being attached only for eligibility.
- Provide suitable sample data and fallbacks for external services.
- Do not add a backend, database, authentication, or deployment unless it supports the core flow or a requirement.

## 7. Core-Product-First and Landing Page

The landing page is mandatory for the final release, but it must be built only after the `Core Product Ready Gate`.

## 8. General Rules

- Do not invent requirements or change mandatory technology.
- Do not ignore deadlines, disqualification conditions, or submission requirements.
- Distinguish facts, inferences, and unverified information.
- Do not add major features outside the Product Plan without approval.

## 9. Preconditions for Coding

Begin coding only when:

- The competition has been confirmed as a fit or the user has accepted an exception.
- Mandatory requirements and the rubric are clear.
- The user has selected the final idea.
- The MVP and non-goals are defined.
- The Product Plan and Build Plan are approved.
