import React from 'react';
import { AlertTriangle, RefreshCw, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { Profile } from '../../types';
import { Dialog } from '../common/Dialog';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  profileUsername: string;
  onReloadRemote: () => void;
  onOverwriteWithLocal: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  profileUsername,
  onReloadRemote,
  onOverwriteWithLocal,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} labelledBy="conflict-title" className="w-full max-w-md bg-surface border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-warning shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="conflict-title" className="text-base font-bold text-ink tracking-tight">
              Edit Conflict Detected
            </h3>
            <p className="text-xs text-muted">
              Profile <span className="font-mono text-warning">@{profileUsername}</span> was modified elsewhere.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-canvas/80 border border-line text-xs space-y-2 mb-5">
          <div className="flex items-start gap-2 text-body">
            <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Another browser tab or creator published updates to this page while you had it open. Stale edits cannot silently overwrite newer changes.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onReloadRemote}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Load Newer Server Version (Recommended)</span>
          </button>

          <button
            onClick={onOverwriteWithLocal}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-strong text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer border border-line-strong"
          >
            <span>Overwrite Server With My Local Edits</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
    </Dialog>
  );
};
