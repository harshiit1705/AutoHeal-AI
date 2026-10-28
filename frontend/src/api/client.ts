import {
  DashboardSummary,
  Workflow,
  Incident,
  AuditLog,
  SandboxSimulation,
  VerificationResult
} from '../types/index.js';

const API_BASE = '/api';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error('Failed to load dashboard summary');
  return res.json();
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const res = await fetch(`${API_BASE}/workflows`);
  if (!res.ok) throw new Error('Failed to load workflows');
  return res.json();
}

export async function fetchIncidents(statusFilter?: string): Promise<Incident[]> {
  const url = statusFilter && statusFilter !== 'all'
    ? `${API_BASE}/incidents?status=${statusFilter}`
    : `${API_BASE}/incidents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load incidents');
  return res.json();
}

export async function fetchIncident(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error('Failed to load incident details');
  return res.json();
}

export async function runSandboxTest(incidentId: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/sandbox-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor: 'Alex Chen (Staff Reliability Eng)' }),
  });
  if (!res.ok) throw new Error('Failed to run sandbox simulation');
  return res.json();
}

export async function approveProposal(
  incidentId: string,
  comment?: string
): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor: 'Alex Chen (Staff Reliability Eng)',
      comment: comment || 'Approved by operator in AutoHeal console',
    }),
  });
  if (!res.ok) throw new Error('Failed to approve proposal');
  return res.json();
}

export async function executeRecovery(incidentId: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/execute`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to execute simulated recovery');
  }
  return res.json();
}

export async function rejectProposal(
  incidentId: string,
  reason?: string
): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor: 'Alex Chen (Staff Reliability Eng)',
      reason: reason || 'Rejected by operator in AutoHeal console',
    }),
  });
  if (!res.ok) throw new Error('Failed to reject proposal');
  return res.json();
}

export async function reDiagnoseIncident(incidentId: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to run AI diagnosis');
  return res.json();
}

export async function fetchIntegrations(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/integrations`);
  if (!res.ok) throw new Error('Failed to load integrations');
  return res.json();
}

export async function testIntegrationConnection(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/integrations/${id}/test`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to test connection');
  return res.json();
}

export async function fetchAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
}

export async function triggerDemo(scenarioId: string): Promise<{ success: boolean; incident: Incident }> {
  const res = await fetch(`${API_BASE}/demo/trigger/${scenarioId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger demo scenario');
  return res.json();
}
