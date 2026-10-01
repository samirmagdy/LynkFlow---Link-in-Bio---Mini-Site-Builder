import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProfileHeaderEditor } from './ProfileHeaderEditor';
import { BlockList } from './BlockList';
import { AddBlockModal } from './AddBlockModal';
import { BlockEditModal } from './BlockEditModal';
import { PhoneMockup } from '../preview/PhoneMockup';
import { Block, BlockType } from '../../types';
import { 
  Plus, 
  RotateCcw, 
  Check, 
  ChevronDown, 
  BarChart2,
  Smartphone,
  AlertCircle,
  RefreshCw,
  Loader2,
  Palette,
  Send,
  Save,
  History,
  Link2,
  X
} from 'lucide-react';
import { PublishLifecycleModal } from '../modals/PublishLifecycleModal';

interface EditorViewProps {
  onOpenReportModal?: () => void;
  onOpenNewProfileModal: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ onOpenReportModal, onOpenNewProfileModal }) => {
  const { 
    activeProfile, 
    profiles, 
    switchActiveProfile, 
    hasUnpublishedChanges, 
    saveDraftNow,
    revertDraftToPublished,
    addBlock, 
    updateBlock, 
    removeBlock, 
    reorderBlocks, 
    duplicateBlock,
    addTab,
    setCurrentView,
    saveStatus,
    saveErrorMessage,
    retrySave,
    setPreviewSource
  } = useApp();

  const [activeTabId, setActiveTabId] = useState<string>(activeProfile.tabs[0]?.id || '');
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishModalTab, setPublishModalTab] = useState<'publish' | 'schedule' | 'preview_token' | 'history' | 'validate'>('publish');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  // Sync activeTabId if profile changes
  const currentTab = activeProfile.tabs.find(t => t.id === activeTabId) || activeProfile.tabs[0];

  const handleSelectBlockType = (type: BlockType) => {
    setPreviewSource('draft');
    addBlock(currentTab?.id || activeProfile.tabs[0]?.id, type);
  };

  const activateDraftPreview = () => setPreviewSource('draft');

  const handleToggleHide = (block: Block) => {
    activateDraftPreview();
    updateBlock(currentTab.id, block.id, { isHidden: !block.isHidden });
  };

  const handleTogglePin = (block: Block) => {
    activateDraftPreview();
    updateBlock(currentTab.id, block.id, { pinned: !block.pinned });
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      activateDraftPreview();
      reorderBlocks(currentTab.id, index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < currentTab.blocks.length - 1) {
      activateDraftPreview();
      reorderBlocks(currentTab.id, index, index + 1);
    }
  };

  const handleCreateTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTabTitle.trim()) {
      addTab(newTabTitle.trim());
      setNewTabTitle('');
      setIsAddingTab(false);
    }
  };

  return (
    <div className="studio-editor flex-1 flex flex-col h-full overflow-hidden">
      {/* Workspace Subheader / Actions Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-line bg-surface/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-canvas border border-line hover:border-line-strong transition-colors text-xs font-semibold text-ink cursor-pointer"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span>@{activeProfile.username}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted ml-1" />
          </button>

          {isProfileDropdownOpen && (
            <div 
              className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-surface border border-line shadow-2xl p-1.5 z-40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] uppercase font-mono text-subtle px-2.5 py-1">
                Workspace Profiles ({profiles.length})
              </div>
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    switchActiveProfile(p.id);
                    setIsProfileDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    p.id === activeProfile.id ? 'bg-surface-2 text-ink font-medium' : 'text-body hover:bg-surface-2/60'
                  }`}
                >
                  <span className="truncate">@{p.username}</span>
                  {p.id === activeProfile.id && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
              ))}

              <div className="border-t border-line my-1"></div>

              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  onOpenNewProfileModal();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-accent hover:bg-surface-2/60 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Save & Publish Status Indicators (EDT-001, EDT-004) */}
        <div className="flex items-center gap-2">
          {/* Autosave Indicator */}
          {saveStatus === 'saving' && (
            <div role="status" aria-live="polite" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 text-body text-[11px] font-medium border border-line-strong">
              <Loader2 className="w-3 h-3 animate-spin text-accent" />
              <span>Saving draft...</span>
            </div>
          )}

          {saveStatus === 'saved' && (
            <div role="status" aria-live="polite" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-success text-[11px] font-medium">
              <Check className="w-3 h-3" />
              <span>All changes saved</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div role="alert" aria-live="assertive" className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-danger text-[11px] font-medium">
              <AlertCircle className="w-3 h-3 text-danger shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-xs">{saveErrorMessage || 'Save failed'}</span>
              <button
                onClick={retrySave}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-danger text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Publication Status */}
          {hasUnpublishedChanges ? (
            <div role="status" aria-label="Draft has unpublished changes" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-warning text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Draft (Unpublished)</span>
            </div>
          ) : (
            <div role="status" aria-label={`Published version ${activeProfile.publishedVersion}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-accent-soft text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>Live v{activeProfile.publishedVersion}</span>
            </div>
          )}
        </div>

        {/* Right: Publish, Theme, Mobile Preview & Revert Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Preview Button (EDT-005: collapses cleanly at small widths) */}
          <button
            onClick={() => setIsMobilePreviewOpen(true)}
            className="lg:hidden px-2.5 py-1.5 rounded-lg text-xs font-medium text-body hover:text-ink bg-surface border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Open Live Preview Sheet"
          >
            <Smartphone className="w-3.5 h-3.5 text-accent" />
            <span>Preview</span>
          </button>

          {/* Theme Studio Navigation Shortcut (EDT-002: Distinct theme panel) */}
          <button
            onClick={() => setCurrentView('themes')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-2 border border-line transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
            title="Open Theme Studio (EDT-002)"
          >
            <Palette className="w-3.5 h-3.5 text-danger" />
            <span>Themes</span>
          </button>

          <button
            onClick={() => setCurrentView('analytics')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-2 border border-line transition-colors hidden md:flex items-center gap-1.5 cursor-pointer"
            title="View Profile Analytics (Recharts)"
          >
            <BarChart2 className="w-3.5 h-3.5 text-accent" />
            <span>Analytics</span>
          </button>

          {/* Manual Save Draft Action */}
          <button
            onClick={() => saveDraftNow()}
            disabled={saveStatus === 'saving'}
            title="Force immediate draft persistence with version ETag"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-2 border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-muted" />
            <span className="hidden xl:inline">Save Draft</span>
          </button>

          {/* Share Preview Token Link shortcut */}
          <button
            onClick={() => {
              setPublishModalTab('preview_token');
              setIsPublishModalOpen(true);
            }}
            title="Generate expiring preview link for collaborators"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent-soft hover:text-accent bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5 text-accent-soft" />
            <span className="hidden md:inline">Share Preview</span>
          </button>

          {/* Version History & Rollback shortcut */}
          <button
            onClick={() => {
              setPublishModalTab('history');
              setIsPublishModalOpen(true);
            }}
            title="View snapshot history and rollback"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-2 border border-line transition-colors hidden lg:flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-info" />
            <span className="hidden xl:inline">History</span>
          </button>

          {hasUnpublishedChanges && (
            <button
              onClick={revertDraftToPublished}
              title="Discard draft changes and revert to live version"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-body hover:text-ink bg-surface-2 hover:bg-surface-3 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Revert</span>
            </button>
          )}

          <button
            onClick={() => {
              setPublishModalTab('publish');
              setIsPublishModalOpen(true);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              hasUnpublishedChanges
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'bg-surface-2 hover:bg-surface-3 text-ink-strong border border-line-strong'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Live</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Builder & Block Editor */}
        <div className="w-full lg:w-[58%] xl:w-[60%] h-full overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Profile Identity Editor */}
          <ProfileHeaderEditor />

          {/* Tabs Navigation & Blocks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {activeProfile.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      tab.id === currentTab?.id
                        ? 'bg-surface-2 text-ink'
                        : 'text-muted hover:text-ink-strong hover:bg-surface'
                    }`}
                  >
                    <span>{tab.title}</span>
                    <span className="ml-1.5 text-[10px] text-subtle font-mono">({tab.blocks.length})</span>
                  </button>
                ))}

                {isAddingTab ? (
                  <form onSubmit={handleCreateTab} className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Tab title..."
                      value={newTabTitle}
                      onChange={(e) => setNewTabTitle(e.target.value)}
                      className="px-2 py-1 text-xs rounded bg-canvas border border-line-strong text-ink focus:outline-none w-28"
                    />
                    <button type="submit" className="text-xs text-accent px-1 cursor-pointer">
                      Add
                    </button>
                    <button type="button" onClick={() => setIsAddingTab(false)} className="text-xs text-subtle px-1 cursor-pointer">
                      ✕
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingTab(true)}
                    className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 text-xs transition-colors cursor-pointer flex items-center gap-1"
                    title="Add new tab"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add Tab</span>
                  </button>
                )}
              </div>

              {/* Add Block CTA */}
              <button
                onClick={() => setIsAddBlockOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-inverse hover:bg-inverse-hover text-inverse-text transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block</span>
              </button>
            </div>

            {/* Block List */}
            {currentTab && (
              <BlockList
                blocks={currentTab.blocks}
                onEditBlock={(block) => setEditingBlock(block)}
                onDuplicateBlock={(id) => { activateDraftPreview(); duplicateBlock(currentTab.id, id); }}
                onRemoveBlock={(id) => { activateDraftPreview(); removeBlock(currentTab.id, id); }}
                onToggleHide={handleToggleHide}
                onTogglePin={handleTogglePin}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onReorder={(from, to) => { activateDraftPreview(); reorderBlocks(currentTab.id, from, to); }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Interactive Live Device Frame */}
        <div className="hidden lg:flex lg:w-[42%] xl:w-[40%] h-full border-l border-line bg-canvas/40 p-4 xl:p-6 items-center justify-center overflow-hidden">
          <PhoneMockup onOpenReportModal={onOpenReportModal} />
        </div>
      </div>

      {/* Modals */}
      <AddBlockModal
        isOpen={isAddBlockOpen}
        onClose={() => setIsAddBlockOpen(false)}
        onSelectType={handleSelectBlockType}
      />

      <BlockEditModal
        block={editingBlock}
        isOpen={!!editingBlock}
        onClose={() => setEditingBlock(null)}
          onSave={(updates) => {
            if (editingBlock && currentTab) {
              activateDraftPreview();
              updateBlock(currentTab.id, editingBlock.id, updates);
          }
        }}
      />

      {/* Mobile Responsive Preview Sheet (EDT-005) */}
      {isMobilePreviewOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-black/85 backdrop-blur-md animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="mobile-preview-title">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-canvas">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" />
              <span id="mobile-preview-title" className="text-xs font-bold text-ink">Live Phone Preview</span>
              <span className="text-[10px] font-mono text-muted">@{activeProfile.username}</span>
            </div>
            <button
              onClick={() => setIsMobilePreviewOpen(false)}
              aria-label="Close live phone preview"
              className="touch-target p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
            <PhoneMockup onOpenReportModal={onOpenReportModal} />
          </div>
        </div>
      )}

      {/* Publish, Schedule, Preview Token & Rollback Lifecycle Modal */}
      <PublishLifecycleModal
        isOpen={isPublishModalOpen}
        initialTab={publishModalTab}
        onClose={() => setIsPublishModalOpen(false)}
      />
    </div>
  );
};
