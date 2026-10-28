import React, { useState, useEffect } from 'react';
import { Incident } from '../types/index.js';
import { fetchIncidents } from '../api/client.js';
import { ApprovalModal } from '../components/ApprovalModal.js';

export const RecoveryApprovalPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents('awaiting_approval');
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-space-lg space-y-space-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-space-sm">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
            Human Approval Sign-off Gate
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold border border-secondary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
            {incidents.length} Pending Sign-off
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
          High-risk, consequential, or schema-altering proposals requiring Staff Reliability Engineer sign-off before downstream execution.
        </p>
      </div>

      {incidents.length === 0 ? (
        <div className="p-12 rounded-xl bg-surface-container-low border border-[#24304a]/40 text-center space-y-3">
          <span className="material-symbols-outlined text-[3rem] text-tertiary">task_alt</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            All Approval Queues Clear
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
            Zero proposals currently require human operator sign-off. Autonomous healing policies are actively monitoring connected workflows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-space-md">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="p-space-lg rounded-xl bg-surface-container-low border border-secondary/40 shadow-lg space-y-space-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold">
                      {incident.incident_number}
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      {incident.workflow_name}
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-code-sm text-code-sm uppercase">
                      {incident.platform}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">
                    {incident.ai_diagnosis?.likely_cause || incident.error_message}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/40 text-secondary font-label-xs text-label-xs font-semibold flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                  Action Gate 06 of 08
                </div>
              </div>

              <div className="p-space-md rounded-lg bg-surface-container border border-[#24304a]/40 space-y-1">
                <span className="font-label-xs text-label-xs uppercase text-primary font-semibold">
                  Synthesized Remediation Proposal:
                </span>
                <p className="font-body-sm text-body-sm text-on-surface">
                  {incident.ai_diagnosis?.validation_plan}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#24304a]/30">
                <span className="font-code-sm text-code-sm text-on-surface-variant">
                  Safe Guarantees: Idempotency Verified · Cold S3 Snapshot Preserved
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncident(incident);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[1.25rem]">gshield</span>
                  <span>Review & Authorize</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ApprovalModal
        incident={selectedIncident}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
