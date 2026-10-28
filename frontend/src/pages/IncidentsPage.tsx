import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Incident } from '../types/index.js';
import { fetchIncidents, reDiagnoseIncident, runSandboxTest } from '../api/client.js';

export const IncidentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [diagnosing, setDiagnosing] = useState(false);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents(filter);
      setIncidents(data);
      if (data.length > 0) {
        const queryHighlight = searchParams.get('highlight');
        const found = queryHighlight ? data.find(i => i.id === queryHighlight) : null;
        setSelectedIncident(found || data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [filter]);

  const handleReDiagnose = async () => {
    if (!selectedIncident) return;
    try {
      setDiagnosing(true);
      const updated = await reDiagnoseIncident(selectedIncident.id);
      setSelectedIncident(updated);
      setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err: any) {
      alert(`Diagnosis failed: ${err.message}`);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleRunSandbox = async () => {
    if (!selectedIncident) return;
    try {
      setSandboxLoading(true);
      const updated = await runSandboxTest(selectedIncident.id);
      setSelectedIncident(updated);
      setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err: any) {
      alert(`Sandbox execution failed: ${err.message}`);
    } finally {
      setSandboxLoading(false);
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

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              Incident Diagnostics & Evidence
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error/10 text-error font-label-xs text-label-xs font-semibold border border-error/20">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              Observer Active
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Inspecting execution anomalies, sanitized payload frames, AI root cause hypotheses, and deterministic risk classifications.
          </p>
        </div>

        <button
          onClick={() => navigate('/recovery-center')}
          className="px-4 py-2 rounded-lg bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md transition-opacity"
        >
          <span>Go to Recovery Center</span>
          <span className="material-symbols-outlined text-[1.125rem]">arrow_forward</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
        {['all', 'awaiting_approval', 'executing', 'verified_healed', 'escalated'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-colors capitalize ${
              filter === tab
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-md'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Dual Pane Grid: List on Left (5 cols), Deep Inspector on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-space-sm">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`p-space-md rounded-xl border transition-all cursor-pointer space-y-2 ${
                selectedIncident?.id === inc.id
                  ? 'bg-surface-container-low border-primary shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                  : 'bg-surface-container border-[#24304a]/40 hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold">
                      {inc.incident_number}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      {inc.workflow_name}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {inc.error_message}
                  </p>
                </div>
                {getStatusBadge(inc.status)}
              </div>

              <div className="flex items-center justify-between font-code-sm text-code-sm text-on-surface-variant pt-1 border-t border-[#24304a]/20">
                <span>{inc.platform} · {inc.cluster}</span>
                <span className="text-secondary font-semibold">Stage {inc.pipeline_stage}/8</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-lg space-y-space-md">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm pb-space-sm border-b border-[#24304a]/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold">
                      {selectedIncident.incident_number}
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      {selectedIncident.title}
                    </h2>
                  </div>
                  <p className="font-code-sm text-code-sm text-on-surface-variant">
                    Correlation ID: {selectedIncident.evidence.correlation_id} · Affected: {selectedIncident.evidence.affected_step}
                  </p>
                </div>
                {getStatusBadge(selectedIncident.status)}
              </div>

              {/* AI Diagnostic Synthesis Card */}
              <div className="p-space-md rounded-lg bg-surface-container border border-secondary/30 space-y-space-sm shadow-[0_0_24px_-4px_rgba(139,92,246,0.25)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-secondary">
                    <span className="material-symbols-outlined text-[1.25rem]">psychology</span>
                    <span className="font-label-md text-label-md font-bold uppercase">
                      Gemini AI Diagnostic Synthesis
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary font-code-sm text-code-sm font-bold">
                    Confidence: {Math.round((selectedIncident.ai_diagnosis?.confidence ?? 0.95) * 100)}%
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="font-label-xs text-label-xs uppercase font-semibold text-on-surface-variant">
                    Identified Root Cause:
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">
                    {selectedIncident.ai_diagnosis?.likely_cause || selectedIncident.error_message}
                  </p>
                </div>

                {selectedIncident.ai_diagnosis?.supporting_evidence && (
                  <div className="space-y-1 pt-1">
                    <span className="font-label-xs text-label-xs uppercase font-semibold text-on-surface-variant">
                      Supporting Evidence:
                    </span>
                    <ul className="space-y-1">
                      {selectedIncident.ai_diagnosis.supporting_evidence.map((ev, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-tertiary text-[1rem] mt-0.5">check</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#24304a]/30">
                  <span className="font-code-sm text-code-sm text-secondary">
                    Model: {selectedIncident.ai_diagnosis?.model || 'gemini-2.5-flash'}
                  </span>
                  <button
                    type="button"
                    onClick={handleReDiagnose}
                    disabled={diagnosing}
                    className="px-2.5 py-1 rounded bg-secondary-container/30 hover:bg-secondary-container text-secondary font-label-xs text-label-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[0.875rem]">refresh</span>
                    {diagnosing ? 'Synthesizing...' : 'Re-run Diagnosis'}
                  </button>
                </div>
              </div>

              {/* Redacted Payload Inspection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    Evidence Payload (Credentials Sanitized)
                  </span>
                  <span className="font-code-sm text-code-sm text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[0.875rem]">lock</span>
                    Redacted by Evidence Collector
                  </span>
                </div>
                <pre className="p-space-sm rounded-lg bg-surface-container-lowest font-code-sm text-code-sm text-on-surface overflow-x-auto border border-[#24304a]/40 max-h-48">
                  {JSON.stringify(selectedIncident.evidence.redacted_payload || {}, null, 2)}
                </pre>
              </div>

              {/* Execution Logs */}
              <div className="space-y-1.5">
                <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                  Execution Trace Frames
                </span>
                <div className="p-space-sm rounded-lg bg-surface-container-lowest font-code-sm text-code-sm space-y-1 text-on-surface-variant border border-[#24304a]/40 max-h-40 overflow-y-auto">
                  {selectedIncident.evidence.raw_logs.map((log, idx) => (
                    <div key={idx} className="leading-snug">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-[#24304a]/30">
                <button
                  type="button"
                  onClick={handleRunSandbox}
                  disabled={sandboxLoading}
                  className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium flex items-center gap-1.5 border border-[#24304a]/40 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[1.125rem] text-tertiary">science</span>
                  <span>{sandboxLoading ? 'Simulating...' : 'Test In Sandbox'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/recovery-center?highlight=${selectedIncident.id}`)}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md transition-opacity"
                >
                  <span>Resolve in Recovery Center</span>
                  <span className="material-symbols-outlined text-[1.125rem]">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-surface-container-low border border-[#24304a]/40 text-center text-on-surface-variant">
              Select an incident to inspect evidence and diagnostic details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
