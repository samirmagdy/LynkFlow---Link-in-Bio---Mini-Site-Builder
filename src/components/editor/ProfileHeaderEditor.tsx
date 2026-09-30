import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { Profile, SocialLink } from '../../types';
import { Plus, Trash2, Globe, ShieldCheck, ExternalLink } from 'lucide-react';

interface ProfileHeaderEditorProps {
  onOpenSeoModal?: () => void;
}

export const ProfileHeaderEditor: React.FC<ProfileHeaderEditorProps> = ({ onOpenSeoModal }) => {
  const { activeProfile, updateDraftProfile, showToast } = useApp();
  const [isEditingSocials, setIsEditingSocials] = useState(false);

  const availablePlatforms: Array<SocialLink['platform']> = [
    'instagram', 'youtube', 'twitter', 'tiktok', 'spotify', 'github', 'linkedin', 'email', 'whatsapp'
  ];

  const handleFieldChange = (field: keyof Profile, value: Profile[keyof Profile]) => {
    updateDraftProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSocial = (platform: SocialLink['platform']) => {
    if (activeProfile.socialLinks.some(s => s.platform === platform)) {
      showToast(`${platform} is already in your social list`);
      return;
    }
    const newSocial: SocialLink = {
      id: `soc-${Date.now()}`,
      platform,
      url: platform === 'email' ? 'mailto:' : 'https://',
      active: true
    };
    updateDraftProfile(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, newSocial]
    }));
  };

  const handleUpdateSocial = (id: string, updates: Partial<SocialLink>) => {
    updateDraftProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(s => (s.id === id ? { ...s, ...updates } : s))
    }));
  };

  const handleRemoveSocial = (id: string) => {
    updateDraftProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter(s => s.id !== id)
    }));
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div>
          <h3 className="text-sm font-bold text-ink tracking-tight">Profile Header & Identity</h3>
          <span className="text-[11px] text-muted font-mono">@{activeProfile.username}</span>
        </div>

        {onOpenSeoModal && (
          <button
            type="button"
            onClick={onOpenSeoModal}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-canvas hover:bg-surface-2 text-ink-strong border border-line hover:border-line-strong flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Configure Custom Meta Titles, Descriptions, and Open Graph Previews"
          >
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span>SEO &amp; Open Graph</span>
          </button>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Avatar Preview */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <Avatar
            name={activeProfile.displayName || activeProfile.username}
            size="xl"
            avatarUrl={activeProfile.avatarUrl}
            className="ring-1 ring-ink/10"
          />
        </div>

        {/* Name & Bio Inputs */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-body mb-1">Display Name</label>
              <input
                type="text"
                value={activeProfile.displayName}
                onChange={(e) => handleFieldChange('displayName', e.target.value)}
                placeholder="Your Name / Studio"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-body mb-1">Category / Headline</label>
              <input
                type="text"
                value={activeProfile.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                placeholder="e.g. Visual Director & Photographer"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-body mb-1">Bio Description</label>
            <textarea
              rows={2}
              value={activeProfile.bio}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
              placeholder="Tell your audience about who you are, what you make, or your current focus."
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-body mb-1">Custom Avatar URL</label>
              <input
                type="text"
                value={activeProfile.avatarUrl}
                onChange={(e) => handleFieldChange('avatarUrl', e.target.value)}
                placeholder="https://... (or leave blank for generated avatar)"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 text-xs text-body cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeProfile.verified}
                  onChange={(e) => handleFieldChange('verified', e.target.checked)}
                  className="w-4 h-4 rounded border-line-strong bg-canvas text-accent focus:ring-0 cursor-pointer"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-info" />
                <span>Verified Badge</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SEO & Social Card Summary Strip */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-canvas/70 border border-line/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-accent flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink truncate">
                {activeProfile.seo?.title || `${activeProfile.displayName || activeProfile.username} – Link in Bio`}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-body shrink-0">
                {activeProfile.seo?.noIndex ? 'NoIndex' : 'Google Indexable'}
              </span>
            </div>
            <p className="text-[10px] text-muted truncate mt-0.5">
              {activeProfile.seo?.description || 'Custom search engine title, description, and Open Graph card configured.'}
            </p>
          </div>
        </div>

        {onOpenSeoModal && (
          <button
            type="button"
            onClick={onOpenSeoModal}
            className="text-xs font-medium text-accent hover:text-accent-soft ml-3 shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Edit SEO</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Social Links Manager */}
      <div className="pt-3 border-t border-line">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink">Social Channel Icons</span>
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span>Position:</span>
              <button
                type="button"
                onClick={() => handleFieldChange('socialPosition', 'top')}
                aria-pressed={activeProfile.socialPosition === 'top'}
                className={`px-2 py-0.5 rounded cursor-pointer ${activeProfile.socialPosition === 'top' ? 'bg-surface-2 text-ink font-medium' : 'text-subtle'}`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('socialPosition', 'bottom')}
                aria-pressed={activeProfile.socialPosition === 'bottom'}
                className={`px-2 py-0.5 rounded cursor-pointer ${activeProfile.socialPosition === 'bottom' ? 'bg-surface-2 text-ink font-medium' : 'text-subtle'}`}
              >
                Bottom
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingSocials(!isEditingSocials)}
            className="text-xs text-accent hover:text-accent-soft transition-colors cursor-pointer"
          >
            {isEditingSocials ? 'Done Editing' : '+ Add Channel'}
          </button>
        </div>

        {/* Add Channel Picker */}
        {isEditingSocials && (
          <div className="p-3 mb-3 rounded-xl bg-canvas border border-line">
            <span className="text-[11px] text-muted block mb-2">Click to add social profile:</span>
            <div className="flex flex-wrap gap-1.5">
              {availablePlatforms.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAddSocial(p)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-surface hover:bg-surface-2 text-body border border-line capitalize transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Social Links List */}
        <div className="space-y-2">
          {activeProfile.socialLinks.map(social => (
            <div key={social.id} className="flex items-center gap-2 p-2 rounded-lg bg-canvas/80 border border-line">
              <span className="text-xs font-semibold capitalize text-body w-20 shrink-0">
                {social.platform}
              </span>
              <input
                type="text"
                value={social.url}
                onChange={(e) => handleUpdateSocial(social.id, { url: e.target.value })}
                aria-label={`${social.platform} profile URL`}
                className="flex-1 px-2.5 py-1 text-xs rounded bg-surface border border-line text-ink focus:outline-none font-mono"
                placeholder={social.platform === 'email' ? 'mailto:you@domain.com' : 'https://...'}
              />
              <input
                type="checkbox"
                checked={social.active}
                onChange={(e) => handleUpdateSocial(social.id, { active: e.target.checked })}
                title="Active toggle"
                aria-label={`${social.platform} visibility`}
                className="w-4 h-4 rounded border-line-strong bg-surface text-accent focus:ring-0 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleRemoveSocial(social.id)}
                aria-label={`Remove ${social.platform} social link`}
                className="text-subtle hover:text-danger p-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
