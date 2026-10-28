import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types/index.js';
import { fetchAuditLogs } from '../api/client.js';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVED')) {
      return 'bg-tertiary/10 text-tertiary border-tertiary/30';
    }
    if (action.includes('REJECTED') || action.includes('FAILED')) {
      return 'bg-error-container/40 text-error border-error/30';
    }
    if (action.includes('DIAGNOSIS') || action.includes('AI')) {
      return 'bg-secondary-container/40 text-secondary border-secondary/30';
    }
    return 'bg-surface-container-high text-primary border-primary/20';
  };

  return (
    <div className="p-space-lg space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
              System Audit Logs
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs text-label-xs font-semibold border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Immutable Ledger
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Complete auditable event trail recording every failure caught, diagnosis synthesized, operator sign-off, and verified recovery.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium flex items-center gap-1.5 border border-[#24304a]/40 transition-colors"
        >
          <span className="material-symbols-outlined text-[1.125rem]">refresh</span>
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#24304a]/60 bg-surface-container text-on-surface-variant font-label-xs text-label-xs uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Incident</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24304a]/30 font-code-sm text-code-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-primary font-bold whitespace-nowrap">
                    {log.incident_number || 'SYSTEM'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded border text-[0.75rem] font-bold ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-on-surface whitespace-nowrap font-medium">
                    {log.actor}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant max-w-md truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
