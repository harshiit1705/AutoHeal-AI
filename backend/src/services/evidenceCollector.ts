import { IncidentEvidence } from '../types.js';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /auth/i,
  /bearer/i,
  /api[_-]?key/i,
  /card/i,
  /pan/i,
  /cvv/i,
  /private[_-]?key/i,
  /cert/i,
  /ssn/i,
  /credential/i,
];

export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact common token strings, JWTs, Bearer headers, etc.
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
    }
    if (/ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(data)) {
      return '[REDACTED_JWT]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(value);
      }
    }
    return sanitized;
  }

  return data;
}

export class EvidenceCollector {
  public collectEvidence(params: {
    correlation_id?: string;
    http_status?: number;
    error_code?: string;
    error_stack?: string;
    payload?: Record<string, any>;
    raw_logs?: string[];
    affected_step: string;
    idempotency_key?: string;
  }): IncidentEvidence {
    const correlation_id =
      params.correlation_id || `corr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const redacted_payload = params.payload ? redactSensitiveData(params.payload) : undefined;
    const sanitized_logs = (params.raw_logs || []).map((log) => redactSensitiveData(log) as string);

    return {
      correlation_id,
      timestamp: new Date().toISOString(),
      http_status: params.http_status,
      error_code: params.error_code,
      error_stack: params.error_stack,
      redacted_payload,
      raw_logs: sanitized_logs,
      affected_step: params.affected_step,
      idempotency_key: params.idempotency_key,
    };
  }
}

export const evidenceCollector = new EvidenceCollector();
