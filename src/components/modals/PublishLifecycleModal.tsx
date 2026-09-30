import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw, 
  History, 
  Link2, 
  Copy, 
  ExternalLink,
  Lock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../common/Dialog';
import { contentLifecycleService } from '../../services/contentLifecycleService';
import { PublishedProfileSnapshot } from '../../types';

interface PublishLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'publish' | 'schedule' | 'preview_token' | 'history' | 'validate';
}

export const PublishLifecycleModal: React.FC<PublishLifecycleModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'publish'
}) => {
  const { 
    activeProfile, 
    publishProfile, 
    rollbackToPublishedSnapshot, 
    generatePreviewLink, 
    scheduleRelease, 
    cancelScheduledRelease,
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'publish' | 'schedule' | 'preview_token' | 'history' | 'validate'>(initialTab);
  const [versionName, setVersionName] = useState(`Release v${(activeProfile.publishedVersion || 0) + 1}`);
  const [versionNotes, setVersionNotes] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(`idemp-${Date.now()}`);

  // Schedule state
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    return d.toISOString().slice(0, 16);
  });
  const [timezone, setTimezone] = useState(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  });

  // Preview token state
  const [generatedPreview, setGeneratedPreview] = useState<{ previewUrl: string; token: string; expiresAt: string } | null>(null);
  const [previewTtl, setPreviewTtl] = useState(60);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Rollback confirmation state
  const [selectedSnapshotForRollback, setSelectedSnapshotForRollback] = useState<PublishedProfileSnapshot | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Real-time validation computation (PUBL-003)
  const validationResult = React.useMemo(() => {
    return contentLifecycleService.validateDraftForPublish(activeProfile);
  }, [activeProfile]);

  if (!isOpen) return null;

  const handlePublishNow = async () => {
    if (!validationResult.canPublish) {
      showToast('Publish blocked: please fix critical validation issues first.');
      return;
    }
    setIsSubmitting(true);
    const resolvedVersionName = versionName.trim() || `Release v${(activeProfile.publishedVersion || 0) + 1}`;
    const resolvedNotes = versionNotes.trim() || changeNote.trim() || undefined;
    const success = await publishProfile(resolvedNotes || resolvedVersionName, idempotencyKey, resolvedVersionName, resolvedNotes);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  const handleSchedulePublish = async () => {
    if (!validationResult.canPublish) {
      showToast('Schedule blocked: please fix critical validation issues first.');
      return;
    }
    const isoString = new Date(scheduledDate).toISOString();
    const success = await scheduleRelease(isoString, timezone);
    if (success) {
      onClose();
    }
  };

  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true);
    try {
      const res = await generatePreviewLink(previewTtl);
      setGeneratedPreview(res);
      showToast('Secure preview link generated!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to generate preview link.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleCopyPreviewLink = () => {
    if (generatedPreview?.previewUrl) {
      navigator.clipboard.writeText(generatedPreview.previewUrl);
      showToast('Preview link copied to clipboard!');
    }
  };

  const handleConfirmRollback = async () => {
    if (!selectedSnapshotForRollback) return;
    setIsRollingBack(true);
    const success = await rollbackToPublishedSnapshot(
      selectedSnapshotForRollback.snapshotId,
      rollbackReason || `Rollback to snapshot v${selectedSnapshotForRollback.version}`
    );
    setIsRollingBack(false);
    if (success) {
      setSelectedSnapshotForRollback(null);
      onClose();
    }
  };

  const snapshots = activeProfile.snapshotHistory || [];

  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="publish-modal-title" className="w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-canvas/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-accent">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 id="publish-modal-title" className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
                <span>Content Lifecycle Manager</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-accent-soft border border-indigo-500/20">
                  v{activeProfile.publishedVersion || 0} → v{(activeProfile.publishedVersion || 0) + 1}
                </span>
              </h2>
              <p className="text-xs text-muted">
                Manage drafts, share expiring preview links, schedule releases, or rollback snapshots.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close content lifecycle dialog"
            className="touch-target p-2 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 border-b border-line bg-surface/40 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('publish')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'publish'
                ? 'border-indigo-500 text-ink'
                : 'border-transparent text-muted hover:text-ink-strong'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-accent" />
            <span>Publish Live</span>
          </button>

          <button
            onClick={() => setActiveTab('validate')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'validate'
                ? 'border-indigo-500 text-ink'
                : 'border-transparent text-muted hover:text-ink-strong'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-success" />
            <span>Pre-flight Quality</span>
            {validationResult.criticalIssues.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-danger text-[10px] font-bold">
                {validationResult.criticalIssues.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview_token')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'preview_token'
                ? 'border-indigo-500 text-ink'
                : 'border-transparent text-muted hover:text-ink-strong'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-accent-soft" />
            <span>Share Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-indigo-500 text-ink'
                : 'border-transparent text-muted hover:text-ink-strong'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-warning" />
            <span>Scheduled Release</span>
            {activeProfile.scheduledPublish && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-500 text-ink'
                : 'border-transparent text-muted hover:text-ink-strong'
            }`}
          >
            <History className="w-3.5 h-3.5 text-info" />
            <span>Version History ({snapshots.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: PUBLISH NOW */}
          {activeTab === 'publish' && (
            <div className="space-y-5">
              {/* Validation Gate summary */}
              {!validationResult.canPublish ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-danger space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-danger">
                    <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                    <span>Publishing Blocked: Critical Issues Found (PUBL-003)</span>
                  </div>
                  <p className="text-danger/90 leading-relaxed">
                    Liinx guarantees zero broken experiences on your public page. Review the issues under the Pre-flight tab before release.
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-1 text-[11px] text-danger">
                    {validationResult.criticalIssues.map((issue, idx) => (
                      <li key={idx}><strong>{issue.field}:</strong> {issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-success flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-success">Ready to Publish (v{(activeProfile.publishedVersion || 0) + 1})</span>
                    <p className="text-success/80 text-[11px] mt-0.5">
                      All validation checks passed. An immutable snapshot will be created and public edge caches will be purged atomically.
                    </p>
                  </div>
                </div>
              )}

              {/* Publication Details */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-body">Version name</label>
                <input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder={`Release v${(activeProfile.publishedVersion || 0) + 1}`} maxLength={80} className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink placeholder-subtle focus:outline-hidden focus:border-indigo-500" />
                <label className="block text-xs font-semibold text-body">Version notes</label>
                <textarea
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="What changed in this release?"
                  maxLength={500}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink placeholder-subtle focus:outline-hidden focus:border-indigo-500 resize-none"
                />
                <label className="block text-xs font-semibold text-body">Audit note <span className="font-normal text-muted">(optional)</span></label>
                <input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="Internal audit context" maxLength={500} className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-xs text-ink placeholder-subtle focus:outline-hidden focus:border-indigo-500" />
              </div>

              {/* Idempotency & Safety */}
              <div className="p-3.5 rounded-xl bg-canvas/60 border border-line text-[11px] space-y-1.5 text-muted">
                <div className="flex items-center justify-between text-body">
                  <span className="font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                    Idempotent Request Token
                  </span>
                  <span className="font-mono text-subtle">{idempotencyKey}</span>
                </div>
                <p>
                  Protects against double-publishes during intermittent connection timeouts or page refreshes.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-body hover:text-ink bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublishNow}
                  disabled={!validationResult.canPublish || isSubmitting}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    validationResult.canPublish && !isSubmitting
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-surface-2 text-subtle cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Purging cache & publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Immutable Snapshot v{(activeProfile.publishedVersion || 0) + 1}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PRE-FLIGHT VALIDATION */}
          {activeTab === 'validate' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Automated Quality & Accessibility Gate
                </h3>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  validationResult.isValid 
                    ? 'bg-emerald-500/10 text-success border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-danger border border-rose-500/20'
                }`}>
                  {validationResult.isValid ? 'Passes All Guardrails' : `${validationResult.criticalIssues.length} Critical Issues`}
                </span>
              </div>

              {/* Critical Issues List */}
              {validationResult.criticalIssues.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold text-danger block">Critical Failures (Blocks Publish):</span>
                  {validationResult.criticalIssues.map((issue, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                      <div className="flex items-center justify-between text-danger font-medium">
                        <span className="font-mono text-[10px] bg-rose-500/20 px-2 py-0.5 rounded">{issue.code}</span>
                        <span className="text-[10px] text-danger/80">{issue.field}</span>
                      </div>
                      <p className="text-danger">{issue.message}</p>
                      {issue.recommendation && (
                        <p className="text-[11px] text-danger/80 italic">Fix: {issue.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-success flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <div>
                    <span className="font-bold text-ink">Zero Critical Failures</span>
                    <p className="text-success/80 text-[11px]">
                      Links, URLs, media sources, and WCAG AA contrast conform to production standards.
                    </p>
                  </div>
                </div>
              )}

              {/* Warnings List */}
              {validationResult.warnings.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-semibold text-warning block">Optimization Warnings (Non-blocking):</span>
                  {validationResult.warnings.map((warn, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <div className="flex items-center justify-between text-warning font-medium">
                        <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">{warn.code}</span>
                        <span className="text-[10px] text-warning/80">{warn.field}</span>
                      </div>
                      <p className="text-warning">{warn.message}</p>
                      {warn.recommendation && (
                        <p className="text-[11px] text-warning/80">Suggestion: {warn.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHARE PREVIEW (PUBL-001) */}
          {activeTab === 'preview_token' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Share Secure Preview Link</h3>
                <p className="text-xs text-muted mt-1">
                  Share your active draft with clients, collaborators, or sponsors without exposing unfinished work to the public live page.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-canvas border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-body">
                    Preview Token Expiration Window
                  </label>
                  <select
                    value={previewTtl}
                    onChange={(e) => setPreviewTtl(Number(e.target.value))}
                    className="px-3 py-1 rounded-lg bg-surface border border-line-strong text-xs text-ink"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={1440}>24 Hours</option>
                    <option value={10080}>7 Days</option>
                  </select>
                </div>

                <button
                  onClick={handleGeneratePreview}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-purple-600/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingPreview ? 'Generating…' : 'Generate Expiring Preview Link'}</span>
                </button>
              </div>

              {generatedPreview && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-accent-soft">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-accent-soft" />
                      Active Preview URL
                    </span>
                    <span className="text-[10px] text-accent-soft font-mono">
                      Expires {new Date(generatedPreview.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={generatedPreview.previewUrl}
                      className="flex-1 px-3 py-2 rounded-lg bg-canvas border border-purple-500/30 text-xs text-ink font-mono"
                    />
                    <button
                      onClick={handleCopyPreviewLink}
                      className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={generatedPreview.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-strong transition-colors"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-[11px] text-subtle">
                    Visitors clicking this link will view the current draft in real time. Public visitors browsing your domain without this token will continue seeing your published snapshot.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SCHEDULED PUBLISH */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Scheduled Release</h3>
                <p className="text-xs text-muted mt-1">
                  Automate page releases across timezones. The release snapshot will be stored and automatically published when the UTC timestamp arrives.
                </p>
              </div>

              {activeProfile.scheduledPublish ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
                  <div className="flex items-center justify-between text-warning">
                    <span className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      Pending Scheduled Release
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-warning">
                      {activeProfile.scheduledPublish.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas/80 border border-line space-y-1 text-[11px] text-body">
                    <div>
                      <strong>Target Time (UTC):</strong> {activeProfile.scheduledPublish.scheduledTimeUtc}
                    </div>
                    <div>
                      <strong>Timezone:</strong> {activeProfile.scheduledPublish.timezone}
                    </div>
                    <div>
                      <strong>Scheduled By:</strong> {activeProfile.scheduledPublish.createdBy}
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => cancelScheduledRelease()}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-danger text-xs font-semibold cursor-pointer border border-rose-500/30 transition-colors"
                    >
                      Cancel Scheduled Release
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-canvas border border-line space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-body mb-1.5">
                        Target Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line-strong text-xs text-ink"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-body mb-1.5">
                        Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line-strong text-xs text-ink"
                      >
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                        <option value="America/New_York">Eastern Time (US / New York)</option>
                        <option value="America/Los_Angeles">Pacific Time (US / Los Angeles)</option>
                        <option value="Europe/London">London (GMT / BST)</option>
                        <option value="Europe/Paris">Paris (CET / CEST)</option>
                        <option value="Africa/Cairo">Cairo (EET / EEST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSchedulePublish}
                    disabled={!validationResult.canPublish}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      validationResult.canPublish
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                        : 'bg-surface-2 text-subtle cursor-not-allowed'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Confirm Scheduled Publish</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VERSION HISTORY & ROLLBACK (PUBL-005) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">Immutable Snapshot History</h3>
                  <p className="text-xs text-muted">
                    Rollback to any previous snapshot. Reproduces the exact theme, links, tabs, and styling.
                  </p>
                </div>
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-canvas border border-line text-muted text-xs">
                  No published snapshots saved yet. Publish your profile to establish your first immutable release.
                </div>
              ) : (
                <div className="space-y-3">
                  {snapshots.map((snap) => {
                    const isCurrent = snap.version === activeProfile.publishedVersion;
                    const dateFormatted = new Date(snap.publishedAt).toLocaleString();

                    return (
                      <div
                        key={snap.snapshotId}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrent 
                            ? 'bg-accent-surface border-indigo-500/40 text-ink'
                            : 'bg-canvas border-line text-body hover:border-line-strong'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ink text-xs">Release v{snap.version}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-success border border-emerald-500/20">
                                  Currently Live
                                </span>
                              )}
                              <span className="text-[10px] text-subtle font-mono">{snap.snapshotId}</span>
                            </div>
                            <div className="text-[11px] text-muted mt-1">
                              Published on {dateFormatted} by {snap.publishedBy}
                            </div>
                            <div className="text-xs text-body mt-2">
                              {snap.tabs?.length || 0} tabs · {snap.tabs?.reduce((acc, t) => acc + (t.blocks?.length || 0), 0)} blocks · Theme: {snap.theme?.name || 'Custom'}
                            </div>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={() => setSelectedSnapshotForRollback(snap)}
                              className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-strong text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-line-strong"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-warning" />
                              <span>Rollback</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rollback Confirmation Modal Layer (PUBL-005) */}
        {selectedSnapshotForRollback && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-surface border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-warning">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Confirm Snapshot Rollback</h4>
                  <p className="text-xs text-muted">Target: Release v{selectedSnapshotForRollback.version}</p>
                </div>
              </div>

              <p className="text-xs text-body leading-relaxed">
                Rolling back will recreate an authoritative public release reproducing snapshot <span className="font-mono text-warning">{selectedSnapshotForRollback.snapshotId}</span>. Public caches will be purged immediately.
              </p>

              <div>
                <label className="block text-xs font-semibold text-body mb-1">
                  Reason for Rollback (Audit Log)
                </label>
                <input
                  type="text"
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  placeholder="e.g., Reverting erroneous sponsor link"
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-line text-xs text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setSelectedSnapshotForRollback(null)}
                  className="px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-body text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRollback}
                  disabled={isRollingBack}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-amber-600/30"
                >
                  {isRollingBack ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Rolling back...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Execute Rollback</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </Dialog>
  );
};
