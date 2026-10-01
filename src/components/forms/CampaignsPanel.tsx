import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Megaphone, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { createEmailCampaign, EmailCampaign, loadEmailCampaigns, sendEmailCampaign } from '../../services/campaignService';

const statusLabel: Record<EmailCampaign['status'], string> = {
  draft: 'Draft',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

export const CampaignsPanel: React.FC = () => {
  const { activeProfile, showToast } = useApp();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCampaigns(await loadEmailCampaigns(activeProfile.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, [activeProfile.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createEmailCampaign(activeProfile.id, subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      showToast?.('Campaign draft saved.');
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async (campaign: EmailCampaign) => {
    if (!window.confirm(`Send “${campaign.subject}” to active, consented subscribers?`)) return;
    setSendingId(campaign.id);
    setError(null);
    try {
      const result = await sendEmailCampaign(campaign.id);
      showToast?.(`Campaign sent to ${result.sentCount} of ${result.recipientCount} subscribers.`);
      await refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send campaign.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Megaphone className="h-4 w-4 text-accent" />
              Email campaigns
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
              Send a simple update to people who explicitly subscribed from @{activeProfile.username}. We include an unsubscribe link automatically.
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-1.5 self-start rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-body hover:bg-surface-2 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <form onSubmit={saveDraft} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-body">
            Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} placeholder="A short update for your audience" className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" />
          </label>
          <label className="block text-xs font-semibold text-body">
            Message
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={10000} rows={6} placeholder="Write your update here..." className="mt-1.5 w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm leading-6 text-ink outline-none focus:border-accent" />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[11px] leading-4 text-muted"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Only active, consented subscribers are included. Maximum 500 recipients per send.</p>
            <button type="submit" disabled={saving || !subject.trim() || !message.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              <Mail className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </form>
      </div>

      {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</div>}

      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div><h3 className="text-sm font-bold text-ink">Campaign history</h3><p className="mt-0.5 text-xs text-muted">Drafts and delivery outcomes are stored on the server.</p></div>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">{campaigns.length} total</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div className="p-10 text-center"><Mail className="mx-auto h-8 w-8 text-subtle" /><p className="mt-2 text-sm font-semibold text-body">No campaigns yet</p><p className="mt-1 text-xs text-muted">Save your first draft above when you are ready to speak to your audience.</p></div>
        ) : (
          <div className="divide-y divide-line">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="truncate text-sm font-semibold text-ink">{campaign.subject}</div><div className="mt-1 text-xs text-muted">{new Date(campaign.created_at).toLocaleString()} · {campaign.sent_count}/{campaign.recipient_count} delivered</div></div>
                <div className="flex items-center gap-2 self-start sm:self-auto"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${campaign.status === 'sent' ? 'bg-success/10 text-success' : campaign.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted'}`}>{statusLabel[campaign.status]}</span>{campaign.status === 'draft' && <button type="button" onClick={() => void sendCampaign(campaign)} disabled={sendingId === campaign.id} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"><Send className="h-3.5 w-3.5" />{sendingId === campaign.id ? 'Sending…' : 'Send'}</button>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
