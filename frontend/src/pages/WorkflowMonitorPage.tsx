import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow } from '../types/index.js';
import { fetchWorkflows, triggerDemo } from '../api/client.js';

export const WorkflowMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyWebhook = (wf: Workflow) => {
    const fullUrl = `${window.location.origin}${wf.webhook_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(wf.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulate = async (platform: string) => {
    let scenario = 'transient_503';
    if (platform === 'n8n') scenario = 'schema_drift_mismatch';
    if (platform === 'salesforce') scenario = 'auth_failure_401';
    if (platform === 'zapier') scenario = 'missing_business_data';

    try {
      const res = await triggerDemo(scenario);
      navigate(`/recovery-center?highlight=${res.incident.id}`);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    }
  };

  const getStatusChip = (status: Workflow['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-label-xs text-label-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            Degraded (Healing)
          </span>
        );
      case 'failing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container/40 text-error font-label-xs text-label-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
            Failing
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-xs text-label-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              Workflow Monitor
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs text-label-xs font-semibold border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              4 Connected Engines
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Real-time telemetry, execution history, and capability registry for connected external automation systems (n8n, Make, Salesforce, Zapier).
          </p>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => navigate('/integrations')}
            className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium flex items-center gap-1.5 border border-[#24304a]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[1.125rem]">extension</span>
            <span>Configure Integrations</span>
          </button>
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[1.125rem]">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Integration Workflows Grid */}
      <div className="grid grid-cols-1 gap-space-md">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm space-y-space-md hover:border-primary/40 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold uppercase">
                    {wf.platform}
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {wf.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-code-sm text-code-sm">
                    {wf.cluster}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Target Step: <span className="text-on-surface font-medium">{wf.target_step}</span>
                </p>
              </div>
              <div className="flex items-center gap-space-sm flex-shrink-0">
                {getStatusChip(wf.status)}
                <span className="font-code-sm text-code-sm text-tertiary font-bold">
                  {wf.success_rate}% SLA
                </span>
              </div>
            </div>

            {/* Platform Capabilities & Webhook URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2 border-t border-[#24304a]/30">
              <div className="space-y-1">
                <span className="font-label-xs text-label-xs uppercase text-on-surface-variant font-semibold">
                  Verified Engine Capabilities
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`px-2 py-0.5 rounded font-label-xs text-label-xs ${wf.capabilities.can_retry_step ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' : 'bg-surface-container text-on-surface-variant/40'}`}>
                    Step-Level Retry: {wf.capabilities.can_retry_step ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-label-xs text-label-xs ${wf.capabilities.can_resume ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' : 'bg-surface-container text-on-surface-variant/40'}`}>
                    Resume Stream: {wf.capabilities.can_resume ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-label-xs text-label-xs ${wf.capabilities.supports_idempotency ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container text-on-surface-variant/40'}`}>
                    Idempotency Safe: {wf.capabilities.supports_idempotency ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-label-xs text-label-xs uppercase text-on-surface-variant font-semibold">
                  Webhook Ingestion Receptor
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <code className="px-2.5 py-1.5 rounded bg-surface-container-lowest font-code-sm text-code-sm text-primary flex-1 truncate border border-[#24304a]/50">
                    {wf.webhook_url}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyWebhook(wf)}
                    className="p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-[#24304a]/40 transition-colors"
                    title="Copy Webhook Endpoint"
                  >
                    <span className="material-symbols-outlined text-[1.125rem]">
                      {copiedId === wf.id ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Workflow Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#24304a]/20">
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                Last execution event: {new Date(wf.last_run_at).toLocaleString()}
              </span>
              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  onClick={() => handleSimulate(wf.platform)}
                  className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-xs text-label-xs font-semibold flex items-center gap-1 border border-[#24304a]/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[1rem] text-error">bug_report</span>
                  Simulate Incident
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/incidents?workflow=${wf.id}`)}
                  className="px-3 py-1.5 rounded bg-primary-container/20 hover:bg-primary-container text-primary hover:text-on-primary-container font-label-xs text-label-xs font-bold flex items-center gap-1 transition-all"
                >
                  <span>View Incidents</span>
                  <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
