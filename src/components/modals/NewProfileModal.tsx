import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { THEME_PRESETS } from '../../data/mockData';
import { X, UserPlus } from 'lucide-react';
import { Dialog } from '../common/Dialog';

interface NewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProfileModal: React.FC<NewProfileModalProps> = ({ isOpen, onClose }) => {
  const { createNewProfile, showToast } = useApp();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('Creator & Artist');
  const [selectedThemeId, setSelectedThemeId] = useState(THEME_PRESETS[0].id);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast('Please enter a username');
      return;
    }
    createNewProfile(username.trim(), displayName.trim() || username.trim(), category, selectedThemeId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="new-profile-title" className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent" />
            <h3 id="new-profile-title" className="text-base font-bold text-ink tracking-tight">Create New Profile</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close create profile dialog"
            className="touch-target p-1 text-muted hover:text-ink rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-body mb-1">
              Username Handle <span className="text-danger">*</span>
            </label>
            <div className="flex items-center rounded-xl bg-canvas border border-line px-3 py-2 text-xs font-mono">
              <span className="text-subtle">lynkflow.me/</span>
              <input
                type="text"
                required
                placeholder="handle"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="bg-transparent text-ink focus:outline-none flex-1 ml-0.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-body mb-1">
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jordan Smith or Acme Agency"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-body mb-1">
              Primary Goal / Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none"
            >
              <option value="Creator & Artist">Creator & Artist</option>
              <option value="Design Agency & Studio">Design Agency & Studio</option>
              <option value="Hospitality & Culinary">Hospitality & Culinary</option>
              <option value="Podcaster & Musician">Podcaster & Musician</option>
              <option value="Tech & Startup">Tech & Startup</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-body mb-1.5">
              Starting Theme Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_PRESETS.slice(0, 3).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedThemeId(t.id)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    selectedThemeId === t.id
                      ? 'border-indigo-500 bg-surface-2 text-ink'
                      : 'border-line bg-canvas text-muted hover:text-ink'
                  }`}
                >
                  <span className="text-[11px] font-medium block truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted hover:text-ink bg-surface-2 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-inverse-text bg-inverse hover:bg-inverse-hover rounded-lg transition-colors cursor-pointer"
            >
              Create Profile
            </button>
          </div>
        </form>
    </Dialog>
  );
};
