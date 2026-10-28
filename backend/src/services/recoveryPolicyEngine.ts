import {
  FailureCategory,
  RecoveryActionType,
  RiskLevel,
  SafeExecutionGuarantees,
  IncidentEvidence
} from '../types.js';

export interface PolicyEvaluationResult {
  allowed: boolean;
  action_type: RecoveryActionType;
  risk_level: RiskLevel;
  requires_human_approval: boolean;
  max_retries: number;
  idempotency_required: boolean;
  idempotency_satisfied: boolean;
  compensation_strategy: string;
  policy_reason: string;
  validation_errors: string[];
}

export const ALLOWED_ACTION_TYPES: RecoveryActionType[] = [
  'exponential_backoff_retry',
  'request_credential_repair',
  'idempotency_safe_retry',
  'request_business_data_correction',
  'inject_payload_transformer',
  'circuit_breaker_queue',
  'record_business_rejection',
  'state_snapshot_reconcile',
  'escalate_human_operator',
];

export class RecoveryPolicyEngine {
  /**
   * Deterministically evaluates the failure class and evidence,
   * returning strict execution constraints, approval gates, and safety requirements.
   */
  public evaluatePolicy(
    category: FailureCategory,
    evidence: IncidentEvidence,
    proposedAction?: RecoveryActionType,
    actionParams?: Record<string, any>
  ): PolicyEvaluationResult {
    const validationErrors: string[] = [];

    // Check allowlist
    if (proposedAction && !ALLOWED_ACTION_TYPES.includes(proposedAction)) {
      validationErrors.push(`Action "${proposedAction}" is not in the authorized recovery allowlist.`);
    }

    // Block dangerous parameters (e.g. arbitrary command execution, raw eval, shell injection)
    if (actionParams) {
      const stringified = JSON.stringify(actionParams);
      if (/eval\(|exec\(|spawn\(|child_process|rm\s+-rf|DROP\s+TABLE|<script/i.test(stringified)) {
        validationErrors.push('Unsafe parameters detected. Execution blocked by safety policy.');
      }
    }

    switch (category) {
      case 'transient_server_error': {
        // Bounded exponential backoff retries (max 3)
        const hasIdempotency = Boolean(evidence.idempotency_key);
        if (!hasIdempotency) validationErrors.push('Transient retry requires an idempotency key in this prototype.');
        return {
          allowed: validationErrors.length === 0,
          action_type: 'exponential_backoff_retry',
          risk_level: 'low',
          requires_human_approval: false,
          max_retries: 3,
          idempotency_required: true,
          idempotency_satisfied: hasIdempotency,
          compensation_strategy: 'Halt on 3rd retry failure and transition to pending operator queue.',
          policy_reason: 'Transient 5xx error eligible for autonomous exponential backoff with jitter.',
          validation_errors: validationErrors,
        };
      }

      case 'authentication_failure': {
        // Halt retries immediately. Credential repair requires human or authorized token rotation.
        return {
          allowed: validationErrors.length === 0,
          action_type: 'request_credential_repair',
          risk_level: 'medium_gated',
          requires_human_approval: true,
          max_retries: 0, // Stop repeated attempts to avoid lockout
          idempotency_required: false,
          idempotency_satisfied: true,
          compensation_strategy: 'Suspend workflow execution; alert administrator to verify API credentials.',
          policy_reason: 'Authentication 401/403 failure. Repeated automated retries blocked to prevent account lockout.',
          validation_errors: validationErrors,
        };
      }

      case 'network_timeout': {
        // Must verify if original operation already succeeded before retrying.
        const hasIdempotency = Boolean(evidence.idempotency_key);
        if (!hasIdempotency) {
          validationErrors.push('Network timeout outcome uncertain and idempotency key is missing. Automatic retry prohibited to prevent duplicate operations.');
          return {
            allowed: false,
            action_type: 'escalate_human_operator',
            risk_level: 'high',
            requires_human_approval: true,
            max_retries: 0,
            idempotency_required: true,
            idempotency_satisfied: false,
            compensation_strategy: 'Hold state, poll downstream system for transaction status, require human sign-off.',
            policy_reason: 'Uncertain execution outcome without idempotency guarantee. Risk of duplicate transaction.',
            validation_errors: validationErrors,
          };
        }

        return {
          allowed: validationErrors.length === 0,
          action_type: 'idempotency_safe_retry',
          risk_level: 'medium_gated',
          requires_human_approval: true,
          max_retries: 1,
          idempotency_required: true,
          idempotency_satisfied: true,
          compensation_strategy: 'Check downstream idempotency ledger before single retry dispatch.',
          policy_reason: 'Network timeout with verified idempotency key. One safe retry permitted under operator oversight.',
          validation_errors: validationErrors,
        };
      }

      case 'invalid_business_data': {
        // Halt auto-retry; request correction rather than inventing synthetic values.
        return {
          allowed: validationErrors.length === 0,
          action_type: 'request_business_data_correction',
          risk_level: 'medium_gated',
          requires_human_approval: true,
          max_retries: 0,
          idempotency_required: false,
          idempotency_satisfied: true,
          compensation_strategy: 'Quarantine invalid record in dead-letter table until operator provides valid inputs.',
          policy_reason: 'Schema/business data validation failed. System will not fabricate data.',
          validation_errors: validationErrors,
        };
      }

      case 'unexpected_api_output': {
        // Propose safe mapping transformer; sandbox validation required; gated by human sign-off.
        return {
          allowed: validationErrors.length === 0,
          action_type: 'inject_payload_transformer',
          risk_level: 'medium_gated',
          requires_human_approval: true,
          max_retries: 2,
          idempotency_required: true,
          idempotency_satisfied: Boolean(evidence.idempotency_key),
          compensation_strategy: 'If transformed execution fails, rollback state snapshot and alert Slack #ops-alerts.',
          policy_reason: 'Schema drift detected. Ephemeral adapter requires sandbox simulation and Staff SRE sign-off.',
          validation_errors: validationErrors,
        };
      }

      case 'dependency_outage': {
        // Retry within policy limits with circuit breaker queueing
        return {
          allowed: validationErrors.length === 0,
          action_type: 'circuit_breaker_queue',
          risk_level: 'medium_gated',
          requires_human_approval: false,
          max_retries: 3,
          idempotency_required: true,
          idempotency_satisfied: Boolean(evidence.idempotency_key),
          compensation_strategy: 'Open circuit breaker for 5 minutes, queue incoming events in persistent storage.',
          policy_reason: 'Downstream dependency declared outage. Circuit breaker engaged.',
          validation_errors: validationErrors,
        };
      }

      case 'business_rule_rejection': {
        // Legitimate business outcome (e.g. credit score too low, age restriction). DO NOT retry.
        return {
          allowed: validationErrors.length === 0,
          action_type: 'record_business_rejection',
          risk_level: 'low',
          requires_human_approval: false,
          max_retries: 0,
          idempotency_required: false,
          idempotency_satisfied: true,
          compensation_strategy: 'Commit rejection status to CRM audit trail; trigger downstream notification workflow.',
          policy_reason: 'Legitimate business rule rejection. Technical retries are inappropriate.',
          validation_errors: validationErrors,
        };
      }

      case 'state_ordering_failure': {
        // Inspect state snapshot and reconcile before proposing recovery
        return {
          allowed: validationErrors.length === 0,
          action_type: 'state_snapshot_reconcile',
          risk_level: 'medium_gated',
          requires_human_approval: true,
          max_retries: 1,
          idempotency_required: true,
          idempotency_satisfied: Boolean(evidence.idempotency_key),
          compensation_strategy: 'Revert state to last consistent snapshot before re-ordering events.',
          policy_reason: 'Out-of-order execution detected. State reconciliation required before resume.',
          validation_errors: validationErrors,
        };
      }

      case 'unknown_risk':
      default: {
        // Stop automatic recovery immediately and escalate
        return {
          allowed: false,
          action_type: 'escalate_human_operator',
          risk_level: 'high',
          requires_human_approval: true,
          max_retries: 0,
          idempotency_required: true,
          idempotency_satisfied: false,
          compensation_strategy: 'Freeze execution and page on-call engineering team.',
          policy_reason: 'Unknown or high-risk failure. Automatic healing blocked by safety guardrail.',
          validation_errors: ['Automatic remediation is prohibited for unclassified or high-risk anomalies.'],
        };
      }
    }
  }

  public generateGuarantees(
    incidentNumber: string,
    policy: PolicyEvaluationResult,
    evidence: IncidentEvidence
  ): SafeExecutionGuarantees {
    return {
      idempotency_preserved: policy.idempotency_satisfied,
      idempotency_key: evidence.idempotency_key,
      state_snapshot_url: `s3://autoheal-backups/snap-${incidentNumber.toLowerCase()}-01`,
      rollback_compensation: policy.compensation_strategy,
      required_role: policy.requires_human_approval ? 'Staff Reliability Eng' : 'Automated Agent',
      timeout_remaining: policy.requires_human_approval ? '20m' : 'N/A',
      escalation_rule: policy.requires_human_approval
        ? 'PagerDuty on-call dispatch at T-0 if approval gate expires'
        : 'Escalate to SRE if retry threshold exhausted',
    };
  }
}

export const recoveryPolicyEngine = new RecoveryPolicyEngine();
