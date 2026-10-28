# AutoHeal AI — Before the Invigilator Arrives

- [ ] Extract ZIP and open the project root in VS Code.
- [ ] Confirm Node.js and npm are installed (`node --version`, `npm --version`).
- [ ] Run `npm install`, `npm --prefix backend install`, and `npm --prefix frontend install` if not already installed.
- [ ] Confirm `backend/.env` exists; keep Gemini key blank for deterministic mode.
- [ ] Run `npm run dev`; keep the terminal open.
- [ ] Check `http://localhost:5173` and `http://localhost:4000/api/dashboard/summary`.
- [ ] Open Overview and locate the controlled demo injector.
- [ ] Trigger `transient_503` once and verify a new incident appears in Incidents.
- [ ] In Recovery Center, run **Run Simulated Recovery** on that incident.
- [ ] Confirm verification text says simulated and does not claim a real external workflow was changed.
- [ ] Open Audit Logs and show the event trail.
- [ ] Optional: use seeded `INC-2048` to demonstrate sandbox + human approval.
- [ ] Keep the demo local. Do not enter production credentials or customer data.
