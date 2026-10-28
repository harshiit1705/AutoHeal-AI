# AutoHeal AI — Start Here (Local Demo)

## 1. What this application does
AutoHeal AI is a prototype reliability layer for business automation failures. It collects a failure event, redacts evidence, creates a diagnosis and recovery proposal, applies deterministic policy checks, optionally requires approval, runs a **simulated** recovery, evaluates local postconditions, and writes audit events.

## 2. What this ZIP really supports
- React/Vite frontend with these screens: **Overview**, **Workflow Monitor**, **Incidents**, **Recovery Center**, **Recovery Approval**, **Integrations**, and **Audit Logs**.
- Express API on port 4000 and a local SQLite database (`backend/data/autoheal.sqlite`). Seed data is created automatically on first start.
- Deterministic diagnosis when Gemini is not configured; optional server-side Gemini call if `GEMINI_API_KEY` is set.
- Controlled local demo scenarios, including a simulated HTTP 503, HTTP 401, schema drift, missing business data, and uncertain timeout.
- Approval is enforced inside the backend executor for policy-gated proposals. Inbound webhooks require a shared secret.

**Important limitations:** recovery and verification are simulated. This prototype does not retry or resume real n8n/Make/Zapier/Salesforce workflows. The local demo operator is not authenticated as a real person. Do not expose this app to the internet or use production credentials/data.

## 3. Software required
- Windows 10/11
- Node.js 22 LTS or newer compatible with the locked Vite/TypeScript versions
- npm (installed with Node.js)
- A modern browser

## 4. Extract and open
1. Extract `AutoHeal_AI_Demo_Ready.zip` to a normal writable folder, for example `C:\AutoHeal-AI`.
2. Open that folder in VS Code (`File → Open Folder`).
3. Open the VS Code terminal: **Terminal → New Terminal**.
4. Verify Node/npm: `node --version` and `npm --version`.

## 5. Install dependencies (PowerShell)
Run these commands from the project root, the folder containing the root `package.json`:

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
Copy-Item backend\.env.example backend\.env -ErrorAction SilentlyContinue
```

Edit `backend\.env` and set `AUTOHEAL_WEBHOOK_SECRET` to a long random string if you want to test inbound webhook ingestion. The local demo button does not need webhook credentials. Keep `HOST=127.0.0.1` and the default localhost CORS origins for a local-only demo. `GEMINI_API_KEY` is optional; leave it blank for deterministic demo mode.

## 6. Start both services
From the project root:

```powershell
npm run dev
```

This starts the backend and frontend together. Keep this terminal open. If you prefer separate terminals:

**Terminal 1 — backend**
```powershell
npm --prefix backend run dev
```

**Terminal 2 — frontend**
```powershell
npm --prefix frontend run dev
```

Open **http://localhost:5173**. The backend API is at **http://localhost:4000**.

## 7. Check both services
Open a second terminal and run:

```powershell
Invoke-RestMethod http://localhost:4000/api/dashboard/summary
Invoke-RestMethod http://localhost:4000/api/incidents
```

The first command should return dashboard counts and the second should return a list of seeded incidents. In the browser, use the **Overview** screen; if it loads metrics and recent incidents, the frontend can reach the backend through Vite's `/api` proxy.

## 8. Repeatable 3–5 minute demo
1. Open **Overview** (`/overview`). Find **Controlled Demo Workflow Injector**.
2. Choose **Transient Dependency Outage (HTTP 503)** / scenario ID `transient_503`, then trigger it. The API is `POST http://localhost:4000/api/demo/trigger/transient_503`.
3. Open **Incidents** (`/incidents`) and open the newest incident. Show the error evidence, redacted payload/logs, diagnosis, policy category, and the explicit deterministic-demo label when Gemini is not configured.
4. Open **Recovery Center** (`/recovery-center`). Select the new incident. For the 503 case, choose **Run Simulated Recovery**. This performs local checks only; no external retry is sent.
5. Confirm the final incident state and verification details. The verification text must say **SIMULATED** and that no external workflow was changed. A failed postcondition must not be shown as healed.
6. Open **Audit Logs** (`/audit-logs`) and show detection, diagnosis, execution, and verification events.

For a gated approval example, use the seeded `INC-2048` schema-drift incident in **Recovery Center**: run **Test In Staging Sandbox**, then **Review & Authorize**. Approval is bound to the current action and parameters. This is a local demo approval, not real identity-backed authorization.

## 9. Interpret statuses
- **Demo / simulated** means no external platform was contacted.
- **Configured but unverified** means configuration values exist but no genuine connection test has passed.
- **Verified healed** in this prototype means the local simulated postcondition passed; it does not mean a real customer workflow was healed.
- **Escalated** means the postcondition failed or policy prohibits automatic recovery.

## 10. Reset and repeat
Stop both services with `Ctrl+C`. To reset seeded incidents and audit history, back up then delete `backend\data\autoheal.sqlite` while the backend is stopped. Restart with `npm run dev`; the database will be recreated and seeded. This deletes local demo history.

## 11. Troubleshooting
- **`npm` is not recognized:** install Node.js and reopen VS Code.
- **Port 4000 or 5173 already in use:** close the other process or change the port carefully in backend `.env` / `frontend/vite.config.ts` and update the proxy target.
- **SQLite `node:sqlite` issue:** use a supported recent Node.js release (Node 22+); do not install a separate SQLite package.
- **API returns 401 for `/api/webhooks/...`:** set `AUTOHEAL_WEBHOOK_SECRET` in `backend/.env` and send the same value in the `X-AutoHeal-Webhook-Secret` header.
- **Frontend cannot reach API:** ensure both terminals are running and the Vite proxy targets `http://localhost:4000`.
- **Gemini error:** remove/blank `GEMINI_API_KEY` to use deterministic demo mode. Never place the key in frontend files.
- **Unexpected state after repeated runs:** reset `backend/data/autoheal.sqlite` with the backend stopped.

## 12. Production limitations
No user login, roles, tenant isolation, or identity-backed authorization is implemented. The webhook uses a shared-secret header rather than signed payload verification. Event deduplication is local SQLite, not distributed. Integration connection probes and external recovery adapters are not implemented. Do not deploy publicly or use this prototype for live customer workflows.
