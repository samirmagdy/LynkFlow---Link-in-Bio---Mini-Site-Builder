import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Flag, X, ShieldAlert, Check } from 'lucide-react';
import { Dialog } from '../common/Dialog';

interface AbuseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUsername: string;
}

export const AbuseReportModal: React.FC<AbuseReportModalProps> = ({ isOpen, onClose, targetUsername }) => {
  const { submitAbuseReport } = useApp();
  const [reason, setReason] = useState<'spam' | 'phishing' | 'copyright' | 'harmful'>('spam');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAbuseReport({
      profileUsername: targetUsername,
      reason,
      description,
      reporterEmail: email || undefined
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="abuse-report-title" className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-danger" />
            <h3 id="abuse-report-title" className="text-base font-bold text-ink tracking-tight">Report Page @{targetUsername}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report dialog"
            className="touch-target p-1 text-muted hover:text-ink rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-success flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-ink">Report Submitted</h4>
            <p className="text-xs text-muted">
              Thank you. Our trust & safety team will review this page within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-body mb-1">Reason for Report</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none"
              >
                <option value="spam">Spam or Misleading Content</option>
                <option value="phishing">Phishing or Malicious Links</option>
                <option value="copyright">Copyright or Trademark Infringement</option>
                <option value="harmful">Harassment or Harmful Material</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1">Description of Issue</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details regarding the violation..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1">Your Email (Optional)</label>
              <input
                type="email"
                placeholder="For case update notifications"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none font-mono text-[11px]"
              />
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
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
    </Dialog>
  );
};
