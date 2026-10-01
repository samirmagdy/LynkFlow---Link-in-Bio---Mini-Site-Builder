import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FormSubmission, Subscriber } from '../../types';
import { formSubmissionService } from '../../services/formSubmissionService';
import { 
  MailCheck, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Users, 
  ShieldCheck, 
  X, 
  AlertCircle,
  UserCheck,
  UserX,
  Send,
  Bot as BotIcon,
  CalendarCheck,
} from 'lucide-react';
import { ProductIllustration } from '../illustration/ProductIllustration';
import { CampaignsPanel } from './CampaignsPanel';
import { AutomationsPanel } from './AutomationsPanel';
import { BookingsPanel } from './BookingsPanel';

export const FormInboxView: React.FC = () => {
  const { submissions, deleteSubmission, unsubscribeSubscriber, activeProfile, user, showToast, appendAuditLog } = useApp();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'submissions' | 'subscribers' | 'campaigns' | 'automations' | 'bookings'>('submissions');
  
  // Submissions State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormType, setSelectedFormType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  
  // Bulk Selection
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  
  // Subscribers State
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  
  // Deletion modal confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Load subscribers when activeProfile or submissions change
  useEffect(() => {
    const list = formSubmissionService.getSubscribers(activeProfile.id);
    setSubscribers(list);
  }, [activeProfile.id, submissions]);

  // Filter submissions scoped strictly to active profile
  const profileSubmissions = submissions.filter(s => s.profileId === activeProfile.id);

  const filteredSubmissions = profileSubmissions.filter(s => {
    const matchesSearch = 
      (s.formTitle + ' ' + (s.responderEmail || '') + ' ' + (s.responderName || '') + ' ' + JSON.stringify(s.data))
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    
    const matchesType = selectedFormType === 'all' || s.formType === selectedFormType;
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredSubscribers = subscribers.filter(sub => {
    const q = subscriberSearch.toLowerCase();
    return sub.email.toLowerCase().includes(q) || (sub.name && sub.name.toLowerCase().includes(q));
  });

  // Handle Export Submissions CSV (FORM-005)
  const handleExportSubmissionsCSV = () => {
    if (profileSubmissions.length === 0) return;
    
    const { csvContent, rowCount, truncated } = formSubmissionService.exportSubmissionsCsv(
      activeProfile.id,
      user?.email || 'operator@lynkflow.internal',
      {
        formType: selectedFormType !== 'all' ? selectedFormType : undefined,
        searchQuery: searchTerm || undefined
      }
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form_submissions_${activeProfile.username}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    appendAuditLog('form_submissions_exported', `@${activeProfile.username}`, `Exported ${rowCount} submissions${truncated ? ' (bounded to 5,000 rows)' : ''}`);

    if (showToast) {
      showToast(`Exported ${rowCount} submissions with audit verification${truncated ? ' (bounded to 5,000)' : ''}`);
    }
  };

  // Handle Export Subscribers CSV (FORM-004, FORM-005)
  const handleExportSubscribersCSV = () => {
    if (subscribers.length === 0) return;

    const { csvContent, rowCount } = formSubmissionService.exportSubscribersCsv(
      activeProfile.id,
      user?.email || 'operator@lynkflow.internal'
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers_audience_${activeProfile.username}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    appendAuditLog('subscribers_exported', `@${activeProfile.username}`, `Exported ${rowCount} subscribers`);

    if (showToast) {
      showToast(`Audience list exported (${rowCount} subscribers)`);
    }
  };

  // Handle single delete with audit
  const confirmDeleteSubmission = (id: string) => {
    void deleteSubmission(id).then(success => {
      if (!success) return;
      setSelectedSubmissionIds(prev => prev.filter(item => item !== id));
      setDeleteConfirmId(null);
      if (selectedSubmission?.id === id) setSelectedSubmission(null);
    });
  };

  // Handle bulk delete with audit
  const handleBulkDelete = () => {
    if (selectedSubmissionIds.length === 0) return;
    
    void Promise.all(selectedSubmissionIds.map(id => deleteSubmission(id))).then(results => {
      const deletedIds = selectedSubmissionIds.filter((_, index) => results[index]);
      setSelectedSubmissionIds(prev => prev.filter(id => !deletedIds.includes(id)));
      setIsBulkDeleting(false);
      if (showToast && deletedIds.length) showToast(`Successfully deleted ${deletedIds.length} submissions.`);
    });
  };

  // Toggle selection for bulk actions
  const toggleSelectAll = () => {
    if (selectedSubmissionIds.length === filteredSubmissions.length) {
      setSelectedSubmissionIds([]);
    } else {
      setSelectedSubmissionIds(filteredSubmissions.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedSubmissionIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle unsubscribe subscriber
  const handleUnsubscribe = (email: string) => {
    void unsubscribeSubscriber(email).then(ok => {
      if (ok) {
      setSubscribers(formSubmissionService.getSubscribers(activeProfile.id));
      }
    });
  };

  return (
    <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-success" />
            <span>Audience Capture & Responses</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Collect leads, newsletter subscribers, and confidential responses for @{activeProfile.username}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto p-1 bg-surface border border-line rounded-xl">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-surface-2 text-ink shadow-xs'
                : 'text-muted hover:text-ink-strong'
            }`}
          >
            <MailCheck className="w-3.5 h-3.5 text-success" />
            <span>Submissions Inbox ({profileSubmissions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-surface-2 text-ink shadow-xs'
                : 'text-muted hover:text-ink-strong'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>Subscriber Audience ({subscribers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-surface-2 text-ink shadow-xs'
                : 'text-muted hover:text-ink-strong'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-accent" />
            <span>Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('automations')}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'automations'
                ? 'bg-surface-2 text-ink shadow-xs'
                : 'text-muted hover:text-ink-strong'
            }`}
          >
            <BotIcon className="w-3.5 h-3.5 text-accent" />
            <span>Automations</span>
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-surface-2 text-ink shadow-xs'
                : 'text-muted hover:text-ink-strong'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-accent" />
            <span>Bookings</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SUBMISSIONS INBOX */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters, Bulk Actions, Export */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search respondent, email, or data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-line text-ink placeholder-subtle focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Form Type Filter */}
              <select
                value={selectedFormType}
                onChange={(e) => setSelectedFormType(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-surface border border-line text-body focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Form Types</option>
                <option value="newsletter">Newsletter</option>
                <option value="contact">Contact Inquiry</option>
                <option value="lead">Lead Magnet</option>
                <option value="feedback">Feedback</option>
                <option value="custom">Custom</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-surface border border-line text-body focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="flagged_spam">Flagged Spam</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center gap-2">
              {selectedSubmissionIds.length > 0 && (
                <button
                  onClick={() => setIsBulkDeleting(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-danger border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedSubmissionIds.length})</span>
                </button>
              )}

              <button
                onClick={handleExportSubmissionsCSV}
                disabled={profileSubmissions.length === 0}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  profileSubmissions.length > 0
                    ? 'bg-surface hover:bg-surface-2 text-ink-strong border border-line'
                    : 'bg-surface text-subtle border border-line cursor-not-allowed'
                }`}
                title="Export CSV with immutable audit logging"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Submissions</span>
              </button>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="rounded-2xl bg-surface border border-line overflow-hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="max-w-xs mx-auto mb-3">
                  <ProductIllustration variant="inbox" />
                </div>
                <MailCheck className="w-8 h-8 text-subtle mx-auto mb-2" />
                <h4 className="text-xs font-bold text-body">No submissions found</h4>
                <p className="text-[11px] text-subtle mt-1 max-w-sm mx-auto">
                  {searchTerm || selectedFormType !== 'all'
                    ? 'No submissions match your search and filter criteria.'
                    : 'Responses submitted through your live lead forms, newsletters, and contact blocks will appear here securely.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas/60 border-b border-line text-muted font-medium">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedSubmissionIds.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-line-strong text-accent focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Contact / Primary Info</th>
                      <th className="py-3 px-4">Form</th>
                      <th className="py-3 px-4">Date Received</th>
                      <th className="py-3 px-4">Consent & Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredSubmissions.map(sub => {
                      const isSelected = selectedSubmissionIds.includes(sub.id);
                      const primaryDisplay = sub.responderEmail || sub.responderName || Object.values(sub.data)[0] || 'Anonymous';
                      const secondaryDisplay = sub.responderName && sub.responderEmail ? sub.responderName : null;

                      return (
                        <tr 
                          key={sub.id} 
                          className={`hover:bg-surface-2/30 transition-colors ${isSelected ? 'bg-accent-surface' : ''}`}
                        >
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(sub.id)}
                              className="rounded border-line-strong text-accent focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink truncate max-w-[200px]">
                              {primaryDisplay}
                            </div>
                            {secondaryDisplay && (
                              <div className="text-[11px] text-muted truncate">
                                {secondaryDisplay}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-ink-strong font-medium truncate max-w-[160px]">
                              {sub.formTitle}
                            </div>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-2 text-muted mt-0.5 inline-block">
                              {sub.formType || 'form'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted font-mono text-[11px]">
                            <div>{new Date(sub.timestamp).toLocaleDateString()}</div>
                            <div className="text-[10px] text-subtle">
                              {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {sub.consentGiven ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-success border border-emerald-500/20 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Consent Logged</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-muted">
                                  No Explicit Consent
                                </span>
                              )}
                              {sub.subscriberCreated && (
                                <span className="text-[9px] font-mono text-accent">
                                  + Synced to Audience
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSubmission(sub)}
                                aria-label="Inspect submission data"
                                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
                                title="Inspect Submission Data"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(sub.id)}
                                aria-label="Delete submission response"
                                className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                                title="Delete response (GDPR audited)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SUBSCRIBERS AUDIENCE LIST (FORM-004) */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audience by email or name..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-line text-ink placeholder-subtle focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleExportSubscribersCSV}
              disabled={subscribers.length === 0}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                subscribers.length > 0
                  ? 'bg-surface hover:bg-surface-2 text-ink-strong border border-line'
                  : 'bg-surface text-subtle border border-line cursor-not-allowed'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Subscriber Audience</span>
            </button>
          </div>

          <div className="rounded-2xl bg-surface border border-line overflow-hidden">
            {filteredSubscribers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-8 h-8 text-subtle mx-auto mb-2" />
                <h4 className="text-xs font-bold text-body">No subscribers in audience yet</h4>
                <p className="text-[11px] text-subtle mt-1 max-w-sm mx-auto">
                  When visitors submit newsletter forms or email fields in subscriber mode, they are automatically organized and deduplicated here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas/60 border-b border-line text-muted font-medium">
                    <tr>
                      <th className="py-3 px-4">Subscriber Email</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Subscribed Date</th>
                      <th className="py-3 px-4">Source Form</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredSubscribers.map(sub => (
                      <tr key={sub.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-ink">
                          {sub.email}
                        </td>
                        <td className="py-3 px-4 text-body">
                          {sub.name || '—'}
                        </td>
                        <td className="py-3 px-4">
                          {sub.status === 'active' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-success border border-emerald-500/20 flex items-center gap-1 w-max">
                              <UserCheck className="w-3 h-3" />
                              <span>Active Subscriber</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-danger border border-rose-500/20 flex items-center gap-1 w-max">
                              <UserX className="w-3 h-3" />
                              <span>Unsubscribed</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted font-mono text-[11px]">
                          {new Date(sub.subscribedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-muted truncate max-w-[150px]">
                          {sub.sourceFormTitle}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sub.status === 'active' && (
                            <button
                              onClick={() => handleUnsubscribe(sub.email)}
                              className="px-2 py-1 text-[11px] font-medium text-muted hover:text-danger hover:bg-surface-2 rounded-lg transition-colors cursor-pointer"
                              title="Unsubscribe subscriber from future campaigns"
                            >
                              Unsubscribe
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && <CampaignsPanel />}
      {activeTab === 'automations' && <AutomationsPanel />}
      {activeTab === 'bookings' && <BookingsPanel />}

      {/* MODAL 1: Submission Detail Drawer / Dialog */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="submission-detail-title">
          <div 
            className="w-full max-w-lg bg-surface border border-line rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <span className="text-[10px] uppercase font-mono text-subtle tracking-wider">
                  Submission Payload • Confidential
                </span>
                <h3 id="submission-detail-title" className="text-sm font-bold text-ink tracking-tight">{selectedSubmission.formTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                aria-label="Close submission details dialog"
                className="p-1 text-muted hover:text-ink rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Metadata Banner */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-canvas border border-line text-muted font-mono">
                <div>
                  <span className="text-subtle block text-[9px] uppercase">Received At</span>
                  <span className="text-ink">{new Date(selectedSubmission.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-subtle block text-[9px] uppercase">Form Type</span>
                  <span className="text-ink">{selectedSubmission.formType || 'custom'}</span>
                </div>
                <div>
                  <span className="text-subtle block text-[9px] uppercase">Consent Status</span>
                  <span className={selectedSubmission.consentGiven ? 'text-success' : 'text-muted'}>
                    {selectedSubmission.consentGiven ? 'Explicit Opt-In' : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-subtle block text-[9px] uppercase">Security Classification</span>
                  <span className="text-ink">Tenant-Scoped Protected</span>
                </div>
              </div>

              {/* Data Key-Values */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-body block">Captured Responses</span>
                <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line max-h-60 overflow-y-auto">
                  {Object.entries(selectedSubmission.data).map(([key, val]) => (
                    <div key={key} className="border-b border-line/60 pb-1.5 last:border-0 last:pb-0">
                      <span className="block text-[10px] uppercase font-mono text-subtle">{key}</span>
                      <span className="text-xs text-ink break-words select-text">{val || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Disclaimer text if present */}
              {selectedSubmission.consentText && (
                <div className="p-2.5 rounded-lg bg-canvas/60 border border-line text-[10px] text-muted">
                  <span className="font-semibold text-body">Accepted Terms: </span>
                  {selectedSubmission.consentText}
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => {
                    setDeleteConfirmId(selectedSubmission.id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-danger hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Response</span>
                </button>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-inverse-text bg-inverse rounded-lg hover:bg-inverse-hover transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Single Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="delete-submission-title">
          <div 
            className="w-full max-w-sm bg-surface border border-line rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-danger shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
              <h4 id="delete-submission-title" className="text-sm font-bold text-ink">Permanently Delete Submission?</h4>
                <p className="text-xs text-muted mt-1">
                  This action conforms with GDPR retention policies. The response will be permanently erased and audited.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted hover:text-ink rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteSubmission(deleteConfirmId)}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bulk Delete Confirmation Dialog */}
      {isBulkDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="delete-subscriber-title">
          <div 
            className="w-full max-w-sm bg-surface border border-line rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-danger shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
              <h4 id="delete-subscriber-title" className="text-sm font-bold text-ink">
                  Delete {selectedSubmissionIds.length} Submissions?
                </h4>
                <p className="text-xs text-muted mt-1">
                  All selected responses will be irreversibly removed according to compliance policies and logged in the workspace audit record.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setIsBulkDeleting(false)}
                className="px-3 py-1.5 text-xs font-medium text-muted hover:text-ink rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Confirm Bulk Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
