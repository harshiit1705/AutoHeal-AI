import { integrationAdapter, InboundWorkflowEvent } from '../services/integrationAdapter.js';
import { Incident } from '../types.js';

export interface DemoScenarioDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  platform: 'n8n' | 'make' | 'zapier' | 'custom_webhook' | 'salesforce';
  expected_outcome: string;
}

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    id: 'transient_503',
    name: 'Temporary Dependency Outage (HTTP 503)',
    category: 'transient_server_error',
    description: 'Downstream payment gateway returns 503 Service Unavailable during spike load. Autonomous exponential backoff retry applies.',
    platform: 'make',
    expected_outcome: 'Low risk. Auto-resolved with exponential backoff & jitter. Preserves idempotency key.',
  },
  {
    id: 'auth_failure_401',
    name: 'Authentication Failure (OAuth Token Expired)',
    category: 'authentication_failure',
    description: 'CRM sync rejects API calls with 401 Unauthorized. AutoHeal halts retry loop to prevent lockout and requests authorized token refresh.',
    platform: 'salesforce',
    expected_outcome: 'Halt retries immediately. Human/service credential repair flow engaged.',
  },
  {
    id: 'schema_drift_mismatch',
    name: 'Unexpected Response Format (Schema Drift)',
    category: 'unexpected_api_output',
    description: 'Upstream webhook emits "id" instead of expected "contact_id". AI detects missing key and proposes ephemeral adapter with sandbox verification.',
    platform: 'n8n',
    expected_outcome: 'Medium risk gated. Proposes mapping patch. Requires SRE human sign-off.',
  },
  {
    id: 'missing_business_data',
    name: 'Missing Required Business Data',
    category: 'invalid_business_data',
    description: 'Customer onboarding payload omits mandatory billing address and tax ID. System rejects data fabrication and requests human correction.',
    platform: 'zapier',
    expected_outcome: 'Medium risk gated. Automatic data fabrication blocked. Quarantines record for operator entry.',
  },
  {
    id: 'timeout_uncertain_outcome',
    name: 'Network Timeout with Uncertain Outcome',
    category: 'network_timeout',
    description: 'HTTP request to settlement provider times out after 30s. Without verified idempotency, auto-retry is blocked to prevent double-charging.',
    platform: 'custom_webhook',
    expected_outcome: 'High risk escalation if missing idempotency; safe single retry if verified.',
  },
];

export async function triggerDemoScenario(scenarioId: string): Promise<Incident> {
  const timestamp = new Date().toISOString();

  let event: InboundWorkflowEvent;

  switch (scenarioId) {
    case 'transient_503':
      event = {
        platform: 'make',
        workflow_id: 'wf-55121',
        workflow_name: '[SIMULATED] Invoice Payment Webhook',
        cluster: 'eu-west-1',
        step_name: 'Step 2 (Stripe Settlement Gateway)',
        status: 'failed',
        http_status: 503,
        error_message: 'HTTP 503 Service Unavailable: Remote payment gateway is undergoing scheduled failover.',
        error_code: 'GATEWAY_TRANSIENT_503',
        error_stack: 'HTTPError: 503 Service Unavailable\n    at StripeGateway.settle (gateway.js:42:11)',
        payload: {
          invoice_id: 'inv_demo_9901',
          amount: 2499.0,
          currency: 'usd',
          customer_token: 'tok_demo_customer_[REDACTED]',
        },
        logs: [
          `[${timestamp}] Payment settlement packet dispatched to gateway`,
          `[${timestamp}] Upstream server returned HTTP 503 Service Unavailable (Retry-After: 30)`,
          `[${timestamp}] AutoHeal Observer captured transient error`,
        ],
        idempotency_key: `idem-demo-pay-${Date.now()}`,
        correlation_id: `corr-demo-503-${Date.now()}`,
      };
      break;

    case 'auth_failure_401':
      event = {
        platform: 'salesforce',
        workflow_id: 'wf-3301',
        workflow_name: '[SIMULATED] Inventory Sync ERP',
        cluster: 'us-west-2',
        step_name: 'Step 1 (Salesforce REST Authentication)',
        status: 'failed',
        http_status: 401,
        error_message: 'HTTP 401 Unauthorized: The REST API session token has expired or is invalid.',
        error_code: 'INVALID_SESSION_ID',
        error_stack: 'AuthenticationError: Session expired or invalid\n    at SalesforceClient.query (sf.js:108:15)',
        payload: {
          batch_id: 'batch_sim_7721',
          target_entity: 'SKU_Catalog',
          access_token: 'Bearer eyJhbGciOi...[REDACTED]',
        },
        logs: [
          `[${timestamp}] Invoked Salesforce REST bulk sync endpoint`,
          `[${timestamp}] Received 401 Unauthorized: Session token expired`,
          `[${timestamp}] AutoHeal intercepted auth failure. Retries suspended.`,
        ],
        idempotency_key: `idem-demo-auth-${Date.now()}`,
        correlation_id: `corr-demo-401-${Date.now()}`,
      };
      break;

    case 'schema_drift_mismatch':
      event = {
        platform: 'n8n',
        workflow_id: 'wf-9942',
        workflow_name: '[SIMULATED] Lead-to-CRM Sync',
        cluster: 'us-east-1',
        step_name: 'Step 4 (HubSpot Batch Updater)',
        status: 'failed',
        http_status: 500,
        error_message: 'Payload missing required field "contact_id" from CRM webhook response (received "id" instead).',
        error_code: 'SCHEMA_VALIDATION_ERROR',
        error_stack: 'ValidationError: Field "contact_id" is required by HubSpot API v3\n    at HubspotNode.execute (hubspot.js:142:12)',
        payload: {
          lead_source: 'Enterprise Contact Form',
          email: 'demo_exec@globalcorp.com',
          id: 'crm_demo_882910', // Schema drift: 'id' instead of 'contact_id'
          company: 'GlobalCorp Systems',
        },
        logs: [
          `[${timestamp}] Inbound Typeform webhook ingested`,
          `[${timestamp}] Step 3 completed data formatting`,
          `[${timestamp}] Step 4 failed validation: missing "contact_id"`,
          `[${timestamp}] AutoHeal detected schema drift: upstream mapped to "id"`,
        ],
        idempotency_key: `idem-demo-crm-${Date.now()}`,
        correlation_id: `corr-demo-schema-${Date.now()}`,
      };
      break;

    case 'missing_business_data':
      event = {
        platform: 'zapier',
        workflow_id: 'wf-1092',
        workflow_name: '[SIMULATED] Customer Onboarding Provisioner',
        cluster: 'us-east-2',
        step_name: 'Step 3 (Okta SSO provisioning)',
        status: 'failed',
        http_status: 422,
        error_message: 'Unprocessable Entity: Missing mandatory customer fields (billing_address, tax_identifier).',
        error_code: 'UNPROCESSABLE_ENTITY_422',
        error_stack: 'DataValidationError: Mandatory attributes missing in customer payload\n    at Provisioner.run (provisioner.js:84:10)',
        payload: {
          customer_name: 'Apex Innovations LLC',
          contact_email: 'finance@apexinnovations.io',
          plan_tier: 'Enterprise Custom',
          // billing_address and tax_identifier are missing
        },
        logs: [
          `[${timestamp}] Inbound customer signup payload processed`,
          `[${timestamp}] Validation failed: Missing mandatory billing_address and tax_identifier`,
          `[${timestamp}] Policy engine halted automated synthesis: data fabrication prohibited`,
        ],
        idempotency_key: `idem-demo-data-${Date.now()}`,
        correlation_id: `corr-demo-data-${Date.now()}`,
      };
      break;

    case 'timeout_uncertain_outcome':
      event = {
        platform: 'custom_webhook',
        workflow_id: 'wf-custom',
        workflow_name: '[SIMULATED] Custom Billing Core API',
        cluster: 'us-east-1',
        step_name: 'Step 1 (Egress Dispatch)',
        status: 'failed',
        http_status: 504,
        error_message: 'Gateway Timeout: Socket closed after 30000ms. Remote transaction state unknown.',
        error_code: 'SOCKET_TIMEOUT_504',
        error_stack: 'TimeoutError: Connect timed out after 30000ms\n    at HttpClient.post (client.js:201:19)',
        payload: {
          transaction_ref: 'tx_demo_5521',
          charge_amount: 1500.0,
          customer_id: 'cust_882190',
        },
        logs: [
          `[${timestamp}] Initiated transaction dispatch to remote merchant server`,
          `[${timestamp}] Socket read timeout (30000ms elapsed)`,
          `[${timestamp}] AutoHeal flagged uncertain outcome. Checking idempotency guarantees...`,
        ],
        idempotency_key: `idem-demo-tx-${Date.now()}`, // Has idempotency for safe retry demo
        correlation_id: `corr-demo-timeout-${Date.now()}`,
      };
      break;
    default:
      throw new Error(`Unknown demo scenario: ${scenarioId}`);
  }

  const result = await integrationAdapter.handleInboundEvent(event);
  if (!result.incident) {
    throw new Error('Failed to generate incident for scenario.');
  }
  return result.incident;
}
