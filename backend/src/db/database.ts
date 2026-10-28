import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import {
  Workflow,
  Incident,
  AuditLog,
  DashboardSummary,
  FailureCategory,
  RecoveryActionType,
  IncidentStatus,
  RiskLevel
} from '../types.js';

const DB_DIR = '/tmp/autoheal-data';

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'autoheal.sqlite');

export class DatabaseService {
  private db: DatabaseSync;

  constructor(filePath: string = DB_FILE) {
    this.db = new DatabaseSync(filePath);
    this.initTables();
    this.seedInitialData();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        cluster TEXT NOT NULL,
        target_step TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        last_run_at TEXT NOT NULL,
        success_rate REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        incident_number TEXT UNIQUE NOT NULL,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        cluster TEXT NOT NULL,
        title TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_code TEXT,
        http_status INTEGER,
        failure_category TEXT NOT NULL,
        status TEXT NOT NULL,
        pipeline_stage INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        ai_diagnosis_json TEXT,
        safe_execution_json TEXT NOT NULL,
        sandbox_simulation_json TEXT NOT NULL,
        execution_progress_json TEXT,
        verification_result_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        incident_id TEXT,
        incident_number TEXT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        details_json TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS event_dedup (
        signature TEXT PRIMARY KEY,
        seen_at INTEGER NOT NULL
      );
    `);
  }

  private seedInitialData(): void {
    const countCheck = this.db.prepare('SELECT count(*) as count FROM workflows').get() as { count: number };
    if (countCheck.count > 0) {
      return;
    }

    // Seed workflows
    const seedWorkflows: Workflow[] = [
      {
        id: 'wf-9942',
        name: 'Lead-to-CRM Sync',
        platform: 'n8n',
        status: 'degraded',
        cluster: 'us-east-1',
        target_step: 'Step 4 (HubSpot Batch Updater)',
        webhook_url: '/api/webhooks/n8n/wf-9942',
        capabilities: {
          can_retry_step: true,
          can_resume: true,
          can_replay_payload: true,
          supports_idempotency: true,
        },
        last_run_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        success_rate: 98.4,
      },
      {
        id: 'wf-55121',
        name: 'Invoice Payment Webhook',
        platform: 'make',
        status: 'degraded',
        cluster: 'eu-west-1',
        target_step: 'Step 2 (Stripe Settlement Gateway)',
        webhook_url: '/api/webhooks/make/wf-55121',
        capabilities: {
          can_retry_step: false,
          can_resume: true,
          can_replay_payload: true,
          supports_idempotency: true,
        },
        last_run_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        success_rate: 99.1,
      },
      {
        id: 'wf-3301',
        name: 'Inventory Sync ERP',
        platform: 'salesforce',
        status: 'healthy',
        cluster: 'us-west-2',
        target_step: 'SKU_Batch_Master REST Sync',
        webhook_url: '/api/webhooks/salesforce/wf-3301',
        capabilities: {
          can_retry_step: true,
          can_resume: true,
          can_replay_payload: false,
          supports_idempotency: true,
        },
        last_run_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        success_rate: 99.98,
      },
      {
        id: 'wf-1092',
        name: 'Customer Onboarding Provisioner',
        platform: 'zapier',
        status: 'healthy',
        cluster: 'us-east-2',
        target_step: 'Step 3 (Okta SSO provisioning)',
        webhook_url: '/api/webhooks/zapier/wf-1092',
        capabilities: {
          can_retry_step: false,
          can_resume: true,
          can_replay_payload: true,
          supports_idempotency: false,
        },
        last_run_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        success_rate: 99.5,
      },
    ];

    for (const wf of seedWorkflows) {
      this.db.prepare(`
        INSERT INTO workflows (id, name, platform, status, cluster, target_step, webhook_url, capabilities_json, last_run_at, success_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        wf.id,
        wf.name,
        wf.platform,
        wf.status,
        wf.cluster,
        wf.target_step,
        wf.webhook_url,
        JSON.stringify(wf.capabilities),
        wf.last_run_at,
        wf.success_rate
      );
    }

    // Seed the 3 original Stitch Incidents: INC-2048, INC-2045, INC-2041
    const seedIncidents: Incident[] = [
      {
        id: 'inc-2048',
        incident_number: 'INC-2048',
        workflow_id: 'wf-9942',
        workflow_name: 'Lead-to-CRM Sync',
        platform: 'n8n',
        cluster: 'us-east-1',
        title: 'Lead-to-CRM Sync Schema Drift',
        error_message: 'Payload missing required contact_id from CRM webhook response.',
        error_code: 'SCHEMA_KEY_MISSING',
        http_status: 500,
        failure_category: 'unexpected_api_output',
        status: 'awaiting_approval',
        pipeline_stage: 6, // 06 SIGN-OFF
        risk_level: 'medium_gated',
        evidence: {
          correlation_id: 'corr-9942-8781',
          timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
          http_status: 500,
          error_code: 'ERR_MISSING_PROPERTY',
          error_stack: 'ValidationError: Field "contact_id" is mandatory for HubSpot v3 batch update\n    at n8n-nodes-base/dist/nodes/Hubspot/Hubspot.node.js:142:19\n    at Workflow.runNode (Workflow.js:1152:28)',
          redacted_payload: {
            source: 'typeform_webhook',
            submission_id: 'sub_9921',
            email: 'user_candidate@enterprise.io',
            id: 'crm_ref_882910', // Key discrepancy: sent 'id' instead of 'contact_id'
            auth_token: '[REDACTED_BEARER_TOKEN]',
            secret_key: '[REDACTED]',
          },
          raw_logs: [
            '[14:32:01] Inbound webhook received from Typeform trigger',
            '[14:32:02] Step 1 (Parse JSON) completed successfully [2ms]',
            '[14:32:03] Step 2 (Enrich Lead) clearbit API returned 200 OK [124ms]',
            '[14:32:04] Step 3 (Format Schema) applied template standard',
            '[14:32:05] Step 4 (HubSpot Update) Threw HTTP 500: Missing required field "contact_id"',
            '[14:32:05] Execution halted. Incident caught by AutoHeal Observer.',
          ],
          affected_step: 'Step 4 (HubSpot Batch Updater)',
          idempotency_key: 'idem-crm-sync-9942-882910',
        },
        ai_diagnosis: {
          model: 'gemini-2.5-flash',
          failure_category: 'unexpected_api_output',
          likely_cause: 'Schema Drift / Missing Field: Webhook payload contains "id" instead of "contact_id" expected by downstream HubSpot update step.',
          supporting_evidence: [
            'Inbound payload includes {"id": "crm_ref_882910"}',
            'HubSpot API node rejects payload with ValidationError: "contact_id" is mandatory',
            'Historical execution trace #9941 used format {"contact_id": "crm_ref_..."}',
          ],
          alternative_explanations: [
            'API endpoint changed to HubSpot v4 schema without backward compatibility',
            'Upstream provider Typeform modified webhook output mapping',
          ],
          confidence: 0.96,
          proposed_action: 'inject_payload_transformer',
          proposed_parameters: {
            mapping: { 'response.id': 'contact_id' },
            ephemeral_adapter: true,
            resume_step: 'Step 4 (HubSpot Update)',
            bounded_retries: 2,
          },
          risk_level: 'medium_gated',
          requires_approval: true,
          validation_plan: 'Execute ephemeral sandbox dry-run with synthesized mapping adapter against isolated schema mock.',
          is_deterministic_demo: false,
        },
        safe_execution_guarantees: {
          idempotency_preserved: true,
          idempotency_key: 'idem-crm-sync-9942-882910',
          state_snapshot_url: 's3://autoheal-backups/snap-9942-01',
          rollback_compensation: 'If step 5 fails post injection, trigger state revert to snapshot and broadcast alert to #ops-alerts Slack channel within 500ms.',
          required_role: 'Staff Reliability Eng',
          timeout_remaining: '17m',
          escalation_rule: 'PagerDuty on-call dispatch at T-0',
        },
        sandbox_simulation: {
          status: 'passed',
          score: 98,
          pass_rate: 100,
          logs: [
            { time: '14:35:10', level: 'INIT', message: 'Initializing ephemeral sandbox runner...' },
            { time: '14:35:11', level: 'DIFF', message: 'Replaying buffered payload with adapter patch...' },
            { time: '14:35:12', level: 'EXEC', message: 'Downstream step 4 executed in 11ms. Status: OK 200.' },
            { time: '14:35:12', level: 'SCORE', message: 'Pre-execution safety score: 98/100 (Ready for Sign-off)' },
          ],
        },
        created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: 'inc-2045',
        incident_number: 'INC-2045',
        workflow_id: 'wf-55121',
        workflow_name: 'Invoice Payment Webhook',
        platform: 'make',
        cluster: 'eu-west-1',
        title: 'Stripe Settlement Gateway Transient 503',
        error_message: 'Stripe Settlement Gateway returned HTTP 503 Service Unavailable.',
        error_code: 'GATEWAY_TIMEOUT_503',
        http_status: 503,
        failure_category: 'transient_server_error',
        status: 'executing',
        pipeline_stage: 7, // 07 EXECUTE
        risk_level: 'low',
        evidence: {
          correlation_id: 'corr-55121-1029',
          timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
          http_status: 503,
          error_code: 'SERVICE_UNAVAILABLE',
          error_stack: 'HTTPError: 503 Service Unavailable from api.stripe.com/v1/invoices\n    at MakeRunner.execute (MakeEngine.js:88:12)',
          redacted_payload: {
            invoice_id: 'in_1M7abcXYZ990',
            amount_cents: 489000,
            currency: 'usd',
            card_token: '[REDACTED_PAN_TOKEN]',
          },
          raw_logs: [
            '[14:40:11] Webhook triggered from Billing Portal',
            '[14:40:12] Initiated payout dispatch to gateway',
            '[14:40:13] Remote host returned 503 Service Unavailable',
            '[14:40:13] AutoHeal classified transient server error. Policy: Autonomous Eligible.',
          ],
          affected_step: 'Step 2 (Stripe Settlement Gateway)',
          idempotency_key: 'idem-inv-pay-55121-1M7',
        },
        ai_diagnosis: {
          model: 'gemini-2.5-flash',
          failure_category: 'transient_server_error',
          likely_cause: 'Temporary remote dependency throttling / downstream 503 gateway degradation.',
          supporting_evidence: [
            'HTTP 503 response header "Retry-After: 30"',
            'Stripe public status page reports localized webhook latency in eu-west-1',
          ],
          alternative_explanations: ['Rate limit reached on merchant account'],
          confidence: 0.99,
          proposed_action: 'exponential_backoff_retry',
          proposed_parameters: {
            max_retries: 3,
            initial_backoff_sec: 15,
            jitter_sec: 120,
            preserve_idempotency_key: true,
          },
          risk_level: 'low',
          requires_approval: false,
          validation_plan: 'Verify idempotency key header present before each retry packet.',
          is_deterministic_demo: false,
        },
        safe_execution_guarantees: {
          idempotency_preserved: true,
          idempotency_key: 'idem-inv-pay-55121-1M7',
          state_snapshot_url: 's3://autoheal-backups/snap-55121-02',
          rollback_compensation: 'Halt on 3rd failure and hold invoice state in pending ledger.',
          required_role: 'Automated Agent',
          timeout_remaining: 'N/A',
          escalation_rule: 'Escalate to billing team if 3 attempts fail',
        },
        sandbox_simulation: {
          status: 'passed',
          score: 100,
          pass_rate: 100,
          logs: [
            { time: '14:41:00', level: 'INIT', message: 'Evaluating bounded retry safety profile...' },
            { time: '14:41:01', level: 'EXEC', message: 'Idempotency key header validated against duplicate charges.' },
            { time: '14:41:02', level: 'SCORE', message: 'Safety validation passed. Autonomous execution authorized.' },
          ],
        },
        execution_progress: {
          current_step: 2,
          total_steps: 3,
          step_description: 'Exponential backoff retry with 120s jitter window (Next backoff step in 14s...)',
          percentage: 66,
        },
        created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
      {
        id: 'inc-2041',
        incident_number: 'INC-2041',
        workflow_id: 'wf-3301',
        workflow_name: 'Inventory Sync ERP',
        platform: 'salesforce',
        cluster: 'us-west-2',
        title: 'OAuth2 Expired Token on SKU Batch Update',
        error_message: 'Salesforce REST returned HTTP 401 Unauthorized: Session expired or invalid.',
        error_code: 'OAUTH_TOKEN_EXPIRED',
        http_status: 401,
        failure_category: 'authentication_failure',
        status: 'verified_healed',
        pipeline_stage: 8, // 08 VERIFY
        risk_level: 'low',
        evidence: {
          correlation_id: 'corr-3301-4412',
          timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          http_status: 401,
          error_code: 'INVALID_SESSION_ID',
          error_stack: 'SessionExpired: Session expired or invalid\n    at SalesforceClient.request (SalesforceClient.js:212:11)',
          redacted_payload: {
            batch_count: 350,
            target_object: 'SKU_Batch_Master',
            client_id: '3MVG9...[REDACTED]',
            client_secret: '[REDACTED]',
          },
          raw_logs: [
            '[10:45:00] Batch job #4412 started for 350 ERP catalog entries',
            '[10:45:01] Salesforce endpoint rejected request: 401 Unauthorized',
            '[10:45:02] AutoHeal detected auth token expiration. Halted retry to prevent account lockout.',
            '[10:45:04] Performed secure server-side OAuth2 client credentials token refresh.',
            '[10:45:06] Re-executed batch with refreshed token. Status: 200 OK. 350 lines committed.',
            '[10:45:08] SLA assertion passed. Incident verified healed.',
          ],
          affected_step: 'SKU_Batch_Master REST Sync',
          idempotency_key: 'idem-erp-sku-3301-4412',
        },
        ai_diagnosis: {
          model: 'gemini-2.5-flash',
          failure_category: 'authentication_failure',
          likely_cause: 'OAuth2 bearer token expired mid-schedule during batch sync window.',
          supporting_evidence: ['HTTP 401 with INVALID_SESSION_ID', 'Token issued > 24 hours prior'],
          alternative_explanations: ['Credentials revoked in Connected App configuration'],
          confidence: 0.99,
          proposed_action: 'request_credential_repair',
          proposed_parameters: {
            refresh_flow: 'client_credentials',
            re_execute_batch: true,
          },
          risk_level: 'low',
          requires_approval: false,
          validation_plan: 'Verify refreshed token scopes before dispatching ERP batch.',
          is_deterministic_demo: false,
        },
        safe_execution_guarantees: {
          idempotency_preserved: true,
          idempotency_key: 'idem-erp-sku-3301-4412',
          state_snapshot_url: 's3://autoheal-backups/snap-3301-01',
          rollback_compensation: 'N/A - Read-before-write transaction.',
          required_role: 'Automated Agent',
          timeout_remaining: 'N/A',
          escalation_rule: 'Escalate to IT Ops if refresh handshake returns 400',
        },
        sandbox_simulation: {
          status: 'passed',
          score: 100,
          pass_rate: 100,
          logs: [
            { time: '10:45:03', level: 'INIT', message: 'Simulating OAuth token renewal handshake...' },
            { time: '10:45:04', level: 'EXEC', message: 'Token refresh endpoint verified. Ready for execution.' },
          ],
        },
        verification_result: {
          passed: true,
          checked_at: new Date(Date.now() - 1000 * 60 * 238).toISOString(),
          sla_assertion: 'Zero dropped records. 350/350 SKU lines committed to Salesforce REST.',
          details: 'Triggered token refresh via OAuth2 handshake and cleanly re-executed failed batch of 350 ERP lines with zero payload drop.',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 238).toISOString(),
      },
    ];

    for (const inc of seedIncidents) {
      this.insertIncident(inc);
    }

    // Seed initial audit logs
    const seedAuditLogs: AuditLog[] = [
      {
        id: 'aud-1',
        incident_id: 'inc-2041',
        incident_number: 'INC-2041',
        actor: 'AutoHeal Observer',
        action: 'INCIDENT_DETECTED',
        details: { category: 'authentication_failure', code: 'INVALID_SESSION_ID' },
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
      {
        id: 'aud-2',
        incident_id: 'inc-2041',
        incident_number: 'INC-2041',
        actor: 'AutoHeal AI',
        action: 'DIAGNOSIS_SYNTHESIZED',
        details: { confidence: 0.99, proposed_action: 'request_credential_repair' },
        timestamp: new Date(Date.now() - 1000 * 60 * 239).toISOString(),
      },
      {
        id: 'aud-3',
        incident_id: 'inc-2041',
        incident_number: 'INC-2041',
        actor: 'Recovery Policy Engine',
        action: 'POLICY_VALIDATED',
        details: { action: 'request_credential_repair', auto_eligible: true },
        timestamp: new Date(Date.now() - 1000 * 60 * 239).toISOString(),
      },
      {
        id: 'aud-4',
        incident_id: 'inc-2041',
        incident_number: 'INC-2041',
        actor: 'Verification Service',
        action: 'INCIDENT_VERIFIED_HEALED',
        details: { records_committed: 350, outcome: 'SUCCESS_200' },
        timestamp: new Date(Date.now() - 1000 * 60 * 238).toISOString(),
      },
      {
        id: 'aud-5',
        incident_id: 'inc-2048',
        incident_number: 'INC-2048',
        actor: 'AutoHeal Observer',
        action: 'INCIDENT_DETECTED',
        details: { category: 'unexpected_api_output', step: 'Step 4 (HubSpot Update)' },
        timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      },
      {
        id: 'aud-6',
        incident_id: 'inc-2048',
        incident_number: 'INC-2048',
        actor: 'AutoHeal AI',
        action: 'DIAGNOSIS_SYNTHESIZED',
        details: { confidence: 0.96, root_cause: 'Schema Drift / Missing contact_id' },
        timestamp: new Date(Date.now() - 1000 * 60 * 41).toISOString(),
      },
      {
        id: 'aud-7',
        incident_id: 'inc-2048',
        incident_number: 'INC-2048',
        actor: 'Recovery Policy Engine',
        action: 'HUMAN_GATE_REQUIRED',
        details: { risk_level: 'medium_gated', required_role: 'Staff Reliability Eng' },
        timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ];

    for (const log of seedAuditLogs) {
      this.addAuditLog(log);
    }
  }

  /** Atomically claims an event fingerprint; persists across backend restarts. */
  public claimEventSignature(signature: string, now: number, windowMs: number): boolean {
    const result = this.db.prepare(`
      INSERT INTO event_dedup (signature, seen_at) VALUES (?, ?)
      ON CONFLICT(signature) DO UPDATE SET seen_at = excluded.seen_at
      WHERE event_dedup.seen_at <= ?
    `).run(signature, now, now - windowMs);
    return Number(result.changes) > 0;
  }

  public insertWorkflow(wf: Workflow): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO workflows (id, name, platform, status, cluster, target_step, webhook_url, capabilities_json, last_run_at, success_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      wf.id,
      wf.name,
      wf.platform,
      wf.status,
      wf.cluster,
      wf.target_step,
      wf.webhook_url,
      JSON.stringify(wf.capabilities),
      wf.last_run_at,
      wf.success_rate
    );
  }

  public getWorkflows(): Workflow[] {
    const rows = this.db.prepare('SELECT * FROM workflows ORDER BY name ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      platform: r.platform,
      status: r.status,
      cluster: r.cluster,
      target_step: r.target_step,
      webhook_url: r.webhook_url,
      capabilities: JSON.parse(r.capabilities_json),
      last_run_at: r.last_run_at,
      success_rate: r.success_rate,
    }));
  }

  public getWorkflow(id: string): Workflow | null {
    const r = this.db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      platform: r.platform,
      status: r.status,
      cluster: r.cluster,
      target_step: r.target_step,
      webhook_url: r.webhook_url,
      capabilities: JSON.parse(r.capabilities_json),
      last_run_at: r.last_run_at,
      success_rate: r.success_rate,
    };
  }

  public updateWorkflow(id: string, update: Partial<Workflow>): void {
    const wf = this.getWorkflow(id);
    if (!wf) return;
    const merged = { ...wf, ...update };
    this.db.prepare(`
      UPDATE workflows
      SET name = ?, platform = ?, status = ?, cluster = ?, target_step = ?, webhook_url = ?, capabilities_json = ?, last_run_at = ?, success_rate = ?
      WHERE id = ?
    `).run(
      merged.name,
      merged.platform,
      merged.status,
      merged.cluster,
      merged.target_step,
      merged.webhook_url,
      JSON.stringify(merged.capabilities),
      merged.last_run_at,
      merged.success_rate,
      id
    );
  }

  public insertIncident(inc: Incident): void {
    this.db.prepare(`
      INSERT INTO incidents (
        id, incident_number, workflow_id, workflow_name, platform, cluster,
        title, error_message, error_code, http_status, failure_category,
        status, pipeline_stage, risk_level, evidence_json, ai_diagnosis_json,
        safe_execution_json, sandbox_simulation_json, execution_progress_json,
        verification_result_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inc.id,
      inc.incident_number,
      inc.workflow_id,
      inc.workflow_name,
      inc.platform,
      inc.cluster,
      inc.title,
      inc.error_message,
      inc.error_code ?? null,
      inc.http_status ?? null,
      inc.failure_category,
      inc.status,
      inc.pipeline_stage,
      inc.risk_level,
      JSON.stringify(inc.evidence),
      inc.ai_diagnosis ? JSON.stringify(inc.ai_diagnosis) : null,
      JSON.stringify(inc.safe_execution_guarantees),
      JSON.stringify(inc.sandbox_simulation),
      inc.execution_progress ? JSON.stringify(inc.execution_progress) : null,
      inc.verification_result ? JSON.stringify(inc.verification_result) : null,
      inc.created_at,
      inc.updated_at
    );
  }

  public getIncidents(statusFilter?: string): Incident[] {
    let query = 'SELECT * FROM incidents';
    const params: any[] = [];
    if (statusFilter && statusFilter !== 'all') {
      query += ' WHERE status = ?';
      params.push(statusFilter);
    }
    query += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.mapIncidentRow);
  }

  public getIncident(idOrNumber: string): Incident | null {
    const row = this.db.prepare(
      'SELECT * FROM incidents WHERE id = ? OR incident_number = ?'
    ).get(idOrNumber, idOrNumber) as any;
    if (!row) return null;
    return this.mapIncidentRow(row);
  }

  public updateIncident(id: string, update: Partial<Incident>): Incident | null {
    const existing = this.getIncident(id);
    if (!existing) return null;
    const merged: Incident = {
      ...existing,
      ...update,
      updated_at: new Date().toISOString(),
    };

    this.db.prepare(`
      UPDATE incidents
      SET workflow_id = ?, workflow_name = ?, platform = ?, cluster = ?,
          title = ?, error_message = ?, error_code = ?, http_status = ?, failure_category = ?,
          status = ?, pipeline_stage = ?, risk_level = ?, evidence_json = ?, ai_diagnosis_json = ?,
          safe_execution_json = ?, sandbox_simulation_json = ?, execution_progress_json = ?,
          verification_result_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.workflow_id,
      merged.workflow_name,
      merged.platform,
      merged.cluster,
      merged.title,
      merged.error_message,
      merged.error_code ?? null,
      merged.http_status ?? null,
      merged.failure_category,
      merged.status,
      merged.pipeline_stage,
      merged.risk_level,
      JSON.stringify(merged.evidence),
      merged.ai_diagnosis ? JSON.stringify(merged.ai_diagnosis) : null,
      JSON.stringify(merged.safe_execution_guarantees),
      JSON.stringify(merged.sandbox_simulation),
      merged.execution_progress ? JSON.stringify(merged.execution_progress) : null,
      merged.verification_result ? JSON.stringify(merged.verification_result) : null,
      merged.updated_at,
      existing.id
    );

    return merged;
  }

  public addAuditLog(log: AuditLog): void {
    this.db.prepare(`
      INSERT INTO audit_logs (id, incident_id, incident_number, actor, action, details_json, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.incident_id ?? null,
      log.incident_number ?? null,
      log.actor,
      log.action,
      JSON.stringify(log.details),
      log.timestamp
    );
  }

  public getAuditLogs(limit: number = 50): AuditLog[] {
    const rows = this.db.prepare(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      incident_id: r.incident_id,
      incident_number: r.incident_number,
      actor: r.actor,
      action: r.action,
      details: JSON.parse(r.details_json),
      timestamp: r.timestamp,
    }));
  }

  public getDashboardSummary(): DashboardSummary {
    const allIncidents = this.getIncidents();
    const awaitingApproval = allIncidents.filter((i) => i.status === 'awaiting_approval').length;
    const executing = allIncidents.filter((i) => i.status === 'executing').length;
    const verified = allIncidents.filter((i) => i.status === 'verified_healed').length;
    const escalated = allIncidents.filter((i) => i.status === 'escalated').length;
    const workflows = this.getWorkflows();

    return {
      recovery_success_rate: (verified + escalated) > 0 ? Number(((verified / (verified + escalated)) * 100).toFixed(1)) : 0,
      mttr_seconds: 0, // Not measured in this prototype
      total_incidents_caught: allIncidents.length,
      awaiting_approval_count: awaitingApproval,
      executing_count: executing,
      verified_healed_count: verified,
      escalated_count: escalated,
      active_workflows_monitored: workflows.length,
      mode: 'Supervised Mode',
      recent_incidents: allIncidents.slice(0, 5),
      platform_health: [
        { platform: 'n8n', status: 'demo', latency_ms: null, active_workflows: 0 },
        { platform: 'Make', status: 'demo', latency_ms: null, active_workflows: 0 },
        { platform: 'Salesforce', status: 'demo', latency_ms: null, active_workflows: 0 },
        { platform: 'Zapier', status: 'demo', latency_ms: null, active_workflows: 0 },
      ],
    };
  }

  private mapIncidentRow(row: any): Incident {
    return {
      id: row.id,
      incident_number: row.incident_number,
      workflow_id: row.workflow_id,
      workflow_name: row.workflow_name,
      platform: row.platform,
      cluster: row.cluster,
      title: row.title,
      error_message: row.error_message,
      error_code: row.error_code ?? undefined,
      http_status: row.http_status ?? undefined,
      failure_category: row.failure_category,
      status: row.status,
      pipeline_stage: row.pipeline_stage,
      risk_level: row.risk_level,
      evidence: JSON.parse(row.evidence_json),
      ai_diagnosis: row.ai_diagnosis_json ? JSON.parse(row.ai_diagnosis_json) : undefined,
      safe_execution_guarantees: JSON.parse(row.safe_execution_json),
      sandbox_simulation: JSON.parse(row.sandbox_simulation_json),
      execution_progress: row.execution_progress_json ? JSON.parse(row.execution_progress_json) : undefined,
      verification_result: row.verification_result_json ? JSON.parse(row.verification_result_json) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const dbService = new DatabaseService();
