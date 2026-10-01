import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, ExternalLink, Facebook, Linkedin, Loader2, Mail, MessageCircle, Send, Share2, Twitter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cancelSocialPublication, completeSocialShare, loadSocialConnections, loadSocialPublications, loadSocialShareEvents, publishLinkedInPost, recordSocialShare, scheduleLinkedInPost, ShareProvider, SocialConnection, SocialPublication, startLinkedInOAuth, SocialShareEvent } from '../../services/socialShareService';

const PROVIDERS: Array<{ id: ShareProvider; label: string; icon: React.ReactNode; hint: string }> = [
  { id: 'x', label: 'X', icon: <Twitter className="h-4 w-4" />, hint: 'Post with a pre-filled message' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, hint: 'Share your page with your network' },
  { id: 'facebook', label: 'Facebook', icon: <Facebook className="h-4 w-4" />, hint: 'Open the share composer' },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" />, hint: 'Send it to a conversation' },
  { id: 'telegram', label: 'Telegram', icon: <Send className="h-4 w-4" />, hint: 'Share to a chat or channel' },
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, hint: 'Open a new email draft' },
];
const BROADCAST_PROVIDERS = PROVIDERS.filter(provider => provider.id !== 'email');

function defaultScheduleTime(): string {
  const value = new Date(Date.now() + 60 * 60_000);
  value.setSeconds(0, 0);
  return value.toISOString().slice(0, 16);
}

function shareUrl(provider: ShareProvider, content: string, targetUrl: string): string {
  const text = encodeURIComponent(content);
  const url = encodeURIComponent(targetUrl);
  switch (provider) {
    case 'x': return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case 'whatsapp': return `https://wa.me/?text=${encodeURIComponent(`${content}\n${targetUrl}`)}`;
    case 'telegram': return `https://t.me/share/url?url=${url}&text=${text}`;
    case 'email': return `mailto:?subject=${encodeURIComponent('Take a look at this page')}&body=${encodeURIComponent(`${content}\n\n${targetUrl}`)}`;
  }
}

export const SocialShareHub: React.FC = () => {
  const { activeProfile } = useApp();
  const [content, setContent] = useState(`I just published a new page — take a look at @${activeProfile.username}.`);
  const [targetUrl, setTargetUrl] = useState(() => `${window.location.origin}/@${activeProfile.username}`);
  const [events, setEvents] = useState<SocialShareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<ShareProvider | 'all' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedinConnection, setLinkedinConnection] = useState<SocialConnection | null>(null);
  const [linkedinPublishing, setLinkedinPublishing] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime);
  const [scheduling, setScheduling] = useState(false);
  const [publications, setPublications] = useState<SocialPublication[]>([]);

  useEffect(() => {
    setContent(`I just published a new page — take a look at @${activeProfile.username}.`);
    setTargetUrl(`${window.location.origin}/@${activeProfile.username}`);
    let cancelled = false;
    setLoading(true);
    void Promise.all([loadSocialShareEvents(activeProfile.id), loadSocialConnections(), loadSocialPublications(activeProfile.id)]).then(([shareEvents, connections, scheduledPosts]) => { if (!cancelled) { setEvents(shareEvents); setLinkedinConnection(connections.find(connection => connection.provider === 'linkedin' && connection.status === 'active') || null); setPublications(scheduledPosts); } }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load share activity.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeProfile.id, activeProfile.username]);

  const valid = useMemo(() => content.trim().length > 0 && /^https?:\/\//i.test(targetUrl.trim()), [content, targetUrl]);

  const openProvider = async (provider: ShareProvider) => {
    if (!valid) { setError('Add a message and a valid page URL before sharing.'); return; }
    if (provider === 'linkedin' && !linkedinConnection) { startLinkedInOAuth(); return; }
    if (provider === 'linkedin' && linkedinConnection) {
      setLinkedinPublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishLinkedInPost(content.trim(), targetUrl.trim(), activeProfile.id);
        await completeSocialShare(event.id, 'completed');
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to LinkedIn.'); }
      finally { setLinkedinPublishing(false); }
      return;
    }
    setBusyProvider(provider); setError(null);
    try {
      const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
      setEvents(previous => [event, ...previous].slice(0, 20));
      const popup = window.open(shareUrl(provider, content.trim(), targetUrl.trim()), '_blank', 'noopener,noreferrer');
      await completeSocialShare(event.id, popup ? 'completed' : 'failed');
      setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: popup ? 'completed' : 'failed' } : item));
      if (!popup) setError('Your browser blocked the provider window. Allow pop-ups and try again.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start this share.'); }
    finally { setBusyProvider(null); }
  };

  const openAllProviders = async () => {
    if (!valid) { setError('Add a message and a valid page URL before sharing.'); return; }
    setBusyProvider('all'); setError(null);
    let blocked = false;
    try {
      for (const provider of BROADCAST_PROVIDERS) {
        const event = await recordSocialShare(activeProfile.id, provider.id, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        const popup = window.open(shareUrl(provider.id, content.trim(), targetUrl.trim()), '_blank', 'noopener,noreferrer');
        blocked ||= !popup;
        await completeSocialShare(event.id, popup ? 'completed' : 'failed');
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: popup ? 'completed' : 'failed' } : item));
      }
      if (blocked) setError('Some provider windows were blocked. Allow pop-ups and retry the failed handoffs.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to open all share composers.'); }
    finally { setBusyProvider(null); }
  };

  const schedulePost = async () => {
    if (!valid) { setError('Add a message and a valid page URL before scheduling.'); return; }
    if (!linkedinConnection) { startLinkedInOAuth(); return; }
    setScheduling(true); setError(null);
    try {
      const publication = await scheduleLinkedInPost(content.trim(), targetUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString());
      setPublications(previous => [publication, ...previous].slice(0, 50));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule LinkedIn post.'); }
    finally { setScheduling(false); }
  };

  const cancelScheduledPost = async (publication: SocialPublication) => {
    setScheduling(true); setError(null);
    try { await cancelSocialPublication(publication.id); setPublications(previous => previous.map(item => item.id === publication.id ? { ...item, status: 'cancelled' } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to cancel scheduled post.'); }
    finally { setScheduling(false); }
  };

  const retryShare = async (event: SocialShareEvent) => {
    if (busyProvider !== null) return;
    setBusyProvider(event.provider); setError(null);
    try {
      const popup = window.open(shareUrl(event.provider, event.content, event.target_url), '_blank', 'noopener,noreferrer');
      await completeSocialShare(event.id, popup ? 'completed' : 'failed');
      setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: popup ? 'completed' : 'failed' } : item));
      if (!popup) setError('Your browser blocked the provider window. Allow pop-ups and try again.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to retry this share.'); }
    finally { setBusyProvider(null); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(targetUrl.trim()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Copy is unavailable in this browser.'); }
  };

  const publicationPanel = publications.length > 0 ? <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><h3 className="text-sm font-semibold text-ink">Scheduled publishing</h3><p className="mt-1 text-xs text-muted">Scheduled posts continue even if you leave the Studio.</p></div><div className="divide-y divide-line">{publications.map(publication => <div key={publication.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-ink">LinkedIn</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${publication.status === 'published' ? 'bg-success/10 text-success' : publication.status === 'failed' ? 'bg-danger/10 text-danger' : publication.status === 'cancelled' ? 'bg-surface-2 text-muted' : 'bg-warning/10 text-warning'}`}>{publication.status}</span><time className="text-[10px] text-subtle">{new Date(publication.scheduled_at).toLocaleString()}</time></div><p className="mt-1 truncate text-[11px] text-muted">{publication.last_error || publication.content}</p></div>{publication.status === 'scheduled' && <button type="button" disabled={scheduling} onClick={() => void cancelScheduledPost(publication)} className="self-start text-[11px] font-semibold text-danger hover:underline disabled:opacity-50 sm:self-auto">Cancel</button>}</div>)}</div></section> : null;

  return <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-5xl space-y-6">
    <header><div className="flex items-center gap-2"><Share2 className="h-5 w-5 text-accent" /><h2 className="text-lg font-bold text-ink">Share & Publish</h2></div><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Compose once, then hand off to the networks your audience already uses. LynkFlow records each handoff without storing social credentials.</p></header>
    {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-surface p-3 text-xs text-danger">{error}</div>}
    {publicationPanel}
    <section className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-ink">LinkedIn publishing</p><p className="mt-1 text-[11px] text-muted">{linkedinConnection ? `Connected as ${linkedinConnection.account_name || 'your LinkedIn account'}. Posts are confirmed by LinkedIn before they are marked complete.` : 'Connect LinkedIn to publish directly. Other networks continue through their native composer.'}</p></div>{linkedinConnection ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span> : <button type="button" onClick={() => startLinkedInOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect LinkedIn</button>}</div>{linkedinConnection && <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-[11px] font-semibold text-body">Schedule a LinkedIn post<input type="datetime-local" value={scheduledAt} min={defaultScheduleTime()} onChange={event => setScheduledAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-line bg-canvas px-3 text-xs font-normal text-ink" /></label><button type="button" disabled={scheduling || busyProvider !== null || linkedinPublishing} onClick={() => void schedulePost()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{scheduling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Schedule post'}</button></div>}</section>
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm"><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-4"><div><label htmlFor="share-copy" className="text-xs font-semibold text-body">Your message</label><textarea id="share-copy" value={content} onChange={event => setContent(event.target.value)} maxLength={2800} rows={6} className="mt-2 w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Tell people what you are sharing…" /><p className="mt-1 text-right text-[11px] text-muted">{content.length}/2800</p></div><div><label htmlFor="share-url" className="text-xs font-semibold text-body">Page to share</label><div className="mt-2 flex gap-2"><input id="share-url" value={targetUrl} onChange={event => setTargetUrl(event.target.value)} type="url" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /><button type="button" onClick={() => void copyLink()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent">{copied ? <Check className="h-4 w-4 text-success" /> : <Clipboard className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button></div></div></div>
      <div><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-body">Share everywhere</p><button type="button" disabled={busyProvider !== null || linkedinPublishing} onClick={() => void openAllProviders()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-[11px] font-semibold text-canvas transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{busyProvider === 'all' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Open all composers</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{PROVIDERS.map(provider => <button key={provider.id} type="button" disabled={busyProvider !== null || linkedinPublishing} onClick={() => void openProvider(provider.id)} className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-canvas px-3 text-left transition hover:border-accent hover:bg-accent-surface/30 disabled:cursor-wait disabled:opacity-60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-surface text-accent">{busyProvider === provider.id || (provider.id === 'linkedin' && linkedinPublishing) ? <Loader2 className="h-4 w-4 animate-spin" /> : provider.icon}</span><span className="min-w-0"><span className="block text-xs font-semibold text-ink">{provider.label}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{provider.id === 'linkedin' && linkedinConnection ? 'Publish directly with confirmation' : provider.id === 'linkedin' ? 'Connect for direct publishing' : provider.hint}</span></span><ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-subtle" /></button>)}</div><p className="mt-3 text-[11px] leading-5 text-muted">LinkedIn can publish directly after connection. Other providers open their native composer so you remain in control of the final post.</p></div>
    </div></section>
    <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><h3 className="text-sm font-semibold text-ink">Recent share activity</h3><p className="mt-1 text-xs text-muted">A private record of publishing handoffs for @{activeProfile.username}.</p></div>{loading ? <div className="flex items-center justify-center gap-2 p-10 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading activity…</div> : events.length === 0 ? <div className="p-10 text-center text-xs text-muted">No shares yet. Your first handoff will appear here.</div> : <div className="divide-y divide-line">{events.map(event => <div key={event.id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-xs font-semibold capitalize text-ink">{event.provider}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${event.status === 'completed' ? 'bg-success/10 text-success' : event.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{event.status}</span></div><p className="mt-1 truncate text-[11px] text-muted">{event.content}</p></div><div className="flex shrink-0 items-center gap-3"><time className="text-[10px] text-subtle">{new Date(event.created_at).toLocaleDateString()}</time>{event.status === 'failed' && <button type="button" disabled={busyProvider !== null} onClick={() => void retryShare(event)} className="text-[11px] font-semibold text-accent hover:underline disabled:cursor-wait disabled:opacity-60">Retry</button>}</div></div>)}</div>}</section>
  </div></div>;
};
