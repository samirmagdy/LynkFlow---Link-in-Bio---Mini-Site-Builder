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
  Crown
} from 'lucide-react';
import { ProductIllustration } from '../illustration/ProductIllustration';

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
  onInvite: (email: string, name: string, role: ProfileRole, profileIds: string[]) => void;
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

  const handleSubmit = () => {
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (!name.trim()) { setError('Name is required.'); return; }
    if (role !== 'owner' && selected.size === 0) { setError('Assign at least one profile for this role.'); return; }
    onInvite(email.trim(), name.trim(), role, Array.from(selected));
    onClose();
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

// ─── Main Component ───────────────────────────────────────────────────────────

export const MultiProfileManager: React.FC = () => {
  const { profiles, workspace, activeProfile, switchActiveProfile, createNewProfile, duplicateProfile, deleteProfile, removeDomain, addMember, removeMember, showToast, setCurrentView } = useApp();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; username: string; hasDomain: boolean } | null>(null);
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newCategory, setNewCategory] = useState('Creator');

  const entitlements = billingService.getWorkspaceEntitlements(workspace);
  const maxProfiles = entitlements.maxProfiles;
  const atLimit = typeof maxProfiles === 'number' && profiles.length >= maxProfiles;

  const handleCreateProfile = () => {
    if (!newUsername.trim()) { showToast('Username is required.'); return; }
    createNewProfile(newUsername.trim(), newDisplayName.trim() || newUsername.trim(), newCategory);
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto w-full">

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

      <div className="max-w-xl rounded-2xl border border-violet-500/15 bg-violet-500/5 p-2">
        <ProductIllustration variant="profiles" />
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
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
                  onClick={() => removeMember(member.id)}
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
          onInvite={(email, name, role, profileIds) => {
            const result = addMember(email, name, role, profileIds);
            if (!result.success) showToast(result.error || 'Failed to add member.');
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
