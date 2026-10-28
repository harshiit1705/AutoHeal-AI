import React, { useState, useEffect } from 'react';
import { fetchIntegrations, testIntegrationConnection } from '../api/client.js';

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIntegrations()
      .then((data) => setIntegrations(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      const res = await testIntegrationConnection(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: `${String(res.status || (res.connected ? 'connection verified' : 'not verified')).replace(/_/g, ' ')} · ${res.message}`,
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: `Probe failed: ${err.message}`,
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-space-lg space-y-space-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-space-sm">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
            Integrations Registry
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-label-xs text-label-xs font-semibold border border-tertiary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            Zero Migration Architecture
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
          AutoHeal AI connects directly with your existing automation engines rather than replacing them. Credentials remain server-side with strict least-privilege scoping.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-space-lg rounded-xl bg-surface-container-low border border-[#24304a]/60 shadow-sm space-y-space-md flex flex-col justify-between"
          >
            <div className="space-y-space-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="font-label-xs text-label-xs uppercase font-semibold text-primary">
                    {item.type}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {item.name}
                  </h3>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-xs text-label-xs font-semibold ${item.status === 'connection_verified' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-high text-on-surface-variant'}`}><span className="w-1.5 h-1.5 rounded-full bg-current"></span>{String(item.status || 'demo').replace(/_/g, ' ')}</span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container space-y-1 border border-[#24304a]/30 font-code-sm text-code-sm">
                <div className="flex justify-between text-on-surface">
                  <span className="text-on-surface-variant">Endpoint:</span>
                  <span className="text-primary truncate max-w-xs">{item.endpoint}</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span className="text-on-surface-variant">Auth Scheme:</span>
                  <span>{item.auth_type}</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span className="text-on-surface-variant">Active Pipelines:</span>
                  <span>{item.active_workflows ?? 0} workflows</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-label-xs text-label-xs uppercase text-on-surface-variant font-semibold">
                  Supported Platform Capabilities
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.capabilities.map((cap: string) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-code-sm text-code-sm"
                    >
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {testResults[item.id] && (
                <div className="p-2.5 rounded bg-surface-container-high border border-[#24304a]/30 text-on-surface-variant font-code-sm text-code-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[1rem]">info</span>
                  <span>{testResults[item.id]}</span>
                </div>
              )}
            </div>

            <div className="pt-space-sm border-t border-[#24304a]/30 flex items-center justify-between">
              <span className="font-code-sm text-code-sm text-on-surface-variant">
                Last event: {item.last_event_at ? new Date(item.last_event_at).toLocaleTimeString() : 'No live events recorded'}
              </span>
              <button
                type="button"
                onClick={() => handleTest(item.id)}
                disabled={testingId === item.id}
                className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[1rem]">network_check</span>
                <span>{testingId === item.id ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
