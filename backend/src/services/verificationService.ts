import { Incident, VerificationResult } from '../types.js';

/**
 * Deterministic postcondition checks for the local demo only. This service does not
 * contact n8n, Make, Zapier, Salesforce, payment gateways, or customer systems.
 */
export class VerificationService {
  public async verifyRecoveryOutcome(incident: Incident): Promise<VerificationResult> {
    const action = incident.ai_diagnosis?.proposed_action;
    const now = new Date().toISOString();
    const result = (passed: boolean, assertion: string, details: string): VerificationResult => ({
      passed,
      mode: 'simulated',
      checked_at: now,
      sla_assertion: `[SIMULATED POSTCONDITION] ${assertion}`,
      details: `[SIMULATED — no external workflow was changed] ${details}`,
    });

    switch (action) {
      case 'exponential_backoff_retry': {
        const validTransient = [500, 502, 503, 504].includes(incident.evidence.http_status ?? 0);
        const hasIdempotency = Boolean(incident.evidence.idempotency_key);
        return result(validTransient && hasIdempotency,
          'Demo retry is eligible only for a transient 5xx and a present idempotency key.',
          validTransient && hasIdempotency
            ? 'The local scenario postcondition passed: transient 5xx classification and idempotency key are present. A remote retry was not sent.'
            : 'Postcondition failed: a transient 5xx status and idempotency key are both required.');
      }
      case 'inject_payload_transformer': {
        const mapping = incident.ai_diagnosis?.proposed_parameters?.mapping;
        const passed = Boolean(mapping && typeof mapping === 'object' && Object.keys(mapping).length > 0);
        return result(passed, 'A non-empty, schema-validated mapping proposal exists.',
          passed ? 'Mapping proposal passed local structural checks; no CRM API was called.' : 'No valid mapping proposal was available.');
      }
      case 'idempotency_safe_retry': {
        const passed = Boolean(incident.evidence.idempotency_key);
        return result(passed, 'An idempotency key exists before the simulated single retry.',
          passed ? 'Local idempotency precondition passed; no downstream ledger was queried and no transaction was replayed.' : 'Idempotency key missing; retry is not safe.');
      }
      default:
        return result(false, 'No implemented postcondition exists for this recovery action.',
          `Action ${String(action)} is not verifiable by the local demo. The incident must not be marked healed.`);
    }
  }
}

export const verificationService = new VerificationService();
