import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { recoveryPolicyEngine } from '../services/recoveryPolicyEngine.js';
import { redactSensitiveData } from '../services/evidenceCollector.js';
import { aiDiagnosticService, AIDiagnosisSchema } from '../services/aiDiagnosticService.js';
import { dbService } from '../db/database.js';

describe('AutoHeal AI Core Policies & Security Tests', () => {
  // 1. Credential and Sensitive Data Redaction
  describe('Evidence Collector - Data Redaction', () => {
    it('should redact sensitive keys (password, token, secret, pan, api_key)', () => {
      const sensitivePayload = {
        username: 'admin',
        password: 'SuperSecretPassword123!',
        api_key: 'sk_live_1234567890abcdef',
        customer: {
          name: 'Jane Doe',
          card_number: '4111222233334444',
          cvv: '123',
          nested_token: 'bearer my-token-999',
        },
        public_data: 'normal value',
      };

      const redacted = redactSensitiveData(sensitivePayload);
      expect(redacted.username).toBe('admin');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.customer.name).toBe('Jane Doe');
      expect(redacted.customer.card_number).toBe('[REDACTED]');
      expect(redacted.customer.cvv).toBe('[REDACTED]');
      expect(redacted.customer.nested_token).toBe('[REDACTED]');
      expect(redacted.public_data).toBe('normal value');
    });

    it('should redact Bearer authorization header strings', () => {
      const rawLog = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature';
      const redacted = redactSensitiveData(rawLog);
      expect(redacted).not.toContain('eyJhbGciOi');
    });
  });

  // 2. Recovery Policy Engine - Deterministic Failures
  describe('Recovery Policy Engine', () => {
    it('Transient server errors: bounded retries with max 3 and exponential backoff', () => {
      const policy = recoveryPolicyEngine.evaluatePolicy('transient_server_error', {
        correlation_id: 'test-1',
        timestamp: new Date().toISOString(),
        http_status: 503,
        affected_step: 'Gateway Settlement',
        raw_logs: [],
        idempotency_key: 'idem-test-1',
      });

      expect(policy.allowed).toBe(true);
      expect(policy.action_type).toBe('exponential_backoff_retry');
      expect(policy.max_retries).toBe(3);
      expect(policy.requires_human_approval).toBe(false);
      expect(policy.risk_level).toBe('low');
    });

    it('Authentication failures: must halt repeated retries (max_retries: 0) to prevent lockout', () => {
      const policy = recoveryPolicyEngine.evaluatePolicy('authentication_failure', {
        correlation_id: 'test-2',
        timestamp: new Date().toISOString(),
        http_status: 401,
        affected_step: 'OAuth Auth Step',
        raw_logs: [],
      });

      expect(policy.allowed).toBe(true);
      expect(policy.action_type).toBe('request_credential_repair');
      expect(policy.max_retries).toBe(0); // 0 retries
      expect(policy.requires_human_approval).toBe(true);
    });

    it('Network timeouts without idempotency: must prevent automatic retry and escalate', () => {
      const policy = recoveryPolicyEngine.evaluatePolicy('network_timeout', {
        correlation_id: 'test-3',
        timestamp: new Date().toISOString(),
        http_status: 504,
        affected_step: 'Remote Billing Call',
        raw_logs: [],
        // Missing idempotency_key
      });

      expect(policy.allowed).toBe(false);
      expect(policy.action_type).toBe('escalate_human_operator');
      expect(policy.risk_level).toBe('high');
      expect(policy.validation_errors.length).toBeGreaterThan(0);
    });

    it('Invalid business data: requests human correction and refuses to fabricate data', () => {
      const policy = recoveryPolicyEngine.evaluatePolicy('invalid_business_data', {
        correlation_id: 'test-4',
        timestamp: new Date().toISOString(),
        affected_step: 'Customer Provisioning',
        raw_logs: [],
      });

      expect(policy.action_type).toBe('request_business_data_correction');
      expect(policy.requires_human_approval).toBe(true);
      expect(policy.max_retries).toBe(0);
    });

    it('Schema drift / Unexpected output: requires human approval gate and pre-flight validation', () => {
      const policy = recoveryPolicyEngine.evaluatePolicy('unexpected_api_output', {
        correlation_id: 'test-5',
        timestamp: new Date().toISOString(),
        http_status: 500,
        affected_step: 'Step 4 (HubSpot Update)',
        raw_logs: [],
        idempotency_key: 'idem-5',
      });

      expect(policy.action_type).toBe('inject_payload_transformer');
      expect(policy.requires_human_approval).toBe(true);
      expect(policy.risk_level).toBe('medium_gated');
    });

    it('Disallowed and malicious parameters (shell injection) must be strictly rejected', () => {
      const maliciousParams = {
        command: 'rm -rf / && eval("malicious_code")',
      };

      const policy = recoveryPolicyEngine.evaluatePolicy(
        'unexpected_api_output',
        {
          correlation_id: 'test-hack',
          timestamp: new Date().toISOString(),
          affected_step: 'Step 1',
          raw_logs: [],
        },
        'inject_payload_transformer',
        maliciousParams
      );

      expect(policy.allowed).toBe(false);
      expect(policy.validation_errors.some((e) => e.includes('Unsafe parameters'))).toBe(true);
    });
  });

  // 3. AI Diagnostic Schema Validation
  describe('AI Diagnostic Schema & Deterministic Fallback', () => {
    it('Deterministic fallback should produce valid schema-compliant diagnosis', () => {
      const diagnosis = aiDiagnosticService.generateDeterministicDiagnosis(
        'Lead-to-CRM Sync',
        'Payload missing required contact_id',
        {
          correlation_id: 'corr-10',
          timestamp: new Date().toISOString(),
          affected_step: 'Step 4',
          raw_logs: ['missing contact_id'],
        },
        'Lead Sync'
      );

      const parsed = AIDiagnosisSchema.safeParse(diagnosis);
      expect(parsed.success).toBe(true);
      expect(diagnosis.failure_category).toBe('unexpected_api_output');
      expect(diagnosis.confidence).toBeGreaterThan(0.9);
      expect(diagnosis.is_deterministic_demo).toBe(true);
    });
  });

  // 4. API Endpoints & Ingestion Integration Tests
  describe('API Endpoints', () => {
    beforeEach(() => {
      // Ensure inc-2048 is awaiting_approval before each endpoint test
      dbService.updateIncident('inc-2048', {
        status: 'awaiting_approval',
        pipeline_stage: 6,
      });
    });

    it('GET /api/dashboard/summary returns operational statistics', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(200);
      expect(res.body.recovery_success_rate).toBeDefined();
      expect(res.body.platform_health).toBeInstanceOf(Array);
      expect(res.body.recent_incidents).toBeInstanceOf(Array);
    });

    it('GET /api/incidents returns seeded incidents including INC-2048', async () => {
      const res = await request(app).get('/api/incidents');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      const inc2048 = res.body.find((i: any) => i.incident_number === 'INC-2048');
      expect(inc2048).toBeDefined();
      expect(inc2048.status).toBe('awaiting_approval');
    });

    it('POST /api/webhooks/n8n requires shared secret and detects duplicate events', async () => {
      const unauthorized = await request(app).post('/api/webhooks/n8n').send({ workflow: { id: 'unauthorized' }, error: { message: 'no secret' } });
      expect(unauthorized.status).toBe(401);
      process.env.AUTOHEAL_WEBHOOK_SECRET = 'test-secret';
      const payload = {
        workflow: { id: 'wf-test-hook', name: 'Test Ingest Workflow' },
        execution: { id: 'exec-1234', lastNodeExecuted: 'Node X' },
        error: { message: 'Unique Test Error Message 99', httpCode: 500 },
        payload: { test: true },
      };

      // First call -> creates incident
      const firstRes = await request(app).post('/api/webhooks/n8n').set('X-AutoHeal-Webhook-Secret', 'test-secret').send(payload);
      expect(firstRes.status).toBe(201);
      expect(firstRes.body.duplicate).toBe(false);
      expect(firstRes.body.incident).toBeDefined();

      // Immediate second call -> detected as duplicate event
      const secondRes = await request(app).post('/api/webhooks/n8n').set('X-AutoHeal-Webhook-Secret', 'test-secret').send(payload);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.duplicate).toBe(true);
    });

    it('POST /api/incidents/:id/sandbox-test executes dry-run simulation', async () => {
      const res = await request(app).post('/api/incidents/inc-2048/sandbox-test').send();
      if (res.status !== 200) console.error('SANDBOX ERROR:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.sandbox_simulation.score).toBeGreaterThan(90);
      expect(res.body.sandbox_simulation.logs.length).toBeGreaterThan(0);
    });

    it('POST /api/incidents/:id/approve executes recovery and verifies outcome', async () => {
      const res = await request(app)
        .post('/api/incidents/inc-2048/approve')
        .send({ actor: 'Alex Chen (Staff SRE)' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('verified_healed');
      expect(res.body.pipeline_stage).toBe(8);
      expect(res.body.verification_result.passed).toBe(true);
      expect(res.body.verification_result.mode).toBe('simulated');
      expect(res.body.verification_result.details).toContain('no external workflow was changed');
    });

    it('POST /api/demo/trigger/:scenarioId triggers reproducible simulated failure', async () => {
      const res = await request(app).post('/api/demo/trigger/transient_503').send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.incident.failure_category).toBe('transient_server_error');
    });


    it('POST /api/incidents/:id/execute rejects gated recovery without prior approval', async () => {
      const created = await request(app).post('/api/demo/trigger/schema_drift_mismatch').send();
      expect(created.status).toBe(200);
      const id = created.body.incident.id;
      const res = await request(app).post(`/api/incidents/${id}/execute`).send();
      expect(res.status).toBe(400);
      expect(String(res.body.error)).toContain('requires explicit approval');
    });

    it('POST /api/demo/trigger rejects unknown scenario identifiers', async () => {
      const res = await request(app).post('/api/demo/trigger/not-a-real-scenario').send();
      expect(res.status).toBe(500);
      expect(String(res.body.error)).toContain('Unknown demo scenario');
    });

    it('GET /api/audit-logs records state transitions', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].action).toBeDefined();
    });
  });
});
