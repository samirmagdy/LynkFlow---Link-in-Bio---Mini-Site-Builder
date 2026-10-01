import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Profile, LinkBlockPayload, ProductBlockPayload } from '../../types';
import { PublicProfileView } from './PublicProfileView';
import { Smartphone, Tablet, Monitor, ExternalLink, Wifi, Battery, Link2 } from 'lucide-react';
import { PublishLifecycleModal } from '../modals/PublishLifecycleModal';
import { normalizeTheme } from '../../utils/themeEngine';

interface PhoneMockupProps {
  onOpenReportModal?: () => void;
  profileOverride?: Profile;
  previewSourceOverride?: 'draft' | 'published';
  previewDeviceOverride?: 'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'wide';
  previewLocaleOverride?: 'theme' | 'en' | 'ar';
  hideControls?: boolean;
  onBackgroundChange?: (patch: { focalPoint?: { x: number; y: number }; scale?: number }) => void;
}

interface BackgroundEditorOverlayProps {
  scale: number;
  focalPoint: { x: number; y: number };
  onChange: NonNullable<PhoneMockupProps['onBackgroundChange']>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const BackgroundEditorOverlay: React.FC<BackgroundEditorOverlayProps> = ({ scale, focalPoint, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, x: focalPoint.x, y: focalPoint.y };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - dragRef.current.startX) / Math.max(bounds.width, 1)) * 100;
    const deltaY = ((event.clientY - dragRef.current.startY) / Math.max(bounds.height, 1)) * 100;
    onChange({ focalPoint: { x: clamp(dragRef.current.x - deltaX, 0, 100), y: clamp(dragRef.current.y - deltaY, 0, 100) } });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label="Select background to move or resize it"
        className="absolute right-3 top-3 z-40 rounded-full border border-white/35 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/80"
      >
        Edit background
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-40">
      <div
        role="application"
        aria-label="Background editor. Drag to reposition the background."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={`absolute inset-0 cursor-grab touch-none border-2 border-dashed border-white/80 bg-black/5 ${isDragging ? 'cursor-grabbing' : ''}`}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
        <span className="rounded-full border border-white/30 bg-black/75 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md">
          Drag to move background
        </span>
      </div>
      <div
        data-background-control
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/80 p-2 text-white shadow-xl backdrop-blur-md"
      >
        <button type="button" onClick={() => onChange({ scale: clamp(Number((scale - 0.05).toFixed(2)), 1, 2) })} disabled={scale <= 1} aria-label="Zoom background out" className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-lg font-semibold hover:bg-white/20 disabled:opacity-40">−</button>
        <label className="min-w-0 flex-1 text-center text-[11px] font-semibold">
          Zoom {Math.round(scale * 100)}%
          <input aria-label="Background zoom" type="range" min="100" max="200" value={Math.round(scale * 100)} onChange={(event) => onChange({ scale: Number(event.target.value) / 100 })} className="mt-1 block w-full accent-white" />
        </label>
        <button type="button" onClick={() => onChange({ scale: clamp(Number((scale + 0.05).toFixed(2)), 1, 2) })} disabled={scale >= 2} aria-label="Zoom background in" className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-lg font-semibold hover:bg-white/20 disabled:opacity-40">+</button>
        <button type="button" onClick={() => setIsEditing(false)} className="shrink-0 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-black hover:bg-white/90">Done</button>
      </div>
    </div>
  );
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ onOpenReportModal, profileOverride, previewSourceOverride, previewDeviceOverride, previewLocaleOverride, hideControls = false, onBackgroundChange }) => {
  const { 
    activeProfile, 
    publishedProfile, 
    previewDevice, 
    setPreviewDevice, 
    previewSource, 
    setPreviewSource,
    hasUnpublishedChanges,
    setCurrentView,
    setPublicViewingUsername,
    setPublicDemo
  } = useApp();

  const [currentTime] = useState('9:41');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<'theme' | 'en' | 'ar'>('theme');

  const activeSource = previewSourceOverride || previewSource;
  const effectiveDevice = previewDeviceOverride || previewDevice;
  const effectiveLocale = previewLocaleOverride || previewLocale;
  const isMobileViewport = effectiveDevice === 'mobile' || effectiveDevice === 'mobile-small';
  const isSmallMobile = effectiveDevice === 'mobile-small';
  const sourceProfile = activeSource === 'draft' ? profileOverride || activeProfile : publishedProfile;
  const profileToRender = (() => {
    if (effectiveLocale === 'theme') return sourceProfile;
    const localizedTheme = normalizeTheme({ ...(sourceProfile.standardTheme || sourceProfile.theme), language: effectiveLocale, direction: effectiveLocale === 'ar' ? 'rtl' : 'ltr' });
    if (effectiveLocale !== 'ar') return { ...sourceProfile, standardTheme: localizedTheme };

    // Arabic comparison mode intentionally exercises mixed-language and long
    // content when the real profile is English. It never persists changes; it
    // only makes RTL typography, wrapping and CTA labels observable in the
    // preview before publishing.
    const containsArabic = (value: unknown) => typeof value === 'string' && /[\u0600-\u06FF]/.test(value);
    const sourceName = sourceProfile.displayName || sourceProfile.username || 'Creator';
    const sourceBio = sourceProfile.bio || '';
    const arabicBio = containsArabic(sourceBio)
      ? sourceBio
      : `مصمم ومبدع مستقل يشارك أعماله وخدماته مع العملاء والعلامات التجارية — ${sourceBio}`;
    const localizedTabs = sourceProfile.tabs.map(tab => ({
      ...tab,
      title: containsArabic(tab.title) ? tab.title : `الأعمال والروابط · ${tab.title}`,
      blocks: tab.blocks.map(block => ({
        ...block,
        title: containsArabic(block.title) ? block.title : `رابط · ${block.title}`,
        payload: {
          ...block.payload,
          ...(typeof (block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).subtitle === 'string' && !containsArabic((block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).subtitle) ? { subtitle: `معلومات إضافية — ${(block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).subtitle}` } : {}),
          ...(typeof (block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).description === 'string' && !containsArabic((block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).description) ? { description: `وصف الخدمة والمعلومات المهمة — ${(block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).description}` } : {}),
          ...(block.type === 'link' && !containsArabic((block.payload as Partial<LinkBlockPayload & ProductBlockPayload>).buttonLabel) ? { buttonLabel: 'تواصل معي' } : {})
        }
      }))
    }));
    return {
      ...sourceProfile,
      displayName: containsArabic(sourceName) ? sourceName : `سمير مجدي — ${sourceName}`,
      bio: arabicBio,
      tabs: localizedTabs,
      standardTheme: localizedTheme
    };
  })();

  const renderedTheme = normalizeTheme(profileToRender.standardTheme || profileToRender.theme);
  const renderedBackground = renderedTheme.background;
  const canEditBackground = Boolean(
    onBackgroundChange &&
    (renderedBackground.type === 'image' || renderedBackground.type === 'video') &&
    renderedBackground.assetUrl
  );
  const backgroundEditor = canEditBackground ? (
    <BackgroundEditorOverlay
      scale={clamp(Number(renderedBackground.scale || 1), 1, 2)}
      focalPoint={{ x: renderedBackground.focalPoint?.x ?? 50, y: renderedBackground.focalPoint?.y ?? 50 }}
      onChange={onBackgroundChange!}
    />
  ) : null;

  const handleOpenLiveTab = () => {
    setPublicViewingUsername(activeProfile.username);
    setPublicDemo(false);
    window.history.replaceState({}, '', `/@${encodeURIComponent(activeProfile.username)}`);
    setCurrentView('public_standalone');
  };

  return (
    <div className="flex flex-col items-center h-full w-full">
      {/* Top Preview Controls Bar */}
      {!hideControls && <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-line bg-surface/80 backdrop-blur-md text-xs mb-4 rounded-xl shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
          {/* Draft vs Published Switcher */}
          <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-line">
            <button
              onClick={() => setPreviewSource('draft')}
              aria-pressed={previewSource === 'draft'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                previewSource === 'draft' 
                  ? 'bg-surface text-ink shadow-xs border border-line/60' 
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>Draft</span>
              {hasUnpublishedChanges && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
            </button>
            <button
              onClick={() => setPreviewSource('published')}
              aria-pressed={previewSource === 'published'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                previewSource === 'published' 
                  ? 'bg-surface text-ink shadow-xs border border-line/60' 
                  : 'text-muted hover:text-ink'
              }`}
            >
              Live v{activeProfile.publishedVersion || 1}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-0.5 rounded-lg border border-line bg-canvas p-0.5" aria-label="Preview language">
            {(['theme', 'en', 'ar'] as const).map(locale => (
              <button key={locale} type="button" onClick={() => setPreviewLocale(locale)} aria-pressed={previewLocale === locale} className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase cursor-pointer transition-colors ${previewLocale === locale ? 'bg-surface text-ink shadow-xs border border-line/60' : 'text-subtle hover:text-ink'}`}>
                {locale === 'theme' ? 'Theme' : locale}
              </button>
            ))}
          </div>

          {/* Device Switcher */}
          <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-line">
            <button
              onClick={() => setPreviewDevice('mobile-small')}
              aria-label="Preview small mobile viewport"
              aria-pressed={previewDevice === 'mobile-small'}
              title="Small Mobile Viewport (320px)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${previewDevice === 'mobile-small' ? 'bg-surface text-ink shadow-xs border border-line/60' : 'text-subtle hover:text-ink'}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              aria-label="Preview mobile viewport"
              aria-pressed={previewDevice === 'mobile'}
              title="Mobile Viewport"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                previewDevice === 'mobile' ? 'bg-surface text-ink shadow-xs border border-line/60' : 'text-subtle hover:text-ink'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice('tablet')}
              aria-label="Preview tablet viewport"
              aria-pressed={previewDevice === 'tablet'}
              title="Tablet Viewport"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${previewDevice === 'tablet' ? 'bg-surface text-ink shadow-xs border border-line/60' : 'text-subtle hover:text-ink'}`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice('desktop')}
              aria-label="Preview desktop viewport"
              aria-pressed={previewDevice === 'desktop'}
              title="Desktop Viewport"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                previewDevice === 'desktop' ? 'bg-surface text-ink shadow-xs border border-line/60' : 'text-subtle hover:text-ink'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice('wide')}
              aria-label="Preview wide desktop viewport"
              aria-pressed={previewDevice === 'wide'}
              title="Wide Desktop Viewport"
              className={`hidden lg:block p-1.5 rounded-md transition-colors cursor-pointer ${previewDevice === 'wide' ? 'bg-surface text-ink shadow-xs border border-line/60' : 'text-subtle hover:text-ink'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live URL Link & Share Preview */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-accent text-[11px] font-bold border border-indigo-500/20 transition-colors cursor-pointer shadow-xs"
            title="Generate Shareable Preview Link (PUBL-001)"
          >
            <Link2 className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Share Preview</span>
          </button>

          <button
            onClick={handleOpenLiveTab}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-2 text-ink text-[11px] font-bold border border-line transition-colors cursor-pointer shadow-xs"
            title="Open Public Page Standalone"
          >
            <span>Live View</span>
            <ExternalLink className="w-3 h-3 text-muted" />
          </button>
        </div>
      </div>}

      {/* Viewport Frame */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden pb-4">
        {isMobileViewport ? (
          // Mobile Phone Shell (iPhone 16 Pro Dimensions: ~380px x 760px)
          <div className={`relative w-full ${isSmallMobile ? 'max-w-[320px] rounded-[38px]' : 'max-w-[380px] rounded-[48px]'} h-[720px] max-h-[calc(100vh-180px)] border-[10px] border-line bg-canvas shadow-2xl shadow-black/80 flex flex-col overflow-hidden ring-1 ring-ink/10 shrink-0`}>
            {/* Dynamic Island Pill */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-between px-2.5 pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-surface border border-line"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse"></div>
            </div>

            {/* Mobile Status Bar */}
            <div className="w-full h-10 px-7 pt-2 flex items-center justify-between text-[11px] font-semibold text-body z-20 shrink-0 select-none">
              <span>{currentTime}</span>
              <div className="flex items-center gap-1.5 opacity-80">
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Scrollable Public View Inside Phone */}
            <div className="flex-1 w-full overflow-y-auto overflow-x-hidden relative">
              <PublicProfileView
                profile={profileToRender}
                isStandalone={false}
                onOpenReportModal={onOpenReportModal}
              />
              {backgroundEditor}
            </div>

            {/* Home Indicator Bar */}
            <div className="w-full h-5 flex items-center justify-center bg-transparent z-20 shrink-0 select-none pb-1">
              <div className="w-28 h-1 bg-ink/20 rounded-full"></div>
            </div>
          </div>
        ) : (
          // Desktop Viewport Container
          <div className={`h-full max-h-[calc(100vh-180px)] rounded-2xl border border-line bg-canvas overflow-hidden flex flex-col shadow-2xl ${effectiveDevice === 'tablet' ? 'w-full max-w-[720px]' : effectiveDevice === 'wide' ? 'w-full max-w-[1280px]' : 'w-full'}`}>
            <div className="h-9 px-4 border-b border-line bg-surface/90 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/40"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/40"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/40"></div>
              </div>
              <div className="flex-1 max-w-sm mx-auto text-center px-3 py-0.5 rounded-md bg-canvas text-[11px] font-mono text-muted truncate">
                https://lynkflow.me/{activeProfile.username}
              </div>
            </div>
            <div className="relative flex-1 w-full overflow-y-auto">
              <PublicProfileView 
                profile={profileToRender} 
                isStandalone={false}
                onOpenReportModal={onOpenReportModal}
              />
              {backgroundEditor}
            </div>
          </div>
        )}
      </div>

      {/* Share Preview Modal */}
      <PublishLifecycleModal
        isOpen={isPreviewModalOpen}
        initialTab="preview_token"
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
};
