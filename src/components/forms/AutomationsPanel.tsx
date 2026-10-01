import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Check, Loader2, Mail, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { createEmailAutomation, deleteEmailAutomation, EmailAutomation, loadEmailAutomations, setEmailAutomationEnabled } from '../../services/automationService';

export const AutomationsPanel: React.FC = () => {
  const { activeProfile, showToast } = useApp();
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState('Welcome new subscribers');
  const [subject, setSubject] = useState('Thanks for joining');
  const [body, setBody] = useState('Thanks for subscribing — I’m glad you’re here.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAutomations(await loadEmailAutomations(activeProfile.id)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load automations.'); }
    finally { setLoading(false); }
  }, [activeProfile.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) return;
    setSaving(true); setError(null);
    try {
      await createEmailAutomation(activeProfile.id, name.trim(), subject.trim(), body.trim());
      setOpenForm(false); showToast?.('Automation enabled.'); await refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save automation.'); }
    finally { setSaving(false); }
  };

  const toggle = async (automation: EmailAutomation) => {
    setBusyId(automation.id); setError(null);
    try { await setEmailAutomationEnabled(automation.id, !automation.enabled); showToast?.(automation.enabled ? 'Automation paused.' : 'Automation enabled.'); await refresh(); }
    catch (toggleError) { setError(toggleError instanceof Error ? toggleError.message : 'Unable to update automation.'); }
    finally { setBusyId(null); }
  };

  const remove = async (automation: EmailAutomation) => {
    if (!window.confirm(`Delete “${automation.name}”?`)) return;
    setBusyId(automation.id); setError(null);
    try { await deleteEmailAutomation(automation.id); showToast?.('Automation deleted.'); await refresh(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete automation.'); }
    finally { setBusyId(null); }
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-2 text-sm font-bold text-ink"><Bot className="h-4 w-4 text-accent" />Automations</div><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Let LynkFlow welcome new consented subscribers automatically. Messages include a secure unsubscribe link.</p></div>
        <button type="button" onClick={() => setOpenForm((value) => !value)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-canvas hover:opacity-90"><Plus className="h-3.5 w-3.5" /> New automation</button>
      </div>
      {openForm && <form onSubmit={save} className="mt-5 space-y-3 rounded-xl border border-line bg-canvas p-4">
        <label className="block text-xs font-semibold text-body">Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" /></label>
        <label className="block text-xs font-semibold text-body">Email subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" /></label>
        <label className="block text-xs font-semibold text-body">Welcome message<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} rows={5} className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-ink outline-none focus:border-accent" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpenForm(false)} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-body">Cancel</button><button type="submit" disabled={saving || !name.trim() || !subject.trim() || !body.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save automation</button></div>
      </form>}
    </div>
    {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">{error}</div>}
    <div className="rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4"><h3 className="text-sm font-bold text-ink">Your automations</h3><p className="mt-0.5 text-xs text-muted">The trigger currently available is “new consented subscriber”.</p></div>
      {loading ? <div className="p-8 text-center text-xs text-muted">Loading automations…</div> : automations.length === 0 ? <div className="p-10 text-center"><Bot className="mx-auto h-8 w-8 text-subtle" /><p className="mt-2 text-sm font-semibold text-body">No automations yet</p><p className="mt-1 text-xs text-muted">Create a welcome message to make every new subscriber feel seen.</p></div> : <div className="divide-y divide-line">{automations.map((automation) => <div key={automation.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-accent" /><span className="truncate text-sm font-semibold text-ink">{automation.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${automation.enabled ? 'bg-success/10 text-success' : 'bg-surface-2 text-muted'}`}>{automation.enabled ? 'Active' : 'Paused'}</span></div><div className="mt-1 text-xs text-muted">{automation.run_count} run{automation.run_count === 1 ? '' : 's'} · {automation.subject}</div></div><div className="flex items-center gap-2 self-start sm:self-auto"><button type="button" onClick={() => void toggle(automation)} disabled={busyId === automation.id} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-body hover:bg-surface-2 disabled:opacity-50">{automation.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{automation.enabled ? 'Pause' : 'Enable'}</button><button type="button" onClick={() => void remove(automation)} disabled={busyId === automation.id} aria-label={`Delete ${automation.name}`} className="rounded-xl border border-line p-2 text-muted hover:border-danger/30 hover:text-danger disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>}
    </div>
  </div>;
};
