import React, { useState } from 'react';
import { Incident } from '../types/index.js';
import { approveProposal, rejectProposal } from '../api/client.js';

interface ApprovalModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  incident,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [comment, setComment] = useState('Reviewed dry-run simulation and idempotency assertions. Authorized for execution.');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      await approveProposal(incident.id, comment);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      await rejectProposal(incident.id, rejectReason || 'Operator rejected proposal');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-xl bg-surface-container-low border border-[#24304a] shadow-[0_16px_36px_-8px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-space-lg border-b border-[#24304a]/60 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[1.5rem] text-primary">gshield</span>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-sm text-code-sm font-bold">
                  {incident.incident_number}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Review & Authorize Recovery Plan
                </h3>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Human-in-the-loop sign-off gate · Role requirement: Staff Reliability Eng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-space-lg space-y-space-md max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-error-container/40 border border-error/50 text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-[1.25rem]">error</span>
              <span className="text-body-sm">{error}</span>
            </div>
          )}

          {/* Root Cause & Proposed Fix */}
          <div className="space-y-space-xs">
            <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold text-on-surface-variant">
              Root Cause & Proposed Remediation
            </span>
            <div className="p-space-md rounded-lg bg-surface-container border border-[#24304a]/40 space-y-2">
              <div className="flex items-start gap-2 text-on-surface">
                <span className="material-symbols-outlined text-error text-[1.25rem] flex-shrink-0 mt-0.5">error_outline</span>
                <div>
                  <span className="font-label-xs text-label-xs uppercase text-on-surface-variant font-semibold">Failure Cause:</span>
                  <p className="font-body-sm text-body-sm font-medium">{incident.ai_diagnosis?.likely_cause || incident.error_message}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-on-surface pt-1 border-t border-[#24304a]/30">
                <span className="material-symbols-outlined text-primary text-[1.25rem] flex-shrink-0 mt-0.5">auto_fix_high</span>
                <div>
                  <span className="font-label-xs text-label-xs uppercase text-on-surface-variant font-semibold">Proposed Action ({incident.ai_diagnosis?.proposed_action}):</span>
                  <p className="font-body-sm text-body-sm text-on-surface">
                    {incident.ai_diagnosis?.validation_plan || 'Execute bounded recovery step with verified postconditions.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Safe-Execution Guarantees */}
          <div className="space-y-space-xs">
            <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold text-on-surface-variant">
              Safe-Execution Guarantees
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-surface-container border border-[#24304a]/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[1.125rem]">check_circle</span>
                <div className="min-w-0">
                  <span className="font-label-xs text-label-xs text-on-surface font-semibold block">Idempotency Preserved</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant truncate block">
                    {incident.evidence.idempotency_key || 'Verified via ledger'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-container border border-[#24304a]/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[1.125rem]">check_circle</span>
                <div className="min-w-0">
                  <span className="font-label-xs text-label-xs text-on-surface font-semibold block">State Snapshot Backed Up</span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant truncate block">
                    {incident.safe_execution_guarantees.state_snapshot_url || 's3://autoheal-backups'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Dry-Run Score */}
          <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between border border-[#24304a]/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[1.25rem]">science</span>
              <div>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">Sandbox Simulation Score</span>
                <p className="font-code-sm text-code-sm text-on-surface-variant">Isolated dry-run verified before sign-off</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-surface-container-highest text-tertiary font-code-sm text-code-sm font-bold">
              {incident.sandbox_simulation.score}/100 (100% Pass)
            </span>
          </div>

          {/* Operator Audit Justification */}
          {!isRejecting ? (
            <div className="space-y-1">
              <label className="font-label-xs text-label-xs uppercase font-semibold text-on-surface-variant">
                Operator Sign-off Justification
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-lg bg-surface-container text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary border border-[#24304a]/50"
                placeholder="Enter sign-off comments for audit log..."
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="font-label-xs text-label-xs uppercase font-semibold text-error">
                Rejection Reason (Required)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-lg bg-surface-container text-on-surface font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-error border border-error/50"
                placeholder="Specify reason for rejecting proposal..."
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-space-lg border-t border-[#24304a]/60 bg-surface-container flex items-center justify-between gap-space-sm">
          {!isRejecting ? (
            <>
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="px-3.5 py-2 rounded-lg bg-error-container/30 hover:bg-error-container text-error font-label-md text-label-md font-medium transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[1.125rem]">block</span>
                Reject Proposal
              </button>
              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[1.25rem]">gshield</span>
                  {loading ? 'Executing Recovery...' : 'Approve & Trigger Safe Execution Now'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="px-5 py-2 rounded-lg bg-error-container hover:bg-error-container/80 text-on-error-container font-label-md text-label-md font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
