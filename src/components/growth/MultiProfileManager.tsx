/**
 * Feature Specification 11: Multi-Profile Manager
 * PRO-001: Profile isolation display
 * PRO-002: Safe duplication (new IDs guaranteed by AppContext)
 * PRO-005: Member management scoped to profiles
 */
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { billingService } from '../../services/billingService';
import { ProfileRole } from '../../types';
import { AgencyAnalyticsPanel } from './AgencyAnalyticsPanel';
import { createClientApprovalRequest } from '../../services/clientApprovalService';
import {
  Users,
  Plus,
  Copy,
  Trash2,
  Globe,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  X,
  Edit3,
  Crown,
  Check,
  Send
} from 'lucide-react';

// ─── Profile Status Badge ─────────────────────────────────────────────────────

function ProfileStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: 'bg-emerald-500/10 text-success border-emerald-500/20',
    draft:     'bg-ink/5 text-muted border-line',
    suspended: 'bg-red-500/10 text-danger border-red-500/20',
    deleted:   'bg-danger-surface text-danger border-danger/40'
  };
  return (
    <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

// ─── Domain Status Pill ───────────────────────────────────────────────────────

function DomainPill({ domain }: { domain?: { domain: string; status: string; sslStatus: string } }) {
  if (!domain) return <span className="text-[11px] text-subtle font-mono">No domain</span>;
  const ok = domain.status === 'verified' && domain.sslStatus === 'active';
  return (
    <span className={`flex items-center gap-1 text-[11px] font-mono ${ok ? 'text-success' : 'text-warning'}`}>
      <Globe className="w-3 h-3" />
      {domain.domain}
      {!ok && <AlertTriangle className="w-3 h-3" />}
    </span>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: ProfileRole }) {
  const map: Record<ProfileRole, { label: string; className: string }> = {
    owner:   { label: 'Owner',   className: 'bg-indigo-500/10 text-accent border-indigo-500/20' },
    manager: { label: 'Manager', className: 'bg-amber-500/10 text-warning border-amber-500/20' },
    viewer:  { label: 'Viewer',  className: 'bg-ink/5 text-muted border-line' }
  };
  const cfg = map[role];
  return (
    <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Invite Member Modal ──────────────────────────────────────────────────────

function InviteMemberModal({
  profiles,
  onInvite,
  onClose
}: {
  profiles: { id: string; username: string }[];
  onInvite: (email: string, name: string, role: ProfileRole, profileIds: string[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ProfileRole>('manager');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSubmit = async () => {
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (!name.trim()) { setError('Name is required.'); return; }
    if (role !== 'owner' && selected.size === 0) { setError('Assign at least one profile for this role.'); return; }
    if (await onInvite(email.trim(), name.trim(), role, Array.from(selected))) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="invite-member-title">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 id="invite-member-title" className="text-sm font-bold text-ink flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent" />
            Invite Team Member
          </h3>
          <button aria-label="Close invite member dialog" onClick={onClose} className="touch-target p-1 text-subtle hover:text-ink cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {error && (
          <div className="text-[11px] text-danger bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Display Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Role</label>
            <div className="flex gap-2">
              {(['manager', 'viewer'] as ProfileRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer capitalize ${
                    role === r ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-canvas border-line text-muted hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-subtle mt-1">
              Manager: can edit assigned profiles. Viewer: read-only access.
            </p>
          </div>

          {/* Profile assignment */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Assigned Profiles *</label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {profiles.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="accent-indigo-500"
                  />
                  @{p.username}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted hover:text-ink bg-surface-2 rounded-lg cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer">Send Invitation</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Profile Confirm Modal ─────────────────────────────────────────────

function DeleteProfileModal({
  username,
  hasDomain,
  onConfirm,
  onClose
}: {
  username: string;
  hasDomain: boolean;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-profile-title">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-danger">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 id="delete-profile-title" className="text-sm font-bold text-ink">Delete @{username}?</h3>
        </div>
        <p className="text-xs text-muted mb-2">
          This profile and all its blocks, analytics, and form submissions will be permanently removed.
        </p>
        {hasDomain && (
          <div className="flex items-start gap-2 text-[11px] text-warning bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>This profile has an active custom domain. The domain will be disconnected before deletion.</span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-muted hover:text-ink bg-surface-2 rounded-lg cursor-pointer">Keep Profile</button>
          <button onClick={async () => { if (await onConfirm()) onClose(); }} className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer">Confirm Delete</button>
        </div>
      </div>
    </div>
  );
}

function ClientApprovalModal({
  profile,
  onClose,
  showToast,
}: {
  profile: { id: string; username: string; displayName: string };
  onClose: () => void;
  showToast: (message: string) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!clientName.trim() || !clientEmail.trim()) { setError('Client name and email are required.'); return; }
    setBusy(true); setError('');
    try {
      const result = await createClientApprovalRequest(profile.id, clientName.trim(), clientEmail.trim());
      setApprovalUrl(result.approvalUrl);
      showToast('Client approval link created.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Approval link could not be created.');
    } finally { setBusy(false); }
  };

  const copyLink = async () => {
    if (!approvalUrl) return;
    await navigator.clipboard?.writeText(approvalUrl);
    showToast('Approval link copied.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="client-approval-title">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><h3 id="client-approval-title" className="text-sm font-bold text-ink">Request client approval</h3><p className="mt-1 text-xs text-muted">Share a private draft review for @{profile.username} before publishing.</p></div>
          <button type="button" onClick={onClose} aria-label="Close approval dialog" className="rounded-lg p-1 text-subtle hover:bg-surface-2 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}
        {approvalUrl ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-3"><p className="text-xs font-semibold text-success">Review link ready</p><p className="mt-1 break-all text-[11px] text-body">{approvalUrl}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => void copyLink()} className="flex-1 rounded-xl bg-ink px-3 py-2.5 text-xs font-bold text-white">Copy link</button><a href={approvalUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-body">Open</a></div>
            <p className="text-[11px] leading-4 text-muted">The link expires in 7 days and lets the client approve the draft or request changes. Publishing remains under your team’s control.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-body">Client name<input value={clientName} onChange={event => setClientName(event.target.value)} placeholder="Alex Johnson" className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" /></label>
            <label className="block text-xs font-semibold text-body">Client email<input type="email" value={clientEmail} onChange={event => setClientEmail(event.target.value)} placeholder="client@company.com" className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" /></label>
            <button type="button" disabled={busy} onClick={() => void submit()} className="w-full rounded-xl bg-accent px-3 py-2.5 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-50">{busy ? 'Creating secure link…' : 'Create review link'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const MultiProfileManager: React.FC = () => {
  const { profiles, workspace, activeProfile, switchActiveProfile, createNewProfile, duplicateProfile, deleteProfile, removeDomain, addMember, removeMember, bulkPublishProfiles, showToast, setCurrentView } = useApp();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; username: string; hasDomain: boolean } | null>(null);
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newCategory, setNewCategory] = useState('Creator');
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<{ id: string; username: string; displayName: string } | null>(null);

  const entitlements = billingService.getWorkspaceEntitlements(workspace);
  const maxProfiles = entitlements.maxProfiles;
  const atLimit = typeof maxProfiles === 'number' && profiles.length >= maxProfiles;

  const handleCreateProfile = async () => {
    if (!newUsername.trim()) { showToast('Username is required.'); return; }
    const profileId = await createNewProfile(newUsername.trim(), newDisplayName.trim() || newUsername.trim(), newCategory);
    if (!profileId) return;
    setShowNewProfileForm(false);
    setNewUsername(''); setNewDisplayName(''); setNewCategory('Creator');
  };

  const handleDelete = async (profileId: string): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return false;
    if (profile.customDomain?.status === 'verified') {
      removeDomain(profileId); // PRO-003: disconnect domain before deletion
    }
    return deleteProfile(profileId);
  };

  const toggleProfileSelection = (profileId: string) => {
    setSelectedProfileIds(current => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId); else next.add(profileId);
      return next;
    });
  };

  const handleBulkPublish = async () => {
    const ids = Array.from(selectedProfileIds);
    if (!ids.length || bulkPublishing) return;
    if (!window.confirm(`Publish ${ids.length} selected profile${ids.length === 1 ? '' : 's'} now? Each profile will still pass its own accessibility and content validation.`)) return;
    setBulkPublishing(true);
    await bulkPublishProfiles(ids, 'Bulk agency release');
    setSelectedProfileIds(new Set());
    setBulkPublishing(false);
  };

  return (
    <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            <span>Multi-Profile Management</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Each profile has independent content, analytics, forms, and custom domain.{' '}
            <span className="font-mono text-accent">
              {profiles.length}/{typeof maxProfiles === 'number' ? maxProfiles : '∞'} profiles
            </span>
          </p>
        </div>
        <button
          disabled={atLimit}
          onClick={() => setShowNewProfileForm(true)}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            atLimit ? 'bg-surface-2 text-subtle cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          New Profile
        </button>
      </div>

      {atLimit && (
        <div className="p-4 rounded-2xl bg-warning-surface border border-warning/40 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="text-xs text-warning">
            <strong className="text-ink">Profile limit reached.</strong> Your {workspace.plan.toUpperCase()} plan allows {typeof maxProfiles === 'number' ? maxProfiles : '∞'} profile{typeof maxProfiles === 'number' && maxProfiles !== 1 ? 's' : ''}.{' '}
            <button onClick={() => setCurrentView('billing')} className="text-accent hover:text-accent-soft underline cursor-pointer">Upgrade to add more.</button>
          </div>
        </div>
      )}

      <AgencyAnalyticsPanel />

      {workspace.plan === 'agency' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-bold text-ink"><Send className="h-3.5 w-3.5 text-accent" />Agency release</h3>
            <p className="mt-1 text-[11px] text-muted">Select profiles to publish through the same validation, permissions, and audit pipeline.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedProfileIds(selectedProfileIds.size === profiles.length ? new Set() : new Set(profiles.map(profile => profile.id)))} className="rounded-xl border border-line px-3 py-2 text-[11px] font-semibold text-body hover:bg-surface-2">
              {selectedProfileIds.size === profiles.length ? 'Clear all' : 'Select all'}
            </button>
            <button type="button" disabled={!selectedProfileIds.size || bulkPublishing} onClick={() => void handleBulkPublish()} className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{bulkPublishing ? 'Publishing…' : `Publish ${selectedProfileIds.size || ''}`}
            </button>
          </div>
        </div>
      )}

      {/* New Profile Form */}
      {showNewProfileForm && (
        <div className="p-5 rounded-2xl bg-surface border border-indigo-500/40 space-y-4">
          <h4 className="text-xs font-bold text-ink flex items-center gap-2"><Plus className="w-3.5 h-3.5 text-accent" /> Create New Profile</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Username *</label>
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="my_brand"
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Display Name</label>
              <input
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                placeholder="My Brand"
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {['Creator', 'Artist', 'Musician', 'Influencer', 'Business', 'Developer', 'Freelancer', 'Brand', 'Educator', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewProfileForm(false)} className="px-4 py-2 text-xs font-medium text-muted hover:text-ink bg-surface-2 rounded-lg cursor-pointer">Cancel</button>
            <button onClick={handleCreateProfile} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer">Create Profile</button>
          </div>
        </div>
      )}

      {/* Profile Cards */}
      <div className="space-y-3">
        {profiles.map(profile => {
          const isActive = profile.id === activeProfile.id;
          return (
            <div
              key={profile.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isActive ? 'bg-surface border-indigo-500/50 ring-2 ring-indigo-500/10' : 'bg-surface/60 border-line hover:border-line-strong'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {workspace.plan === 'agency' && (
                  <button type="button" onClick={() => toggleProfileSelection(profile.id)} aria-label={`${selectedProfileIds.has(profile.id) ? 'Deselect' : 'Select'} @${profile.username} for bulk publishing`} aria-pressed={selectedProfileIds.has(profile.id)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition-colors ${selectedProfileIds.has(profile.id) ? 'border-accent bg-accent text-white' : 'border-line bg-canvas text-transparent hover:border-accent'}`}>
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {/* Avatar placeholder */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  isActive ? 'bg-indigo-600/30 text-accent-soft border border-indigo-500/30' : 'bg-surface-2 text-muted border border-line-strong'
                }`}>
                  {profile.displayName.slice(0, 2).toUpperCase()}
                </div>

                {/* Profile info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-ink">{profile.displayName}</span>
                    <span className="text-xs text-subtle font-mono">@{profile.username}</span>
                    <ProfileStatusBadge status={profile.status} />
                    {isActive && (
                      <span className="text-[10px] font-mono text-accent bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <DomainPill domain={profile.customDomain} />
                    <span className="flex items-center gap-1 text-[11px] text-subtle">
                      <BarChart2 className="w-3 h-3" />
                      {profile.tabs.reduce((t, tab) => t + tab.blocks.length, 0)} blocks
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-subtle">
                      <ShieldCheck className="w-3 h-3" />
                      {profile.category}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => switchActiveProfile(profile.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-body hover:text-ink bg-surface-2 hover:bg-surface-3 rounded-lg cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      Switch
                    </button>
                  )}
                  <button
                    onClick={() => duplicateProfile(profile.id)}
                    disabled={atLimit}
                    title="Duplicate profile (new IDs generated)"
                    aria-label={`Duplicate ${profile.username} profile`}
                    className="p-1.5 text-subtle hover:text-ink-strong rounded-lg hover:bg-surface-2 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {profiles.length > 1 && (
                    <button
                      onClick={() => setDeleteTarget({ id: profile.id, username: profile.username, hasDomain: !!profile.customDomain?.status })}
                      title="Delete profile"
                      aria-label={`Delete ${profile.username} profile`}
                      className="p-1.5 text-subtle hover:text-danger rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => { switchActiveProfile(profile.id); setCurrentView('settings'); }}
                    title="Manage custom domain"
                    className="p-1.5 text-subtle hover:text-accent rounded-lg hover:bg-indigo-500/10 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </button>
                  {workspace.plan === 'agency' && (
                    <button
                      type="button"
                      onClick={() => setApprovalTarget({ id: profile.id, username: profile.username, displayName: profile.displayName })}
                      title="Request client approval"
                      aria-label={`Request client approval for ${profile.username}`}
                      className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-indigo-500/10 hover:text-accent"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {approvalTarget && <ClientApprovalModal profile={approvalTarget} onClose={() => setApprovalTarget(null)} showToast={showToast} />}

      {/* PRO-005: Team Members */}
      <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-accent" />
            Team Members
          </h4>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-soft cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        </div>

        {/* Owner row */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/60 border border-line-strong/60">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-[11px] font-bold text-accent-soft shrink-0">
            <Crown className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink">{workspace.name} Owner</div>
            <div className="text-[11px] text-subtle font-mono truncate">Current account</div>
          </div>
          <RoleBadge role="owner" />
        </div>

        {/* Invited members */}
        {(workspace.members || []).length === 0 ? (
          <p className="text-xs text-subtle text-center py-2">No team members yet. Invite a manager or viewer.</p>
        ) : (
          <div className="space-y-2">
            {(workspace.members || []).map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line">
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-line-strong flex items-center justify-center text-[11px] font-bold text-muted shrink-0">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink truncate">{member.name}</span>
                    {member.pendingInviteExpiresAt && (
                      <span className="text-[10px] font-mono text-warning bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="text-[11px] text-subtle font-mono truncate">{member.email}</div>
                  {member.assignedProfileIds.length > 0 && (
                    <div className="text-[10px] text-subtle mt-0.5">
                      Profiles: {member.assignedProfileIds.map(pid => {
                        const p = profiles.find(pr => pr.id === pid);
                        return p ? `@${p.username}` : pid;
                      }).join(', ')}
                    </div>
                  )}
                </div>
                <RoleBadge role={member.role} />
                <button
                  onClick={() => { void removeMember(member.id); }}
                  title="Remove member"
                  aria-label={`Remove ${member.email || 'team member'}`}
                  className="p-1.5 text-subtle hover:text-danger rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteMemberModal
          profiles={profiles.map(p => ({ id: p.id, username: p.username }))}
          onInvite={async (email, name, role, profileIds) => {
            const result = await addMember(email, name, role, profileIds);
            if (!result.success) showToast(result.error || 'Failed to save member.');
            return result.success;
          }}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {deleteTarget && (
        <DeleteProfileModal
          username={deleteTarget.username}
          hasDomain={deleteTarget.hasDomain}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
