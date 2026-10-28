# AutoHeal AI — 3–5 Minute Presenter Script

## 0:00–0:30 — Product framing (Overview)
“AutoHeal AI is an integration-first reliability layer. It aims to detect automation failures, collect redacted evidence, diagnose likely causes, evaluate recovery against deterministic safety rules, require approval for gated actions, and record the outcome. This build is a local hackathon prototype; recovery and verification are explicitly simulated.”

Point to the Overview KPI cards and recent incident list. Explain that success rate is calculated from local demo incidents and MTTR is marked not measured; integration tiles are demo, not live monitoring.

## 0:30–1:15 — Trigger a failure (Overview)
Use **Controlled Demo Workflow Injector** and select **Transient Dependency Outage (HTTP 503)** (`transient_503`). Trigger it. Explain that this creates a controlled event in the local database, not a real payment request. Mention that an idempotency key is required by the deterministic policy before a retry is eligible.

## 1:15–2:00 — Inspect incident evidence (Incidents)
Open **Incidents** and select the newest incident. Show the HTTP status, error, correlation evidence, redacted payload/logs, diagnosis, confidence, and proposed action. With no Gemini key, diagnosis is deterministic fallback; with a key, the server calls Gemini and validates its JSON against a Zod schema. The policy engine remains authoritative.

## 2:00–3:00 — Policy and recovery (Recovery Center)
Open **Recovery Center** and select the new incident. For the transient 503 scenario, click **Run Simulated Recovery**. Explain that the backend reevaluates policy, refuses unsafe action mismatches, checks approval for gated proposals, and calls the local simulated postcondition verifier. No external workflow retry occurs.

For the approval-gate example, select seeded `INC-2048` (schema drift). Run **Test In Staging Sandbox**, then **Review & Authorize**. The backend records approval against the exact proposed action and parameters before the executor will proceed. The operator label is intentionally not represented as authenticated identity.

## 3:00–3:45 — Verification and audit (Audit Logs)
Show the final state and verification result. Point out `[SIMULATED POSTCONDITION]` and the text stating no external workflow was changed. Then open **Audit Logs** and trace incident detection, diagnosis, approval (if applicable), execution, and verification. A failed local postcondition must result in escalation, not a healed state.

## 3:45–4:30 — Honest integration status (Integrations)
Open **Integrations**. Explain that cards are marked demo or configured-unverified unless a genuine supported probe exists. The current build does not implement live connection tests or external retry/resume adapters. Inbound webhook ingestion is available only when the shared secret is configured.

## Technical explanation
- Frontend: React + TypeScript + Vite, preserving the existing Stitch-derived visual design.
- Backend: Express + TypeScript; local SQLite via `node:sqlite`.
- Diagnosis: Gemini optional; deterministic fallback otherwise.
- Safety: allowlisted action classes, policy/action matching, idempotency checks for transient retry, backend approval gate, bounded action model, and simulated postconditions.
- Audit and deduplication: audit rows and event fingerprints persist in local SQLite.

## Q&A caveat
This is not production-ready. It lacks authenticated users/roles, multi-tenant authorization, real external recovery adapters, distributed deduplication, and live integration health probes. “Verified healed” means only that a local simulated postcondition passed.
