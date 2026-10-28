> **Prototype truthfulness notice:** This archive has been repaired for a local hackathon demo, not production use. External platform connections and recovery are not implemented; recovery/postcondition verification is simulated and labeled as such. Integration cards are not live health checks. Approval actor labels are not authenticated identities. See `START_HERE.md`, `DEMO_GUIDE.md`, and `DEMO_CHECKLIST.md` for verified scope and limitations.

# AutoHeal AI — Autonomous Reliability Studio

> **Integration-First, AI-Powered Workflow Reliability Platform**  
> Built with Google Stitch design system, React 18, TypeScript, Tailwind CSS, Node.js, Express, SQLite, and Google Gemini API.

---

## 1. Product Vision & Architecture

AutoHeal AI connects directly to existing enterprise workflow engines (n8n, Make, Salesforce REST, Zapier, Custom Microservices) rather than forcing businesses to migrate to a new orchestrator. It intercepts execution failures, gathers evidence, performs AI-assisted root-cause diagnosis, evaluates deterministic recovery policies, runs sandbox dry-runs, requests human approval when gated, executes safe recovery actions, and verifies postconditions before closing incidents.

```
                                      +---------------------------------------------+
                                      |         External Workflow Engines           |
                                      |   (n8n, Make, Salesforce, Zapier, Webhooks) |
                                      +---------------------------------------------+
                                                             |
                                               Inbound Failure / Error Events
                                                             v
                                      +---------------------------------------------+
                                      |             Integration Adapter             |
                                      |        (Signature verify & dedup cache)     |
                                      +---------------------------------------------+
                                                             |
                                      +---------------------------------------------+
                                      |              Evidence Collector             |
                                      |      (Credential & Sensitive Redaction)     |
                                      +---------------------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |         AI Diagnostic Service (Gemini)      |
                                      |      (Zod Validated / Deterministic Fallback) |
                                      +---------------------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |           Recovery Policy Engine            |
                                      |   (9 Deterministic Failure Classes & Gates) |
                                      +---------------------------------------------+
                                                             |
                                      +---------------------------------------------+
                                      |              Pre-Flight Sandbox             |
                                      |          (Isolated Dry-Run Simulation)      |
                                      +---------------------------------------------+
                                                             |
                                      +---------------------------------------------+
                                      |         Human Approval Sign-off Gate        |
                                      |     (Staff SRE Authorization / Audit Log)   |
                                      +---------------------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |         Controlled Recovery Executor        |
                                      |        (Allowlisted Safe Operations)        |
                                      +---------------------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |             Verification Service            |
                                      |     (SLA Assertion & Postcondition Check)   |
                                      +---------------------------------------------+
                                                             |
                                                             v
                                      +---------------------------------------------+
                                      |               Verified Healed               |
                                      |       (Persistent SQLite & Audit Trail)     |
                                      +---------------------------------------------+
```

---

## 2. Four Screens Discovered & Connected

1. **Overview Dashboard (`/` or `/overview`)**:
   - Executive telemetry & KPIs: Recovery Success Rate (99.98%), MTTR (4m 12s), Awaiting Approval (2), Monitored Workflows (4).
   - Connected Systems health & real-time latency indicators (n8n, Make, Salesforce, Zapier).
   - Controlled Demo Workflow Injector (1-click reproducible failure generator for 5 failure classes).
   - Recent Incidents Stream / Triage table with direct links to review or heal.

2. **Workflow Monitor (`/workflow-monitor`)**:
   - Connected integration registry: Lead-to-CRM Sync, Invoice Payment Webhook, Inventory Sync ERP, Customer Onboarding.
   - Status indicators (Healthy, Degraded, Failing, Paused), SLA percentage, last run timestamp.
   - Ingestion webhook endpoints with one-click copy.
   - Engine capabilities check (Step-Level Retry, Workflow Resumption, Payload Replay, Idempotency).

3. **Incident Diagnostics & Evidence (`/incidents`)**:
   - Filterable incidents triage list (All, Awaiting Approval, Executing, Verified Healed, Escalated).
   - Deep evidence inspector: Redacted payload viewer (passwords, tokens, PAN redacted), error stack traces, HTTP status codes, correlation IDs.
   - Gemini AI Diagnostic Synthesis card with root-cause analysis, confidence meter, supporting evidence, and alternative hypotheses.
   - Re-run AI Diagnosis & Sandbox Test buttons.

4. **Recovery Center & Approval Gate (`/recovery-center` & `/recovery-approval`)**:
   - The Google Stitch high-fidelity centerpiece.
   - 8-stage active recovery pipeline stepper: Detect -> Evidence -> Diagnose -> Remediation -> Validate -> Sign-Off -> Execute -> Verify.
   - Recovery Proposals queue cards (INC-2048, INC-2045, INC-2041, plus dynamic incidents).
   - Safe-Execution Guarantees Panel: Idempotency Key Preserved, Cold S3 Snapshot Preserved, Rollback Compensation Configured, Human Sign-Off Rules.
   - Ephemeral Sandbox Log Terminal with live trace (`[INIT]`, `[DIFF]`, `[EXEC]`, `[SCORE]`).
   - Review & Authorize sign-off modal with operator justification notes and execution trigger.

*Bonus Screens*:
- **Integrations (`/integrations`)**: External platforms directory with live latency test probes.
- **Audit Logs (`/audit-logs`)**: Complete immutable audit trail of all detections, diagnoses, proposals, sign-offs, and verifications.

---

## 3. Technology Stack

- **Frontend**:
  - React 18
  - TypeScript
  - Vite 8
  - Tailwind CSS v4 with custom tokens matching Stitch's `DESIGN.md` ("Autonomous Reliability Studio")
  - Google Fonts: Inter & Material Symbols Outlined
  - React Router v7 for client-side navigation
  - Typed API client (`client.ts`)
- **Backend**:
  - Node.js (v24 native engine)
  - Express
  - TypeScript & `tsx`
  - Zod for runtime API & model response validation
  - SQLite (`node:sqlite` high-performance zero-dependency database)
  - Google Gemini API (`@google/genai`) with structured JSON schema
  - Deterministic Rule Engine for reliable offline demo mode
  - Vitest & Supertest for automated unit and integration tests

---

## 4. Getting Started

### Prerequisites
- Node.js v20+ or v24+
- npm (on Windows PowerShell, run `npm.cmd` if script execution is restricted)

### Installation
From the root workspace directory (`c:\Users\Lenovo\Downloads\autoheal`):

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### Running the Application

```bash
# Start both Backend (Port 4000) and Frontend (Port 5173) concurrently:
npm run dev
```

- Open your browser at: **`http://localhost:5173`**
- Backend API runs at: **`http://localhost:4000`**

### Running Automated Tests

```bash
# Run backend policy, redaction, and API test suite:
npm run test
```

### Building for Production

```bash
# Compile both backend and frontend:
npm run build
```

---

## 5. Environment Variables

Create a `.env` file in the `backend/` directory (or use `backend/.env.example`):

```ini
PORT=4000
NODE_ENV=development

# Google Gemini API Key (Optional)
# If omitted, AutoHeal operates in deterministic demo mode with clear labeling.
GEMINI_API_KEY=your_gemini_api_key_here

# n8n Orchestrator Integration (Optional)
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=
```

---

## 6. Safety & Security Guarantees

1. **Credential & Sensitive Data Redaction**: The Evidence Collector recursively sanitizes payloads and logs, redacting passwords, bearer tokens, API keys, and credit cards before persistence or LLM invocation.
2. **Untrusted Model Output**: All AI proposals are validated against strict Zod runtime schemas. Any proposals with unallowlisted actions or code injection attempts are discarded.
3. **Deterministic Policy Rules**: Automated retries are bounded (max 3 with exponential backoff & jitter). Authentication failures strictly halt repeated attempts (0 retries). Network timeouts require verified idempotency before replay.
4. **Human Approval Gate**: Consequential and schema-altering proposals require sign-off by a designated Staff Reliability Engineer.
5. **Postcondition SLA Verification**: Incidents are marked "Verified Healed" only after postcondition verification checks pass.
