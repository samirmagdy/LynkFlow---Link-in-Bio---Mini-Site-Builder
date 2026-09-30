import React from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, ShieldAlert, FileText, Download, RotateCcw } from 'lucide-react';

export const AdminSafetyConsole: React.FC = () => {
  const { auditLogs, abuseReports, updateAbuseReportStatus, exportAccountData, resetAllData, user } = useApp();
  const reports = abuseReports;

  const handleResolveReport = async (id: string) => {
    await updateAbuseReportStatus(id, 'resolved');
  };

  const handleDismissReport = async (id: string) => {
    await updateAbuseReportStatus(id, 'dismissed');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <span>Trust, Safety & Compliance Console</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Audit logging, DMCA/abuse case triage, and GDPR data portability tools.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user.id === 'usr-guest' && <button
            onClick={exportAccountData}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-2 text-ink border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Account Data (JSON)</span>
          </button>}
          <button
            onClick={() => {
              if (window.confirm('Reset all demo profiles and data back to factory state?')) {
                resetAllData();
              }
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-danger border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Seed</span>
          </button>
        </div>
      </div>

      {/* Abuse Triage Queue */}
      <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-warning" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Abuse & Moderation Reports ({reports.length})
            </h3>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-subtle">
            No active abuse reports filed against your workspace profiles.
          </div>
        ) : (
          <div className="space-y-2.5">
            {reports.map(rep => (
              <div key={rep.id} className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-ink">@{rep.profileUsername}</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-danger border border-rose-500/20">
                      {rep.reason}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      rep.status === 'resolved' 
                        ? 'bg-emerald-500/10 text-success border border-emerald-500/20' 
                        : 'bg-surface-2 text-muted'
                    }`}>
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-muted text-[11px]">{rep.description}</p>
                  <div className="text-[10px] text-subtle font-mono mt-1">
                    Filed by {rep.reporterEmail || 'Anonymous'} · {new Date(rep.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rep.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResolveReport(rep.id)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-success border border-emerald-500/30 cursor-pointer"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleDismissReport(rep.id)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-body cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immutable Audit Log */}
      <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <FileText className="w-4 h-4 text-muted" />
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
            System & Security Audit Log
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line text-muted font-medium">
              <tr>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Actor</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Target</th>
                <th className="pb-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono text-[11px]">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-surface-2/30">
                  <td className="py-2.5 text-muted">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2.5 text-body">{log.actor}</td>
                  <td className="py-2.5 text-accent font-semibold">{log.action}</td>
                  <td className="py-2.5 text-ink">{log.target}</td>
                  <td className="py-2.5 text-muted font-sans text-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
