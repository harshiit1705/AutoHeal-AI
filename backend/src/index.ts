import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbService } from './db/database.js';
import { integrationAdapter } from './services/integrationAdapter.js';
import { aiDiagnosticService } from './services/aiDiagnosticService.js';
import { recoveryPolicyEngine } from './services/recoveryPolicyEngine.js';
import { recoveryExecutor } from './services/recoveryExecutor.js';
import { verificationService } from './services/verificationService.js';
import { DEMO_SCENARIOS, triggerDemoScenario } from './demo/scenarios.js';
import { PlatformType } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Non-browser local clients (curl/tests) have no Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by AutoHeal CORS policy'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Correlation-Id', 'X-AutoHeal-Webhook-Secret'],
}));
app.use(express.json({ limit: '256kb' }));

// Helper to safely get single param string
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// Correlation ID & Logging Middleware
app.use((req, res, next) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || `req-${Date.now()}`;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// 1. Dashboard Summary
app.get('/api/dashboard/summary', (req: Request, res: Response) => {
  try {
    const summary = dbService.getDashboardSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Workflows
app.get('/api/workflows', (req: Request, res: Response) => {
  try {
    const workflows = dbService.getWorkflows();
    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workflows/:id', (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const workflow = dbService.getWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Incidents
app.get('/api/incidents', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const incidents = dbService.getIncidents(status);
    res.json(incidents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/incidents/:id', (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const incident = dbService.getIncident(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Re-run AI Diagnosis on Incident
app.post('/api/incidents/:id/diagnose', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const incident = dbService.getIncident(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const diagnosis = await aiDiagnosticService.diagnoseIncident(
      incident.title,
      incident.error_message,
      incident.evidence,
      incident.workflow_name
    );

    const policy = recoveryPolicyEngine.evaluatePolicy(
      diagnosis.failure_category,
      incident.evidence,
      diagnosis.proposed_action,
      diagnosis.proposed_parameters
    );

    const safeGuarantees = recoveryPolicyEngine.generateGuarantees(
      incident.incident_number,
      policy,
      incident.evidence
    );

    const updated = dbService.updateIncident(incident.id, {
      ai_diagnosis: diagnosis,
      risk_level: policy.risk_level,
      safe_execution_guarantees: safeGuarantees,
    });

    dbService.addAuditLog({
      id: `aud-${Date.now()}-diag`,
      incident_id: incident.id,
      incident_number: incident.incident_number,
      actor: 'Local Demo Operator (identity not authenticated)',
      action: 'AI_DIAGNOSIS_TRIGGERED',
      details: { model: diagnosis.model, proposed_action: diagnosis.proposed_action },
      timestamp: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Ephemeral Sandbox Simulation
app.post('/api/incidents/:id/sandbox-test', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const incident = dbService.getIncident(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const sandbox = await recoveryExecutor.runSandboxSimulation(incident);

    const updated = dbService.updateIncident(incident.id, {
      sandbox_simulation: sandbox,
    });

    dbService.addAuditLog({
      id: `aud-${Date.now()}-sbx`,
      incident_id: incident.id,
      incident_number: incident.incident_number,
      actor: 'Local Demo Operator (identity not authenticated)',
      action: 'SANDBOX_SIMULATION_EXECUTED',
      details: { score: sandbox.score, status: sandbox.status },
      timestamp: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Review & Approve Proposal
app.post('/api/incidents/:id/approve', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const incident = dbService.getIncident(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const actor = 'Local Demo Operator (identity not authenticated)';
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.slice(0, 1000) : 'Approved via local demo console';

    const policy = recoveryPolicyEngine.evaluatePolicy(
      incident.failure_category, incident.evidence,
      incident.ai_diagnosis?.proposed_action, incident.ai_diagnosis?.proposed_parameters
    );
    if (!policy.allowed) return res.status(409).json({ error: 'Proposal is blocked by safety policy', validation_errors: policy.validation_errors });
    if (!policy.requires_human_approval) return res.status(409).json({ error: 'This proposal does not require approval; use the execution action only if policy permits.' });
    if (!incident.ai_diagnosis) return res.status(409).json({ error: 'Diagnose the incident before approving a proposal.' });
    if (incident.status === 'verified_healed' || incident.status === 'rejected' || incident.status === 'executing') {
      return res.status(409).json({ error: `Cannot approve an incident in state ${incident.status}.` });
    }

    dbService.addAuditLog({
      id: `aud-${Date.now()}-appr`,
      incident_id: incident.id,
      incident_number: incident.incident_number,
      actor,
      action: 'PROPOSAL_APPROVED',
      details: { comment, action_type: incident.ai_diagnosis?.proposed_action, proposal_fingerprint: JSON.stringify({ action: incident.ai_diagnosis?.proposed_action, parameters: incident.ai_diagnosis?.proposed_parameters ?? {} }) },
      timestamp: new Date().toISOString(),
    });

    // Execute recovery after approval
    const result = await recoveryExecutor.executeRecovery(incident.id, actor);
    res.json(result.incident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Reject Proposal
app.post('/api/incidents/:id/reject', (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const incident = dbService.getIncident(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const actor = 'Local Demo Operator (identity not authenticated)';
    const reason = req.body?.reason || 'Operator rejected automated remediation proposal.';

    dbService.addAuditLog({
      id: `aud-${Date.now()}-rej`,
      incident_id: incident.id,
      incident_number: incident.incident_number,
      actor,
      action: 'PROPOSAL_REJECTED',
      details: { reason },
      timestamp: new Date().toISOString(),
    });

    const updated = dbService.updateIncident(incident.id, {
      status: 'rejected',
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Controlled Recovery Execution
app.post('/api/incidents/:id/execute', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const actor = 'Local Demo Operator (identity not authenticated)';
    const result = await recoveryExecutor.executeRecovery(id, actor);
    res.json(result.incident);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Webhook Ingestion for n8n, Make, Zapier, Custom
app.post('/api/webhooks/:platform', async (req: Request, res: Response) => {
  try {
    const configuredSecret = process.env.AUTOHEAL_WEBHOOK_SECRET;
    const suppliedSecret = req.header('x-autoheal-webhook-secret');
    if (!configuredSecret || !suppliedSecret || suppliedSecret !== configuredSecret) {
      return res.status(401).json({ error: 'Webhook authentication failed. Configure AUTOHEAL_WEBHOOK_SECRET and send X-AutoHeal-Webhook-Secret.' });
    }
    const platform = getParam(req.params.platform) as PlatformType;
    if (!['n8n', 'make', 'zapier', 'custom_webhook', 'salesforce'].includes(platform)) {
      return res.status(400).json({ error: 'Unsupported webhook platform.' });
    }
    const event = integrationAdapter.normalizeEvent(platform, req.body);
    const outcome = await integrationAdapter.handleInboundEvent(event);
    res.status(outcome.duplicate ? 200 : 201).json(outcome);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Integrations Registry & Health
app.get('/api/integrations', (req: Request, res: Response) => {
  const integrations = [
    { id: 'n8n', name: 'n8n Workflow Automation', type: 'Workflow Engine', status: process.env.N8N_BASE_URL && process.env.N8N_API_KEY ? 'configured_unverified' : 'demo', endpoint: process.env.N8N_BASE_URL || 'Not configured', capabilities: ['webhook_ingestion'], auth_type: 'Server-side API key (optional)', active_workflows: 0, last_event_at: null },
    { id: 'make', name: 'Make.com (Integromat)', type: 'Integration Platform', status: 'demo', endpoint: 'Not configured', capabilities: ['webhook_ingestion'], auth_type: 'Not configured', active_workflows: 0, last_event_at: null },
    { id: 'salesforce', name: 'Salesforce REST Platform', type: 'CRM / Enterprise ERP', status: 'demo', endpoint: 'Not configured', capabilities: ['webhook_ingestion'], auth_type: 'Not configured', active_workflows: 0, last_event_at: null },
    { id: 'zapier', name: 'Zapier Webhooks', type: 'Automation Middleware', status: 'demo', endpoint: 'Not configured', capabilities: ['webhook_ingestion'], auth_type: 'Shared webhook secret required', active_workflows: 0, last_event_at: null },
    { id: 'custom_webhook', name: 'Custom Service Webhooks', type: 'Internal Microservices', status: process.env.AUTOHEAL_WEBHOOK_SECRET ? 'configured_unverified' : 'not_configured', endpoint: '/api/webhooks/custom_webhook', capabilities: ['authenticated_event_ingestion'], auth_type: 'X-AutoHeal-Webhook-Secret', active_workflows: 0, last_event_at: null },
  ];
  res.json(integrations);
});

app.post('/api/integrations/:id/test', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  if (id === 'n8n' && process.env.N8N_BASE_URL && process.env.N8N_API_KEY) {
    return res.status(501).json({ id, connected: false, status: 'configured_unverified', checked_at: new Date().toISOString(), message: 'Credentials are configured, but a supported authenticated n8n connection probe is not implemented in this prototype.' });
  }
  return res.status(200).json({ id, connected: false, status: 'demo', checked_at: new Date().toISOString(), message: 'No live connection test is implemented. This platform is demo/simulated; no external service was contacted.' });
});

// 11. Audit Logs
app.get('/api/audit-logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const logs = dbService.getAuditLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Demo Scenarios
app.get('/api/demo/scenarios', (req: Request, res: Response) => {
  res.json(DEMO_SCENARIOS);
});

app.post('/api/demo/trigger/:scenarioId', async (req: Request, res: Response) => {
  try {
    const scenarioId = getParam(req.params.scenarioId);
    const incident = await triggerDemoScenario(scenarioId);
    res.json({
      success: true,
      message: `Demo scenario "${scenarioId}" triggered.`,
      incident,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vercel requires a default-exported request handler. Keep the named export
// for existing tests/imports, and only open a local HTTP listener outside Vercel.
export { app };
export default app;

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const HOST = process.env.HOST || '127.0.0.1';
  app.listen(Number(PORT), HOST, () => {
    console.log(`AutoHeal AI Backend running on http://${HOST}:${PORT}`);
  });
}
