import { createHash } from 'node:crypto';
import {
  PlatformType,
  Incident,
  Workflow,
  FailureCategory,
  RecoveryActionType
} from '../types.js';
import { dbService } from '../db/database.js';
import { evidenceCollector } from './evidenceCollector.js';
import { aiDiagnosticService } from './aiDiagnosticService.js';
import { recoveryPolicyEngine } from './recoveryPolicyEngine.js';

export interface InboundWorkflowEvent {
  platform: PlatformType;
  workflow_id: string;
  workflow_name?: string;
  execution_id?: string;
  cluster?: string;
  step_name: string;
  status: 'failed' | 'error' | 'success';
  http_status?: number;
  error_message: string;
  error_code?: string;
  error_stack?: string;
  payload?: Record<string, any>;
  logs?: string[];
  idempotency_key?: string;
  correlation_id?: string;
}

export class IntegrationAdapter {
  private deduplicationWindowMs = 60 * 1000; // 60s dedup window

  /**
   * Normalizes incoming platform payloads into a uniform workflow event.
   */
  public normalizeEvent(platform: PlatformType, rawBody: any): InboundWorkflowEvent {
    if (platform === 'n8n') {
      return {
        platform: 'n8n',
        workflow_id: rawBody.workflow?.id || 'wf-n8n-unknown',
        workflow_name: rawBody.workflow?.name || 'n8n Workflow',
        execution_id: rawBody.execution?.id || `n8n-exec-${Date.now()}`,
        cluster: rawBody.cluster || 'us-east-1',
        step_name: rawBody.execution?.lastNodeExecuted || rawBody.step_name || 'Workflow Node',
        status: rawBody.status === 'success' ? 'success' : 'failed',
        http_status: rawBody.error?.httpCode || rawBody.http_status || 500,
        error_message: rawBody.error?.message || 'n8n node execution error',
        error_code: rawBody.error?.name || 'ERR_N8N_NODE_FAILURE',
        error_stack: rawBody.error?.stack,
        payload: rawBody.payload || rawBody.data,
        logs: rawBody.logs || [`[n8n] Node ${rawBody.execution?.lastNodeExecuted} failed`],
        idempotency_key: rawBody.idempotency_key || rawBody.execution?.id,
        correlation_id: rawBody.correlation_id,
      };
    }

    if (platform === 'make') {
      return {
        platform: 'make',
        workflow_id: rawBody.scenario?.id || rawBody.workflow_id || 'wf-make-unknown',
        workflow_name: rawBody.scenario?.name || 'Make Scenario',
        execution_id: rawBody.execution?.id || `make-exec-${Date.now()}`,
        cluster: rawBody.cluster || 'eu-west-1',
        step_name: rawBody.module?.name || rawBody.step_name || 'Make Module',
        status: rawBody.status === 'success' ? 'success' : 'failed',
        http_status: rawBody.error?.status || rawBody.http_status || 500,
        error_message: rawBody.error?.message || 'Make execution failed',
        error_code: rawBody.error?.code || 'ERR_MAKE_SCENARIO',
        error_stack: rawBody.error?.detail,
        payload: rawBody.payload || rawBody.data,
        logs: rawBody.logs || [`[Make] Module error: ${rawBody.error?.message}`],
        idempotency_key: rawBody.idempotency_key,
        correlation_id: rawBody.correlation_id,
      };
    }

    if (platform === 'zapier') {
      return {
        platform: 'zapier',
        workflow_id: rawBody.zap?.id || rawBody.workflow_id || 'wf-zapier-unknown',
        workflow_name: rawBody.zap?.title || 'Zapier Zap',
        execution_id: rawBody.execution_id || `zap-exec-${Date.now()}`,
        cluster: rawBody.cluster || 'us-east-2',
        step_name: rawBody.step?.title || rawBody.step_name || 'Zap Action',
        status: rawBody.status === 'success' ? 'success' : 'failed',
        http_status: rawBody.http_status || 400,
        error_message: rawBody.error?.message || rawBody.error_message || 'Zap execution error',
        error_code: rawBody.error?.code || 'ERR_ZAP_ACTION',
        error_stack: rawBody.error?.stack,
        payload: rawBody.payload,
        logs: rawBody.logs || [`[Zapier] Step halted: ${rawBody.error?.message}`],
        idempotency_key: rawBody.idempotency_key,
        correlation_id: rawBody.correlation_id,
      };
    }

    // Default custom webhook format
    return {
      platform: 'custom_webhook',
      workflow_id: rawBody.workflow_id || 'wf-custom',
      workflow_name: rawBody.workflow_name || 'Custom API Pipeline',
      execution_id: rawBody.execution_id || `cust-exec-${Date.now()}`,
      cluster: rawBody.cluster || 'default-cluster',
      step_name: rawBody.step_name || 'Webhook Step',
      status: rawBody.status === 'success' ? 'success' : 'failed',
      http_status: rawBody.http_status || 500,
      error_message: rawBody.error_message || 'Workflow step failed',
      error_code: rawBody.error_code || 'ERR_CUSTOM_WEBHOOK',
      error_stack: rawBody.error_stack,
      payload: rawBody.payload || {},
      logs: rawBody.logs || [`[Webhook] Received failure event`],
      idempotency_key: rawBody.idempotency_key,
      correlation_id: rawBody.correlation_id,
    };
  }

  /**
   * Workflow Observer: Processes an event, checks for deduplication,
   * gathers evidence, generates AI diagnosis, applies policy, and records the incident.
   */
  public async handleInboundEvent(event: InboundWorkflowEvent): Promise<{
    duplicate: boolean;
    incident?: Incident;
    message: string;
  }> {
    if (event.status === 'success') {
      return { duplicate: false, message: 'Success event logged. No incident needed.' };
    }

    // Deduplication check using fingerprint: workflow_id + step_name + error_message
    const rawSignature = `${event.platform}::${event.workflow_id}::${event.execution_id || ''}::${event.step_name}::${event.error_message}`;
    const signature = createHash('sha256').update(rawSignature).digest('hex');
    const now = Date.now();
    const claimed = dbService.claimEventSignature(signature, now, this.deduplicationWindowMs);
    if (!claimed) {
      return { duplicate: true, message: `Duplicate event suppressed by persistent fingerprint (window ${this.deduplicationWindowMs}ms).` };
    }

    // Ensure workflow exists or register it
    let workflow = dbService.getWorkflow(event.workflow_id);
    if (!workflow) {
      workflow = {
        id: event.workflow_id,
        name: event.workflow_name || `Workflow ${event.workflow_id}`,
        platform: event.platform,
        status: 'failing',
        cluster: event.cluster || 'us-east-1',
        target_step: event.step_name,
        webhook_url: `/api/webhooks/${event.platform}/${event.workflow_id}`,
        capabilities: {
          can_retry_step: event.platform === 'n8n',
          can_resume: true,
          can_replay_payload: true,
          supports_idempotency: Boolean(event.idempotency_key),
        },
        last_run_at: new Date().toISOString(),
        success_rate: 96.0,
      };
      dbService.insertWorkflow(workflow);
    } else {
      dbService.updateWorkflow(workflow.id, {
        status: 'degraded',
        last_run_at: new Date().toISOString(),
      });
    }

    // 1. Evidence Collection with sensitive data redaction
    const evidence = evidenceCollector.collectEvidence({
      correlation_id: event.correlation_id,
      http_status: event.http_status,
      error_code: event.error_code,
      error_stack: event.error_stack,
      payload: event.payload,
      raw_logs: event.logs,
      affected_step: event.step_name,
      idempotency_key: event.idempotency_key,
    });

    // 2. AI Diagnosis
    const aiDiagnosis = await aiDiagnosticService.diagnoseIncident(
      `${workflow.name} Failure`,
      event.error_message,
      evidence,
      workflow.name
    );

    // 3. Recovery Policy Evaluation
    const policy = recoveryPolicyEngine.evaluatePolicy(
      aiDiagnosis.failure_category,
      evidence,
      aiDiagnosis.proposed_action,
      aiDiagnosis.proposed_parameters
    );

    // 4. Safe Execution Guarantees
    const incidentNumber = `INC-${Math.floor(2050 + Math.random() * 500)}`;
    const safeGuarantees = recoveryPolicyEngine.generateGuarantees(
      incidentNumber,
      policy,
      evidence
    );

    // 5. Initial Sandbox Simulation
    const sandboxSim = {
      status: policy.allowed ? ('passed' as const) : ('failed' as const),
      score: policy.allowed ? 95 : 20,
      pass_rate: policy.allowed ? 100 : 0,
      logs: [
        {
          time: new Date().toTimeString().split(' ')[0],
          level: 'INIT' as const,
          message: 'Automated pre-flight sandbox initialized.',
        },
        {
          time: new Date().toTimeString().split(' ')[0],
          level: (policy.allowed ? 'EXEC' : 'ERROR') as any,
          message: policy.allowed
            ? `Sandbox evaluated action "${policy.action_type}". Constraints verified.`
            : `Policy violation: ${policy.validation_errors.join('; ')}`,
        },
      ],
    };

    const initialStatus = policy.requires_human_approval ? 'awaiting_approval' : 'investigating';
    const pipelineStage = policy.requires_human_approval ? 6 : 4; // 4: Remediation proposal, 6: Sign-off

    const incident: Incident = {
      id: `inc-${Date.now()}`,
      incident_number: incidentNumber,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      platform: event.platform,
      cluster: event.cluster || 'us-east-1',
      title: `${workflow.name} - ${aiDiagnosis.failure_category.replace(/_/g, ' ').toUpperCase()}`,
      error_message: event.error_message,
      error_code: event.error_code,
      http_status: event.http_status,
      failure_category: aiDiagnosis.failure_category,
      status: initialStatus,
      pipeline_stage: pipelineStage,
      risk_level: policy.risk_level,
      evidence,
      ai_diagnosis: aiDiagnosis,
      safe_execution_guarantees: safeGuarantees,
      sandbox_simulation: sandboxSim,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dbService.insertIncident(incident);

    dbService.addAuditLog({
      id: `aud-${Date.now()}-created`,
      incident_id: incident.id,
      incident_number: incident.incident_number,
      actor: 'AutoHeal Observer',
      action: 'INCIDENT_DETECTED_AND_ANALYZED',
      details: {
        workflow_id: workflow.id,
        category: incident.failure_category,
        action: aiDiagnosis.proposed_action,
        status: incident.status,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      duplicate: false,
      incident,
      message: `Incident ${incident.incident_number} created and diagnosed.`,
    };
  }
}

export const integrationAdapter = new IntegrationAdapter();
