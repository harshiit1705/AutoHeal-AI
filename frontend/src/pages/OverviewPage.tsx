import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSummary, Incident } from '../types/index.js';
import { fetchDashboardSummary, triggerDemo } from '../api/client.js';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringScenario, setTriggeringScenario] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerDemo = async (scenarioId: string) => {
    try {
      setTriggeringScenario(scenarioId);
      const res = await triggerDemo(scenarioId);
      setDemoBanner(`Simulated failure generated: ${res.incident.incident_number} (${res.incident.title}). Redirecting to Recovery Center...`);
      await loadData();
      setTimeout(() => {
        navigate(`/recovery-center?highlight=${res.incident.id}`);
      }, 1200);
    } catch (err: any) {
      alert(`Error triggering demo: ${err.message}`);
    } finally {
      setTriggeringScenario(null);
    }
  };

  const getStatusBadge = (status: Incident['status']) => {
    switch (status) {
      case 'verified_healed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-label-xs text-label-xs font-semibold">
            <span className="material-symbols-outlined text-[1rem]">verified</span>
            Verified Healed
          </span>
        );
      case 'awaiting_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            Awaiting Approval
          </span>
        );
      case 'executing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs text-label-xs font-semibold">
            <span className="material-symbols-outlined text-[1rem] animate-spin">sync</span>
            Executing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container/40 text-error font-label-xs text-label-xs font-semibold">
            <span className="material-symbols-outlined text-[1rem]">warning</span>
            {status}
          </span>
        );
    }
  };

  const demoScenarios = [
    {
      id: 'schema_drift_mismatch',
      title: 'Schema Drift (Missing contact_id)',
      platform: 'n8n Orchestrator',
      desc: 'Inbound payload sent "id" instead of expected CRM "contact_id". Generates ephemeral adapter patch.',
      badge: 'Medium Risk · Gated',
    },
    {
      id: 'transient_503',
      title: 'Downstream 503 Gateway Load',
      platform: 'Make.com',
      desc: 'Payment processor returned 503 Service Unavailable. Triggers exponential backoff with jitter.',
      badge: 'Low Risk · Auto',
    },
    {
      id: 'auth_failure_401',
      title: 'OAuth2 Expired Token (401)',
      platform: 'Salesforce REST',
      desc: 'Session expired during batch run. Halts retries to prevent lockout and triggers token refresh.',
      badge: 'Auth Repair Flow',
    },
    {
      id: 'missing_business_data',
      title: 'Missing Required Business Data',
      platform: 'Zapier',
      desc: 'Customer onboarding omits mandatory address & tax ID. Prohibits hallucination and requests input.',
      badge: 'Human Correction',
    },
    {
      id: 'timeout_uncertain_outcome',
      title: 'Timeout with Uncertain Status',
      platform: 'Custom Webhook',
      desc: 'Remote socket timed out. Checks idempotency ledger before single safe replay.',
      badge: 'Idempotency Gate',
    },
  ];

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              Autonomous Reliability Studio
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs text-label-xs font-semibold border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Supervised Ops
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Live telemetry, active incident triage, and reproducible AI self-healing workflows across connected enterprise pipelines.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            onClick={() => navigate('/recovery-center')}
            className="px-4 py-2 rounded-lg bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
          >
            <span className="material-symbols-outlined text-[1.25rem]">restart_alt</span>
            <span>Open Recovery Center</span>
          </button>
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium flex items-center gap-1.5 border border-[#24304a]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[1.125rem]">refresh</span>
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {/* Demo Notification Banner */}
      {demoBanner && (
        <div className="p-3.5 rounded-xl bg-primary-container/20 border border-primary/40 text-on-surface flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[1.25rem] animate-spin">autorenew</span>
            <span className="font-body-sm text-body-sm font-medium">{demoBanner}</span>
          </div>
          <button
            onClick={() => setDemoBanner(null)}
            className="text-on-surface-variant hover:text-on-surface p-1"
          >
            <span className="material-symbols-outlined text-[1rem]">close</span>
          </button>
        </div>
      )}

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              Recovery Success Rate
            </span>
            <div className="p-1.5 rounded-lg bg-tertiary/10 text-tertiary">
              <span className="material-symbols-outlined text-[1.25rem]">verified</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              {summary?.recovery_success_rate ?? 0}%
            </span>
            <span className="font-code-sm text-code-sm text-tertiary font-bold">demo metric</span>
          </div>
          <p className="font-code-sm text-code-sm text-on-surface-variant mt-1">Calculated from locally recorded verified / escalated demo incidents</p>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              Mean Time to Resolution
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[1.25rem]">timer</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              {summary?.mttr_seconds ? `${Math.floor(summary.mttr_seconds / 60)}m ${summary.mttr_seconds % 60}s` : 'Not measured'}
            </span>
            <span className="font-code-sm text-code-sm text-tertiary font-bold">prototype</span>
          </div>
          <p className="font-code-sm text-code-sm text-on-surface-variant mt-1">Resolution duration is not measured in this prototype</p>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              Pending Human Sign-off
            </span>
            <div className="p-1.5 rounded-lg bg-secondary-container/30 text-secondary">
              <span className="material-symbols-outlined text-[1.25rem]">gshield</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-secondary font-bold tracking-tight">
              {summary?.awaiting_approval_count ?? 2}
            </span>
            <span className="font-code-sm text-code-sm text-secondary font-semibold">Awaiting Staff SRE</span>
          </div>
          <p className="font-code-sm text-code-sm text-on-surface-variant mt-1">High-risk gated proposals</p>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              Monitored Workflows
            </span>
            <div className="p-1.5 rounded-lg bg-surface-container text-on-surface">
              <span className="material-symbols-outlined text-[1.25rem]">hub</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              {summary?.active_workflows_monitored ?? 4}
            </span>
            <span className="font-code-sm text-code-sm text-tertiary font-semibold">Demo integrations</span>
          </div>
          <p className="font-code-sm text-code-sm text-on-surface-variant mt-1">n8n, Make, Salesforce, Zapier</p>
        </div>
      </div>

      {/* Reproducible Demo Scenario Injector Panel */}
      <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-space-md border-b border-[#24304a]/40 mb-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[1.5rem]">science</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Controlled Demo Workflow Injector
                </h2>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-code-sm text-code-sm font-semibold">
                  5 Test Scenarios
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Trigger reproducible simulated failures to observe detection, AI diagnosis, recovery policies, and verification.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-space-md">
          {demoScenarios.map((demo) => (
            <div
              key={demo.id}
              className="p-space-md rounded-lg bg-surface-container border border-[#24304a]/40 flex flex-col justify-between gap-3 hover:border-primary/50 transition-all group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-code-sm text-code-sm text-primary font-semibold truncate">{demo.platform}</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-xs text-[0.625rem]">
                    {demo.badge}
                  </span>
                </div>
                <h3 className="font-label-md text-label-md text-on-surface font-semibold leading-snug group-hover:text-primary transition-colors">
                  {demo.title}
                </h3>
                <p className="font-body-sm text-[0.8125rem] text-on-surface-variant line-clamp-3">
                  {demo.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTriggerDemo(demo.id)}
                disabled={triggeringScenario !== null}
                className="w-full py-1.5 px-3 rounded bg-surface-container-high hover:bg-primary hover:text-surface-container-lowest text-on-surface font-label-xs text-label-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[1rem]">play_arrow</span>
                {triggeringScenario === demo.id ? 'Simulating...' : 'Trigger Failure'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Systems Health Grid & Recent Incidents Dual Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Recent Incidents Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-space-md">
          <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm space-y-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-[#24304a]/40">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[1.25rem]">warning</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Recent Incidents Feed
                </h2>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="text-primary hover:underline font-label-sm text-label-sm flex items-center gap-1"
              >
                <span>View All (18)</span>
                <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
              </button>
            </div>

            <div className="space-y-space-sm">
              {summary?.recent_incidents?.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => navigate(`/recovery-center?highlight=${incident.id}`)}
                  className="p-space-md rounded-lg bg-surface-container hover:bg-surface-container-high border border-[#24304a]/40 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold">
                          {incident.incident_number}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          {incident.workflow_name}
                        </span>
                        <span className="font-code-sm text-code-sm text-on-surface-variant">
                          {incident.platform} · {incident.cluster}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                        {incident.error_message}
                      </p>
                    </div>
                    {getStatusBadge(incident.status)}
                  </div>

                  <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm pt-1 border-t border-[#24304a]/20">
                    <span>Gate Stage: {incident.pipeline_stage}/8</span>
                    <span className="text-primary flex items-center gap-1">
                      <span>Inspect Plan</span>
                      <span className="material-symbols-outlined text-[0.875rem]">chevron_right</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Connected Platform Health & Safe Guarantees (5 cols) */}
        <div className="lg:col-span-5 space-y-space-md">
          <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm space-y-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-[#24304a]/40">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-tertiary text-[1.25rem]">security</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Connected Systems Telemetry
                </h2>
              </div>
              <button
                onClick={() => navigate('/integrations')}
                className="text-primary hover:underline font-label-sm text-label-sm"
              >
                Integrations
              </button>
            </div>

            <div className="space-y-2">
              {summary?.platform_health?.map((item) => (
                <div
                  key={item.platform}
                  className="p-3 rounded-lg bg-surface-container flex items-center justify-between border border-[#24304a]/30"
                >
                  <div className="flex items-center gap-space-sm">
                    <span className={`h-2 w-2 rounded-full ${item.status === 'online' ? 'bg-tertiary' : 'bg-outline'}`}></span>
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold block">{item.platform}</span>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">{item.active_workflows} live workflows</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-code-sm text-code-sm text-tertiary font-bold block">{item.latency_ms == null ? 'Not checked' : `${item.latency_ms}ms`}</span>
                    <span className="font-label-xs text-label-xs text-on-surface-variant uppercase">{item.status === 'online' ? 'Latency' : 'Status: demo'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform Guarantees Callout */}
            <div className="p-3.5 rounded-lg bg-surface-container space-y-1.5 border border-[#24304a]/40">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[1.125rem]">verified_user</span>
                <span className="font-label-xs text-label-xs uppercase font-semibold">Deterministic Policy Enforced</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                The local demo enforces deterministic allowlists and approval checks. Recovery and postcondition checks are simulated; no production workflow is changed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
