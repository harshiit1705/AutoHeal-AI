export type PlatformType = 'n8n' | 'make' | 'zapier' | 'custom_webhook' | 'salesforce';

export type FailureCategory =
  | 'transient_server_error'
  | 'authentication_failure'
  | 'network_timeout'
  | 'invalid_business_data'
  | 'unexpected_api_output'
  | 'dependency_outage'
  | 'business_rule_rejection'
  | 'state_ordering_failure'
  | 'unknown_risk';

export type RecoveryActionType =
  | 'exponential_backoff_retry'
  | 'request_credential_repair'
  | 'idempotency_safe_retry'
  | 'request_business_data_correction'
  | 'inject_payload_transformer'
  | 'circuit_breaker_queue'
  | 'record_business_rejection'
  | 'state_snapshot_reconcile'
  | 'escalate_human_operator';

export type IncidentStatus =
  | 'detected'
  | 'investigating'
  | 'awaiting_approval'
  | 'executing'
  | 'verified_healed'
  | 'escalated'
  | 'rejected';

export type RiskLevel = 'low' | 'medium_gated' | 'high';

export interface WorkflowCapabilities {
  can_retry_step: boolean;
  can_resume: boolean;
  can_replay_payload: boolean;
  supports_idempotency: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  platform: PlatformType;
  status: 'healthy' | 'degraded' | 'failing' | 'paused';
  cluster: string;
  target_step: string;
  webhook_url: string;
  capabilities: WorkflowCapabilities;
  last_run_at: string;
  success_rate: number;
}

export interface IncidentEvidence {
  correlation_id: string;
  timestamp: string;
  http_status?: number;
  error_code?: string;
  error_stack?: string;
  redacted_payload?: Record<string, any>;
  raw_logs: string[];
  affected_step: string;
  idempotency_key?: string;
}

export interface AIDiagnosis {
  model: string;
  failure_category: FailureCategory;
  likely_cause: string;
  supporting_evidence: string[];
  alternative_explanations: string[];
  confidence: number;
  proposed_action: RecoveryActionType;
  proposed_parameters: Record<string, any>;
  risk_level: RiskLevel;
  requires_approval: boolean;
  validation_plan: string;
  is_deterministic_demo?: boolean;
}

export interface SafeExecutionGuarantees {
  idempotency_preserved: boolean;
  idempotency_key?: string;
  state_snapshot_url?: string;
  rollback_compensation?: string;
  required_role?: string;
  timeout_remaining?: string;
  escalation_rule?: string;
}

export interface SandboxLogEntry {
  time: string;
  level: 'INIT' | 'DIFF' | 'EXEC' | 'SCORE' | 'WARN' | 'ERROR';
  message: string;
}

export interface SandboxSimulation {
  status: 'pending' | 'passed' | 'failed';
  score: number;
  pass_rate: number;
  logs: SandboxLogEntry[];
}

export interface ExecutionProgress {
  current_step: number;
  total_steps: number;
  step_description: string;
  percentage: number;
}

export interface VerificationResult {
  passed: boolean;
  checked_at: string;
  sla_assertion: string;
  details: string;
}

export interface Incident {
  id: string;
  incident_number: string;
  workflow_id: string;
  workflow_name: string;
  platform: PlatformType;
  cluster: string;
  title: string;
  error_message: string;
  error_code?: string;
  http_status?: number;
  failure_category: FailureCategory;
  status: IncidentStatus;
  pipeline_stage: number; // 1 to 8
  risk_level: RiskLevel;
  evidence: IncidentEvidence;
  ai_diagnosis?: AIDiagnosis;
  safe_execution_guarantees: SafeExecutionGuarantees;
  sandbox_simulation: SandboxSimulation;
  execution_progress?: ExecutionProgress;
  verification_result?: VerificationResult;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  incident_id?: string;
  incident_number?: string;
  actor: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface DashboardSummary {
  recovery_success_rate: number;
  mttr_seconds: number;
  total_incidents_caught: number;
  awaiting_approval_count: number;
  executing_count: number;
  verified_healed_count: number;
  escalated_count: number;
  active_workflows_monitored: number;
  mode: 'Supervised Mode' | 'Autonomous Mode';
  recent_incidents: Incident[];
  platform_health: {
    platform: string;
    status: 'online' | 'degraded' | 'offline' | 'demo';
    latency_ms: number | null;
    active_workflows: number;
  }[];
}
