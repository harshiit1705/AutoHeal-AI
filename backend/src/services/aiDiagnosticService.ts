import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import {
  AIDiagnosis,
  FailureCategory,
  RecoveryActionType,
  IncidentEvidence
} from '../types.js';

export const AIDiagnosisSchema = z.object({
  failure_category: z.enum([
    'transient_server_error',
    'authentication_failure',
    'network_timeout',
    'invalid_business_data',
    'unexpected_api_output',
    'dependency_outage',
    'business_rule_rejection',
    'state_ordering_failure',
    'unknown_risk',
  ]),
  likely_cause: z.string(),
  supporting_evidence: z.array(z.string()),
  alternative_explanations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  proposed_action: z.enum([
    'exponential_backoff_retry',
    'request_credential_repair',
    'idempotency_safe_retry',
    'request_business_data_correction',
    'inject_payload_transformer',
    'circuit_breaker_queue',
    'record_business_rejection',
    'state_snapshot_reconcile',
    'escalate_human_operator',
  ]),
  proposed_parameters: z.record(z.string(), z.any()),
  risk_level: z.enum(['low', 'medium_gated', 'high']),
  requires_approval: z.boolean(),
  validation_plan: z.string(),
});

export class AIDiagnosticService {
  private aiClient: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || null;
    if (this.apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('Failed to initialize GoogleGenAI client, fallback to deterministic mode:', err);
        this.aiClient = null;
      }
    }
  }

  public async diagnoseIncident(
    title: string,
    errorMessage: string,
    evidence: IncidentEvidence,
    workflowName: string
  ): Promise<AIDiagnosis> {
    // If Gemini API is configured, invoke the model with strict JSON schema
    if (this.aiClient && this.apiKey) {
      try {
        const prompt = `
You are the AutoHeal AI Diagnostic Engine. Analyze this workflow failure and provide an operational diagnosis and recovery proposal.

WORKFLOW: "${workflowName}"
INCIDENT: "${title}"
ERROR: "${errorMessage}"
HTTP STATUS: ${evidence.http_status ?? 'N/A'}
AFFECTED STEP: "${evidence.affected_step}"
IDEMPOTENCY KEY: "${evidence.idempotency_key ?? 'None'}"
REDACTED PAYLOAD: ${JSON.stringify(evidence.redacted_payload ?? {}, null, 2)}
RECENT LOGS:
${evidence.raw_logs.join('\n')}

Analyze the root cause and propose a structured safe remediation plan.
You must categorize into one of: transient_server_error, authentication_failure, network_timeout, invalid_business_data, unexpected_api_output, dependency_outage, business_rule_rejection, state_ordering_failure, unknown_risk.
And proposed_action into one of: exponential_backoff_retry, request_credential_repair, idempotency_safe_retry, request_business_data_correction, inject_payload_transformer, circuit_breaker_queue, record_business_rejection, state_snapshot_reconcile, escalate_human_operator.
Return valid JSON only matching the schema.
`;

        const response = await this.aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text?.trim() || '';
        const parsed = JSON.parse(rawText);
        const validated = AIDiagnosisSchema.parse(parsed);

        return {
          model: 'gemini-2.5-flash',
          failure_category: validated.failure_category,
          likely_cause: validated.likely_cause,
          supporting_evidence: validated.supporting_evidence,
          alternative_explanations: validated.alternative_explanations,
          confidence: validated.confidence,
          proposed_action: validated.proposed_action,
          proposed_parameters: validated.proposed_parameters,
          risk_level: validated.risk_level,
          requires_approval: validated.requires_approval,
          validation_plan: validated.validation_plan,
          is_deterministic_demo: false,
        };
      } catch (err) {
        console.warn('Gemini API call or validation failed, using deterministic fallback mode:', err);
      }
    }

    // Deterministic Demo Mode (clearly labeled, reliable for offline demos)
    return this.generateDeterministicDiagnosis(title, errorMessage, evidence, workflowName);
  }

  public generateDeterministicDiagnosis(
    title: string,
    errorMessage: string,
    evidence: IncidentEvidence,
    workflowName: string
  ): AIDiagnosis {
    const errorLower = (errorMessage + ' ' + title).toLowerCase();
    const httpStatus = evidence.http_status;

    // 1. Transient Server Error
    if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503 || httpStatus === 504 || errorLower.includes('service unavailable') || errorLower.includes('gateway timeout')) {
      // Check if it's actually schema drift that threw 500
      if (!errorLower.includes('schema') && !errorLower.includes('contact_id') && !errorLower.includes('validationerror')) {
        return {
          model: 'deterministic-rule-engine (Demo Mode)',
          failure_category: 'transient_server_error',
          likely_cause: `Downstream dependency returned HTTP ${httpStatus || 503} due to transient service load or gateway throttling.`,
          supporting_evidence: [
            `HTTP status ${httpStatus || 503} captured from remote host`,
            'Header hints retry after delay or transient backpressure',
            'Downstream service healthy in preceding execution windows',
          ],
          alternative_explanations: ['Subsystem cold start timeout', 'Intermittent network egress glitch'],
          confidence: 0.98,
          proposed_action: 'exponential_backoff_retry',
          proposed_parameters: {
            max_retries: 3,
            initial_backoff_sec: 15,
            jitter_sec: 120,
            preserve_idempotency_key: true,
          },
          risk_level: 'low',
          requires_approval: false,
          validation_plan: 'Verify presence of unique idempotency token to prevent double execution during retry.',
          is_deterministic_demo: true,
        };
      }
    }

    // 2. Unexpected API Output / Schema Drift
    if (errorLower.includes('schema') || errorLower.includes('contact_id') || errorLower.includes('validationerror') || errorLower.includes('drift')) {
      return {
        model: 'deterministic-rule-engine (Demo Mode)',
        failure_category: 'unexpected_api_output',
        likely_cause: 'Schema Drift / Missing Field: Inbound payload key mismatch between upstream emitter and target step schema.',
        supporting_evidence: [
          'Validation error indicates required property missing in step payload',
          'Payload inspect reveals upstream sent alternative identifier key',
        ],
        alternative_explanations: ['Upstream service rolled out non-backward-compatible minor release'],
        confidence: 0.95,
        proposed_action: 'inject_payload_transformer',
        proposed_parameters: {
          mapping: { 'response.id': 'contact_id' },
          ephemeral_adapter: true,
          resume_step: evidence.affected_step,
          bounded_retries: 2,
        },
        risk_level: 'medium_gated',
        requires_approval: true,
        validation_plan: 'Run dry-run simulation in isolated sandbox with ephemeral adapter before downstream execution.',
        is_deterministic_demo: true,
      };
    }

    // 3. Authentication Failure
    if (httpStatus === 401 || httpStatus === 403 || errorLower.includes('unauthorized') || errorLower.includes('expired') || errorLower.includes('forbidden') || errorLower.includes('oauth')) {
      return {
        model: 'deterministic-rule-engine (Demo Mode)',
        failure_category: 'authentication_failure',
        likely_cause: 'API authorization failed: Bearer token or OAuth session has expired or been revoked.',
        supporting_evidence: [
          `HTTP ${httpStatus || 401} Unauthorized returned by external platform`,
          'Session expiration timestamp exceeded validity lease',
        ],
        alternative_explanations: ['Scraped credentials revoked by security team', 'Tenant secret rotation executed'],
        confidence: 0.99,
        proposed_action: 'request_credential_repair',
        proposed_parameters: {
          refresh_flow: 'oauth2_client_credentials',
          re_execute_batch: true,
        },
        risk_level: 'medium_gated',
        requires_approval: true,
        validation_plan: 'Execute token probe against OAuth introspection endpoint prior to resuming workflow.',
        is_deterministic_demo: true,
      };
    }

    // 4. Missing required business data
    if (errorLower.includes('invalid') || errorLower.includes('mandatory') || errorLower.includes('missing required') || errorLower.includes('data error') || errorLower.includes('unprocessable')) {
      return {
        model: 'deterministic-rule-engine (Demo Mode)',
        failure_category: 'invalid_business_data',
        likely_cause: 'Critical business data missing from customer input. Synthetic value generation rejected by policy.',
        supporting_evidence: [
          'Mandatory customer attributes missing in submission payload',
          'Business rule prohibits autonomous data fabrication',
        ],
        alternative_explanations: ['Frontend client form failed client-side validation check'],
        confidence: 0.97,
        proposed_action: 'request_business_data_correction',
        proposed_parameters: {
          missing_fields: ['billing_address', 'tax_identifier'],
          quarantine_queue: 'dead-letter-business-data',
        },
        risk_level: 'medium_gated',
        requires_approval: true,
        validation_plan: 'Awaiting operator input form submission with verified customer record.',
        is_deterministic_demo: true,
      };
    }

    // 5. Network Timeout with uncertain execution outcome
    if (errorLower.includes('timeout') || errorLower.includes('uncertain') || errorLower.includes('timed out')) {
      const hasIdem = Boolean(evidence.idempotency_key);
      return {
        model: 'deterministic-rule-engine (Demo Mode)',
        failure_category: 'network_timeout',
        likely_cause: hasIdem
          ? 'Network socket timed out awaiting remote ACK; operation is protected by verified idempotency key.'
          : 'Network timeout with unknown downstream status. Missing idempotency key presents double-action hazard.',
        supporting_evidence: [
          'TCP connection terminated with ETIMEDOUT after 30000ms',
          hasIdem ? `Idempotency key preserved: ${evidence.idempotency_key}` : 'No idempotency key attached',
        ],
        alternative_explanations: ['Remote host processed request but drop happened during response egress'],
        confidence: 0.92,
        proposed_action: hasIdem ? 'idempotency_safe_retry' : 'escalate_human_operator',
        proposed_parameters: {
          idempotency_key: evidence.idempotency_key,
          verify_first: true,
        },
        risk_level: hasIdem ? 'medium_gated' : 'high',
        requires_approval: true,
        validation_plan: 'Query downstream transaction log by idempotency key prior to dispatching retry.',
        is_deterministic_demo: true,
      };
    }

    // Default Unknown Risk
    return {
      model: 'deterministic-rule-engine (Demo Mode)',
      failure_category: 'unknown_risk',
      likely_cause: 'Unclassified operational anomaly with potential data consistency implications.',
      supporting_evidence: ['Error trace does not match known deterministic remediation signatures'],
      alternative_explanations: ['Corrupted state machine', 'Security policy interception'],
      confidence: 0.65,
      proposed_action: 'escalate_human_operator',
      proposed_parameters: {
        page_sre: true,
        freeze_workflow: true,
      },
      risk_level: 'high',
      requires_approval: true,
      validation_plan: 'Manual inspection and state triage by on-call reliability engineer.',
      is_deterministic_demo: true,
    };
  }
}

export const aiDiagnosticService = new AIDiagnosticService();
