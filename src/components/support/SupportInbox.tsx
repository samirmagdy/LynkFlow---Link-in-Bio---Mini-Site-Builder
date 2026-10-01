import React, { FormEvent, useEffect, useState } from 'react';
import { LifeBuoy, Send, Clock3, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

type Ticket = {
  id: string;
  subject: string;
  message: string;
  priority: 'community' | 'standard' | 'priority';
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved';
  sla_hours: number;
  due_at: string;
  created_at: string;
  routing_status?: 'pending' | 'sent' | 'failed';
  routing_error?: string | null;
};

const statusLabel: Record<Ticket['status'], string> = {
  open: 'Open', in_progress: 'In progress', waiting_on_customer: 'Waiting on you', resolved: 'Resolved'
};

export const SupportInbox: React.FC = () => {
  const { showToast } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadTickets = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setLoading(false); return; }
    const response = await fetch('/api/support/tickets', { headers: { authorization: `Bearer ${session.access_token}` } });
    const body = await response.json() as { data?: Ticket[]; error?: { message?: string } };
    if (response.ok) setTickets(body.data || []);
    else showToast(body.error?.message || 'Unable to load support tickets.');
    setLoading(false);
  };

  useEffect(() => { void loadTickets(); }, []);

  const retryRouting = async (ticketId: string) => {
    if (!supabase) return;
    setRetryingId(ticketId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again.');
      const response = await fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'POST', headers: { authorization: `Bearer ${session.access_token}` }
      });
      const body = await response.json() as { data?: Ticket; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message || 'Support routing retry failed.');
      setTickets(current => current.map(ticket => ticket.id === ticketId ? body.data! : ticket));
      showToast(body.data.routing_status === 'sent' ? 'Support request routed successfully.' : body.data.routing_error || 'Support routing is still pending.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Support routing retry failed.'); }
    finally { setRetryingId(null); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return showToast('Support requires Supabase configuration.');
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again.');
      const response = await fetch('/api/support/tickets', {
        method: 'POST', headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ subject, message })
      });
      const body = await response.json() as { data?: Ticket; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || 'Support request failed.');
      if (body.data) setTickets(current => [body.data!, ...current]);
      setSubject(''); setMessage(''); showToast(`Support request created. SLA: ${body.data?.sla_hours || 0} hours.`);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Support request failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <section className="studio-page max-w-5xl mx-auto w-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header>
        <div className="flex items-center gap-3"><span className="p-2 rounded-xl bg-accent/10 text-accent"><LifeBuoy className="w-5 h-5" /></span><h1 className="text-2xl font-bold text-ink">Support</h1></div>
        <p className="mt-2 text-sm text-subtle">Create a request and track its SLA from your workspace.</p>
      </header>
      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-5 space-y-4">
        <h2 className="font-semibold text-ink">Open a support request</h2>
        <input required minLength={3} maxLength={160} value={subject} onChange={e => setSubject(e.target.value)} placeholder="What do you need help with?" className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent" />
        <textarea required minLength={10} maxLength={10000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue and include useful details." rows={5} className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-accent" />
        <button disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send className="w-4 h-4" />{submitting ? 'Sending…' : 'Send request'}</button>
      </form>
      <div className="space-y-3">
        <h2 className="font-semibold text-ink">Your requests</h2>
        {loading ? <p className="text-sm text-subtle">Loading requests…</p> : tickets.length === 0 ? <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-subtle">No support requests yet.</div> : tickets.map(ticket => (
          <article key={ticket.id} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-ink">{ticket.subject}</h3><span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">{statusLabel[ticket.status]}</span></div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-subtle">{ticket.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-subtle"><span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> SLA {ticket.sla_hours}h</span><span className="inline-flex items-center gap-1">{ticket.status === 'resolved' ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <AlertCircle className="w-3.5 h-3.5 text-warning" />}Due {new Date(ticket.due_at).toLocaleString()}</span><span>{new Date(ticket.created_at).toLocaleDateString()}</span></div>
            {ticket.routing_status !== 'sent' && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs"><span className="text-body">{ticket.routing_status === 'failed' ? (ticket.routing_error || 'Could not route this request.') : 'Waiting for support routing configuration.'}</span><button type="button" onClick={() => void retryRouting(ticket.id)} disabled={retryingId === ticket.id} className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${retryingId === ticket.id ? 'animate-spin' : ''}`} />Retry routing</button></div>}
          </article>
        ))}
      </div>
    </section>
  );
};
