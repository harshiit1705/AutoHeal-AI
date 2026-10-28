import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { WorkflowMonitorPage } from './pages/WorkflowMonitorPage.js';
import { IncidentsPage } from './pages/IncidentsPage.js';
import { RecoveryCenterPage } from './pages/RecoveryCenterPage.js';
import { RecoveryApprovalPage } from './pages/RecoveryApprovalPage.js';
import { IntegrationsPage } from './pages/IntegrationsPage.js';
import { AuditLogsPage } from './pages/AuditLogsPage.js';

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/workflow-monitor" element={<WorkflowMonitorPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/recovery-center" element={<RecoveryCenterPage />} />
        <Route path="/recovery-approval" element={<RecoveryApprovalPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
