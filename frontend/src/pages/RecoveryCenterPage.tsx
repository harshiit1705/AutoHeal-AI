import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Incident } from '../types/index.js';
import {
  fetchIncidents,
  runSandboxTest,
  approveProposal,
  executeRecovery,
  rejectProposal,
} from '../api/client.js';
import { ApprovalModal } from '../components/ApprovalModal.js';

export const RecoveryCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [modalIncident, setModalIncident] = useState<Incident | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [policySupervised, setPolicySupervised] = useState(true);
  const [healthCheckNotice, setHealthCheckNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchIncidents(activeFilter);
      setIncidents(data);

      const highlightId = searchParams.get('highlight');
      if (highlightId) {
        const found = data.find((i) => i.id === highlightId);
        if (found) {
          setSelectedIncident(found);
          return;
        }
      }

      if (!selectedIncident && data.length > 0) {
        const defaultAwaiting = data.find((i) => i.status === 'awaiting_approval') || data[0];
        setSelectedIncident(defaultAwaiting);
      } else if (selectedIncident) {
        const refreshed = data.find((i) => i.id === selectedIncident.id);
        if (refreshed) setSelectedIncident(refreshed);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter, searchParams]);

  const handleRunSandbox = async (inc: Incident) => {
    try {
      setLoadingAction(true);
      const updated = await runSandboxTest(inc.id);
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      alert(`Sandbox execution failed: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDirectApprove = async (inc: Incident) => {
    try {
      setLoadingAction(true);
      const updated = inc.status === 'awaiting_approval' ? await approveProposal(inc.id) : await executeRecovery(inc.id);
      setSelectedIncident(updated);
      await loadData();
    } catch (err: any) {
      alert(`Approval execution failed: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async (inc: Incident) => {
    try {
      setLoadingAction(true);
      const updated = await rejectProposal(inc.id, 'Operator rejected proposal from Recovery Center');
      setSelectedIncident(updated);
      await loadData();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleHealthCheck = () => {
    setHealthCheckNotice('Live connection probes are not implemented. Integration cards are demo/simulated unless explicitly configured and verified.');
    setTimeout(() => setHealthCheckNotice(null), 4000);
  };

  const activeInc = selectedIncident || incidents[0];

  const filterCounts = {
    all: incidents.length || 18,
    suggested: 4,
    awaiting_approval: incidents.filter((i) => i.status === 'awaiting_approval').length,
    executing: incidents.filter((i) => i.status === 'executing').length,
    verified_healed: incidents.filter((i) => i.status === 'verified_healed').length,
    escalated: incidents.filter((i) => i.status === 'escalated').length,
  };

  return (
    <div className="p-space-lg space-y-space-lg">
      {/* Top Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              Recovery Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs text-label-xs font-semibold border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {policySupervised ? 'Supervised Mode' : 'Autonomous Mode'}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Autonomous self-healing engine and supervised human-in-the-loop recovery operations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Global Policy Pill Toggle */}
          <div className="flex items-center gap-space-sm px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface border border-[#24304a]/40">
            <span className="material-symbols-outlined text-[1.25rem] text-primary">policy</span>
            <div className="flex flex-col">
              <span className="font-label-xs text-label-xs font-semibold text-on-surface leading-tight">
                Autonomous Policy
              </span>
              <span className="font-code-sm text-code-sm text-on-surface-variant leading-none">
                {policySupervised ? 'Supervised Only (High-Risk Gated)' : 'Autonomous Active'}
              </span>
            </div>
            <button
              onClick={() => setPolicySupervised(!policySupervised)}
              className={`ml-2 w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                policySupervised ? 'bg-primary-container justify-end' : 'bg-surface-container justify-start'
              }`}
              title="Toggle Auto vs Supervised"
              type="button"
            >
              <div className="w-4 h-4 rounded-full bg-on-primary-container shadow-sm"></div>
            </button>
          </div>

          <button
            onClick={handleHealthCheck}
            className="px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md font-medium flex items-center gap-1.5 transition-colors border border-[#24304a]/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[1.125rem] text-tertiary">monitor_heart</span>
            <span>Run Health Check</span>
          </button>
        </div>
      </div>

      {/* Health Check Alert Notification */}
      {healthCheckNotice && (
        <div className="p-3 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary font-body-sm text-body-sm flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[1.25rem]">check_circle</span>
          <span>{healthCheckNotice}</span>
        </div>
      )}

      {/* End-to-End Pipeline Visualization Banner */}
      {activeInc && (
        <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="material-symbols-outlined text-[1.25rem] text-primary">schema</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Active Incident Recovery Pipeline
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-code-sm text-code-sm font-semibold border border-primary/20">
                {activeInc.incident_number}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                — {activeInc.workflow_name}
              </span>
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant">
              Gate Stage: {activeInc.pipeline_stage} of 8 · SLA Protected
            </span>
          </div>

          {/* Stepper Sequence (8 stages) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 relative">
            {/* 1. Detect Failure */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${activeInc.pipeline_stage >= 1 ? 'bg-surface-container' : 'bg-surface-container-high opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs font-semibold text-tertiary">01 DETECT</span>
                <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">Failure Caught</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                HTTP {activeInc.http_status || 500}
              </span>
            </div>

            {/* 2. Collect Evidence */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${activeInc.pipeline_stage >= 2 ? 'bg-surface-container' : 'bg-surface-container-high opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs font-semibold text-tertiary">02 EVIDENCE</span>
                <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">Logs & Context</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">Sanitized</span>
            </div>

            {/* 3. Diagnose Cause */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${activeInc.pipeline_stage >= 3 ? 'bg-surface-container' : 'bg-surface-container-high opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs font-semibold text-tertiary">03 DIAGNOSE</span>
                <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">AI Root Cause</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant truncate">
                {activeInc.failure_category.replace(/_/g, ' ')}
              </span>
            </div>

            {/* 4. Propose Fix */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${activeInc.pipeline_stage >= 4 ? 'bg-surface-container' : 'bg-surface-container-high opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs font-semibold text-tertiary">04 REMEDIATION</span>
                <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">Synthesize Patch</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant truncate">
                {activeInc.ai_diagnosis?.proposed_action || 'Patch map'}
              </span>
            </div>

            {/* 5. Validate Fix */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${activeInc.pipeline_stage >= 5 ? 'bg-surface-container' : 'bg-surface-container-high opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs font-semibold text-tertiary">05 VALIDATE</span>
                <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">Sandbox Simulation</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                {activeInc.sandbox_simulation.score}% Pass Rate
              </span>
            </div>

            {/* 6. Approval Gate (Active or Passed) */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${
              activeInc.pipeline_stage === 6
                ? 'bg-secondary-container/40 text-on-secondary shadow-md relative border border-secondary/40'
                : activeInc.pipeline_stage > 6
                ? 'bg-surface-container'
                : 'bg-surface-container-high opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-label-xs text-label-xs font-bold ${activeInc.pipeline_stage >= 6 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  06 SIGN-OFF
                </span>
                {activeInc.pipeline_stage === 6 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
                ) : activeInc.pipeline_stage > 6 ? (
                  <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-[1rem]">lock</span>
                )}
              </div>
              <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">Approval Gate</span>
              <span className="font-code-sm text-code-sm text-secondary font-medium truncate">
                {activeInc.status === 'awaiting_approval' ? 'Pending Alex Chen' : 'Signed Off'}
              </span>
            </div>

            {/* 7. Execute Recovery */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${
              activeInc.pipeline_stage === 7
                ? 'bg-primary/20 text-on-surface border border-primary/40'
                : activeInc.pipeline_stage > 7
                ? 'bg-surface-container'
                : 'bg-surface-container-high opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-label-xs text-label-xs font-semibold ${activeInc.pipeline_stage >= 7 ? 'text-primary' : 'text-on-surface-variant'}`}>
                  07 EXECUTE
                </span>
                {activeInc.pipeline_stage === 7 ? (
                  <span className="material-symbols-outlined text-primary text-[1rem] animate-spin">sync</span>
                ) : activeInc.pipeline_stage > 7 ? (
                  <span className="material-symbols-outlined text-tertiary text-[1rem]">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-[1rem]">hourglass_empty</span>
                )}
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">Apply Recovery</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                {activeInc.pipeline_stage === 7 ? 'Executing...' : activeInc.pipeline_stage > 7 ? 'Committed' : 'Queued'}
              </span>
            </div>

            {/* 8. Verify Outcome */}
            <div className={`flex flex-col gap-1 p-2 rounded transition-colors ${
              activeInc.pipeline_stage === 8
                ? 'bg-tertiary/20 text-on-surface border border-tertiary/40'
                : 'bg-surface-container-high opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-label-xs text-label-xs font-semibold ${activeInc.pipeline_stage === 8 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  08 VERIFY
                </span>
                <span className={`material-symbols-outlined text-[1rem] ${activeInc.pipeline_stage === 8 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  verified
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface truncate">SLA Assertion</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                {activeInc.status === 'verified_healed' ? 'Verified Healed' : 'Pending Run'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Status Filter Tabs */}
      <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-colors ${
            activeFilter === 'all'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-md'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface font-code-sm text-code-sm">
            {filterCounts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('awaiting_approval')}
          className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-colors ${
            activeFilter === 'awaiting_approval'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-md'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <span>Awaiting Approval</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary text-surface font-code-sm text-code-sm font-bold">
            {filterCounts.awaiting_approval}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('executing')}
          className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-colors ${
            activeFilter === 'executing'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-md'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <span>Executing</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-primary font-code-sm text-code-sm">
            {filterCounts.executing}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('verified_healed')}
          className={`px-space-md py-space-sm rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-colors ${
            activeFilter === 'verified_healed'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-md'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <span>Verified Healed</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-tertiary font-code-sm text-code-sm">
            {filterCounts.verified_healed}
          </span>
        </button>
      </div>

      {/* Main Content Dual-Pane Grid (60% / 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* LEFT SIDE: Recovery Proposals & Action Queue (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {incidents.map((incident) => {
            const isSelected = activeInc?.id === incident.id;
            return (
              <div
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`p-space-lg rounded-xl bg-surface-container-low shadow-sm border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary/40 shadow-lg'
                    : 'border-[#24304a]/60 hover:border-[#24304a]'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-space-md mb-space-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold">
                        {incident.incident_number}
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {incident.workflow_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-xs text-label-xs uppercase">
                        {incident.platform} · {incident.cluster}
                      </span>
                    </div>
                    <p className="font-code-sm text-code-sm text-on-surface-variant">
                      Cluster: {incident.cluster} · Target: {incident.evidence.affected_step}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {incident.status === 'awaiting_approval' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-xs text-label-xs font-semibold flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                      Awaiting Approval
                    </div>
                  )}
                  {(incident.status === 'investigating' || incident.status === 'detected') && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDirectApprove(incident); }}
                      disabled={loadingAction}
                      className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">play_arrow</span>
                      <span>{loadingAction ? 'Running...' : 'Run Simulated Recovery'}</span>
                    </button>
                  )}

                  {incident.status === 'executing' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-xs text-label-xs font-semibold flex-shrink-0">
                      <span className="material-symbols-outlined text-[1rem] animate-spin">sync</span>
                      Executing Recovery
                    </div>
                  )}
                  {incident.status === 'verified_healed' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-label-xs text-label-xs font-semibold flex-shrink-0">
                      <span className="material-symbols-outlined text-[1rem]">verified</span>
                      Verified Healed
                    </div>
                  )}
                  {incident.status === 'escalated' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-xs text-label-xs font-semibold flex-shrink-0">
                      <span className="material-symbols-outlined text-[1rem]">warning</span>
                      Escalated to SRE
                    </div>
                  )}
                </div>

                {/* Problem & Proposed Patch Summary */}
                <div className="space-y-space-sm mb-space-md">
                  <div className="p-space-sm rounded-lg bg-surface-container flex items-start gap-space-sm border border-[#24304a]/30">
                    <span className="material-symbols-outlined text-[1.25rem] text-error flex-shrink-0 mt-0.5">error_outline</span>
                    <div className="min-w-0">
                      <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                        Failure Root Cause
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface font-medium">
                        {incident.ai_diagnosis?.likely_cause || incident.error_message}
                      </p>
                    </div>
                  </div>

                  <div className="p-space-sm rounded-lg bg-surface-container flex items-start gap-space-sm border border-[#24304a]/30">
                    <span className="material-symbols-outlined text-[1.25rem] text-primary flex-shrink-0 mt-0.5">auto_fix_high</span>
                    <div className="min-w-0">
                      <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                        Autonomous Recovery Proposal
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface">
                        {incident.ai_diagnosis?.validation_plan || 'Apply bounded recovery action and verify downstream SLA.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Executing Progress Bar if Executing */}
                {incident.status === 'executing' && (
                  <div className="p-space-sm rounded-lg bg-surface-container mb-space-md space-y-1 border border-[#24304a]/30">
                    <div className="flex items-center justify-between text-on-surface">
                      <span className="font-body-sm text-body-sm font-medium">
                        {incident.execution_progress?.step_description || 'Exponential backoff retry with jitter window'}
                      </span>
                      <span className="font-code-sm text-code-sm text-primary font-bold">
                        Step {incident.execution_progress?.current_step || 2} of {incident.execution_progress?.total_steps || 3}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${incident.execution_progress?.percentage || 66}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Telemetry & Safety Check Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mb-space-lg">
                  <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between border border-[#24304a]/30">
                    <span className="font-label-xs text-label-xs text-on-surface-variant">Risk Classification</span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary font-label-xs text-label-xs font-semibold capitalize">
                      {incident.risk_level.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between border border-[#24304a]/30">
                    <span className="font-label-xs text-label-xs text-on-surface-variant">Sandbox Pre-flight</span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-xs text-label-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[0.875rem]">done_all</span>{' '}
                      {incident.sandbox_simulation.score}% Pass
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-space-sm">
                  {incident.status === 'awaiting_approval' && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalIncident(incident);
                          setIsModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
                      >
                        <span>Review & Authorize</span>
                        <span className="material-symbols-outlined text-[1.125rem]">arrow_forward</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunSandbox(incident);
                        }}
                        disabled={loadingAction}
                        className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium flex items-center gap-1.5 transition-colors border border-[#24304a]/40"
                      >
                        <span className="material-symbols-outlined text-[1.125rem]">science</span>
                        <span>Test In Staging Sandbox</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(incident);
                        }}
                        disabled={loadingAction}
                        className="px-3.5 py-2 rounded-lg bg-error-container/40 hover:bg-error-container text-error font-label-md text-label-md font-medium flex items-center gap-1.5 transition-colors ml-auto"
                      >
                        <span className="material-symbols-outlined text-[1.125rem]">block</span>
                        <span>Reject Proposal</span>
                      </button>
                    </>
                  )}

                  {(incident.status === 'investigating' || incident.status === 'detected') && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDirectApprove(incident); }}
                      disabled={loadingAction}
                      className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">play_arrow</span>
                      <span>{loadingAction ? 'Running...' : 'Run Simulated Recovery'}</span>
                    </button>
                  )}

                  {incident.status === 'executing' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectApprove(incident);
                      }}
                      className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">task_alt</span>
                      <span>Complete & Verify Step</span>
                    </button>
                  )}

                  {incident.status === 'verified_healed' && (
                    <div className="flex items-center justify-between w-full text-on-surface-variant font-code-sm text-code-sm">
                      <span className="text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[1rem]">verified</span>
                        {incident.verification_result?.sla_assertion || 'SLA verified healthy'}
                      </span>
                      <span className="text-on-surface-variant">Audit Log Recorded</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT SIDE: Execution Inspector & Policy Panel (5 cols) */}
        {activeInc && (
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Safe-Execution Guarantees Card */}
            <div className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-lg space-y-space-md">
              <div className="flex items-center justify-between pb-space-sm border-b border-[#24304a]/30">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[1.25rem] text-primary">security</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Safe-Execution Guarantees
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-code-sm text-code-sm">
                  {activeInc.incident_number}
                </span>
              </div>

              {/* Workflow Reference Meta */}
              <div className="p-space-sm rounded-lg bg-surface-container space-y-1 border border-[#24304a]/30">
                <div className="flex justify-between items-center text-on-surface">
                  <span className="font-label-xs text-label-xs uppercase text-on-surface-variant">Target Workflow</span>
                  <span className="font-code-sm text-code-sm text-primary font-semibold">
                    {activeInc.workflow_name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-on-surface">
                  <span className="font-label-xs text-label-xs uppercase text-on-surface-variant">Target Step</span>
                  <span className="font-code-sm text-code-sm text-on-surface font-medium truncate">
                    {activeInc.evidence.affected_step}
                  </span>
                </div>
              </div>

              {/* Active Safeguards */}
              <div className="space-y-space-xs">
                <span className="font-label-xs text-label-xs uppercase font-semibold text-on-surface-variant tracking-wider">
                  Active Safeguards
                </span>
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-space-sm p-2 rounded bg-surface-container border border-[#24304a]/20">
                    <span className="material-symbols-outlined text-tertiary text-[1.125rem] flex-shrink-0 mt-0.5">check_circle</span>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">Idempotency Key Preserved</span>
                      <p className="font-code-sm text-code-sm text-on-surface-variant truncate">
                        Key: {activeInc.evidence.idempotency_key || 'idem-safe-default-01'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm p-2 rounded bg-surface-container border border-[#24304a]/20">
                    <span className="material-symbols-outlined text-tertiary text-[1.125rem] flex-shrink-0 mt-0.5">check_circle</span>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">State Snapshot Backed Up</span>
                      <p className="font-code-sm text-code-sm text-on-surface-variant truncate">
                        {activeInc.safe_execution_guarantees.state_snapshot_url || 's3://autoheal-backups'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm p-2 rounded bg-surface-container border border-[#24304a]/20">
                    <span className="material-symbols-outlined text-tertiary text-[1.125rem] flex-shrink-0 mt-0.5">check_circle</span>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">Rollback Compensation Configured</span>
                      <p className="font-code-sm text-code-sm text-on-surface-variant">
                        Atomic rollback active if subsequent step fails.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compensation Strategy */}
              <div className="p-space-sm rounded-lg bg-surface-container space-y-1 border border-[#24304a]/30">
                <div className="flex items-center gap-1.5 text-secondary">
                  <span className="material-symbols-outlined text-[1rem]">published_with_changes</span>
                  <span className="font-label-xs text-label-xs uppercase font-semibold">Compensation Strategy</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface">
                  {activeInc.safe_execution_guarantees.rollback_compensation ||
                    'Revert state to snapshot and broadcast alert to Slack #ops-alerts.'}
                </p>
              </div>

              {/* Human Sign-off Rules */}
              <div className="p-space-sm rounded-lg bg-surface-container space-y-2 border border-[#24304a]/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs text-label-xs uppercase font-semibold text-on-surface-variant">Human Sign-off Rules</span>
                  <span className="font-code-sm text-code-sm text-secondary font-semibold">
                    {activeInc.safe_execution_guarantees.timeout_remaining || '17m remaining'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-sm text-on-surface">
                  <span>Required Role:</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-xs text-label-xs font-semibold text-primary">
                    {activeInc.safe_execution_guarantees.required_role || 'Staff Reliability Eng'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-sm text-on-surface">
                  <span>Escalation Rule:</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {activeInc.safe_execution_guarantees.escalation_rule || 'PagerDuty dispatch at T-0'}
                  </span>
                </div>
              </div>

              {/* Sandbox Simulation Log Terminal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    Sandbox Simulation Logs
                  </span>
                  <span className="inline-flex items-center gap-1 font-code-sm text-code-sm text-tertiary">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Live Ephemeral Trace
                  </span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-lowest font-code-sm text-code-sm space-y-1 text-on-surface-variant overflow-x-auto border border-[#24304a]/40 max-h-44">
                  {activeInc.sandbox_simulation.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-on-surface-variant/50 select-none">{log.time}</span>
                      <span className="text-on-surface">
                        <span className={log.level === 'EXEC' ? 'text-tertiary' : log.level === 'DIFF' ? 'text-secondary' : 'text-primary'}>
                          [{log.level}]
                        </span>{' '}
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Authorization Action */}
              {activeInc.status === 'awaiting_approval' && (
                <div className="pt-space-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setModalIncident(activeInc);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-lg bg-primary-container hover:opacity-95 text-on-primary-container font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[1.25rem]">gshield</span>
                    <span>Approve & Trigger Safe Execution Now</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reliability KPI Callout */}
            <div className="p-space-md rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary">
                  <span className="material-symbols-outlined text-[1.5rem]">autorenew</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                    99.98%
                  </span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant uppercase">
                    Recovery Success Rate (Past 30d)
                  </span>
                </div>
              </div>
              <span className="font-code-sm text-code-sm text-tertiary font-bold">+0.14% vs MTTR Baseline</span>
            </div>
          </div>
        )}
      </div>

      {/* Review & Authorize Modal */}
      <ApprovalModal
        incident={modalIncident}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
