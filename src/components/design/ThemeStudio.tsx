import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SPEC_THEME_PRESETS } from '../../data/themePresets';
import { PublishedThemeSnapshot, StandardTheme } from '../../types/themeSchema';
import { Block, BlockType, BrandKit, Profile } from '../../types';
import { PERSONA_TEMPLATES, PersonaTemplate, composeStarterSiteTheme } from '../../data/personaTemplates';
import { PhoneMockup } from '../preview/PhoneMockup';
import { PublicProfileView } from '../preview/PublicProfileView';
import { validateThemeAccessibility, validateProfileAccessibility, calculateContrastRatio, normalizeTheme, validateThemeSchema, calculateThemeQualityScore, migrateTheme } from '../../utils/themeEngine';
import { 
  Palette, 
  Check, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  BookmarkPlus, 
  ShieldAlert, 
  ShieldCheck, 
  History, 
  MoreHorizontal,
  Download,
  Upload,
  Search,
  Loader2
} from 'lucide-react';
import { uploadBackgroundAsset, removeBackgroundAsset, listBackgroundAssets, registerRemoteBackgroundAsset, BackgroundAsset } from '../../services/backgroundAssetService';
import { extractImageAccentGradient } from '../../utils/imageAccent';
import { COLOR_TOKEN_LABELS, colorToFormat, mixHex, normalizeHex, parseColorInput } from '../../utils/themeColorUtils';
import type { ColorFormat } from '../../utils/themeColorUtils';
import { PublishLifecycleModal } from '../modals/PublishLifecycleModal';
import { Dialog } from '../common/Dialog';

interface ThemeStudioProps {
  onOpenReportModal?: () => void;
}

type StudioTab = 'starterSites' | 'presets' | 'colors' | 'typography' | 'brand' | 'background' | 'layout' | 'blocks' | 'accessibility' | 'snapshots';
type StudioStage = 'foundation' | 'styling' | 'layout' | 'review';

type PexelsMedia = {
  id: number;
  kind: 'image' | 'video';
  assetUrl: string;
  thumbnail: string | null;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  width?: number | null;
  height?: number | null;
};

type ThemeConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

const ColorTokenEditor: React.FC<{
  token: keyof StandardTheme['tokens']['colors'];
  label: string;
  value: string;
  defaultValue: string;
  contrastAgainst: string;
  onChange: (value: string) => void;
}> = ({ token, label, value, defaultValue, contrastAgainst, onChange }) => {
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [draft, setDraft] = useState(() => colorToFormat(value, 'hex'));
  useEffect(() => setDraft(colorToFormat(value, format)), [value, format]);
  const commit = (next: string) => {
    setDraft(next);
    const parsed = parseColorInput(next, format);
    if (parsed) onChange(parsed);
  };
  const ratio = calculateContrastRatio(value, contrastAgainst);
  const isAccessible = ratio >= 4.5;
  const isAAA = ratio >= 7;
  const accessibleAlternative = calculateContrastRatio('#FFFFFF', contrastAgainst) >= calculateContrastRatio('#000000', contrastAgainst) ? '#FFFFFF' : '#000000';

  return (
    <div className="rounded-xl border border-line bg-canvas/70 p-3.5 space-y-2.5 transition-all hover:border-line-strong hover:bg-canvas/90" data-color-token={token}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-black/10 dark:border-white/10 shadow-xs shrink-0" style={{ backgroundColor: value }} />
          <span>{label}</span>
        </label>
        <span 
          title={`Contrast ratio against surface: ${ratio}:1`}
          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
            isAAA 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : isAccessible 
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          <span>{ratio}:1</span>
          <span>{isAAA ? 'AAA' : isAccessible ? 'AA' : 'Notice'}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative group shrink-0">
          <input 
            aria-label={`${label} color picker`} 
            type="color" 
            value={normalizeHex(value) || '#000000'} 
            onChange={(event) => commit(event.target.value)} 
            className="h-9 w-9 rounded-lg border border-line-strong bg-transparent cursor-pointer p-0.5" 
          />
        </div>
        <input 
          aria-label={`${label} ${format} value`} 
          value={draft} 
          onChange={(event) => commit(event.target.value)} 
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-accent" 
        />
        <select 
          aria-label={`${label} color format`} 
          value={format} 
          onChange={(event) => setFormat(event.target.value as ColorFormat)} 
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[10px] font-semibold text-ink cursor-pointer focus:outline-none"
        >
          <option value="hex">HEX</option>
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
        </select>
      </div>
      <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-muted border-t border-line/60">
        <div className="flex items-center gap-1.5">
          <span className="text-subtle">Default</span>
          <button 
            type="button" 
            onClick={() => onChange(defaultValue)}
            title="Restore default color token"
            className="h-4 w-4 rounded-full border border-line cursor-pointer hover:scale-110 transition-transform" 
            style={{ backgroundColor: defaultValue }} 
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-subtle">Safe suggestion</span>
          <button 
            type="button" 
            onClick={() => onChange(accessibleAlternative)}
            title={`Apply safe high-contrast alternative: ${accessibleAlternative}`}
            className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border border-line bg-surface text-ink hover:border-accent hover:text-accent cursor-pointer transition-colors"
          >
            {accessibleAlternative}
          </button>
        </div>
      </div>
    </div>
  );
};

const ThemePreviewCard: React.FC<{ theme: StandardTheme; label?: string; profile: Profile }> = ({ theme, label = 'Theme preview', profile }) => {
  const preview = normalizeTheme(theme);
  const previewProfile: Profile = { ...profile, standardTheme: preview };
  return (
    <div
      className="relative aspect-[1.42] min-h-[220px] w-full overflow-hidden rounded-xl border border-line bg-canvas shadow-inner sm:min-h-0"
      aria-label={`${label}: ${preview.name} using ${profile.displayName || profile.username}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 w-[312%] origin-top-left scale-[0.32]">
        <PublicProfileView profile={previewProfile} />
      </div>
    </div>
  );
};

const STUDIO_STAGES: Array<{ id: StudioStage; label: string; description: string; tabs: StudioTab[] }> = [
  { id: 'foundation', label: 'Foundation', description: 'Choose starter content, visual style, and canvas.', tabs: ['starterSites', 'presets', 'background'] },
  { id: 'styling', label: 'Styling', description: 'Tune color contrast, type, and brand identity.', tabs: ['colors', 'typography', 'brand'] },
  { id: 'layout', label: 'Layout', description: 'Shape the page and its content blocks.', tabs: ['layout', 'blocks'] },
  { id: 'review', label: 'Review', description: 'Check accessibility and restore versions.', tabs: ['accessibility', 'snapshots'] }
];

const STUDIO_TAB_LABELS: Record<StudioTab, string> = {
  starterSites: 'Starter Sites',
  presets: 'Presets',
  background: 'Background',
  colors: 'Colors',
  typography: 'Typography',
  brand: 'Brand Kit',
  layout: 'Shape & spacing',
  blocks: 'Block defaults',
  accessibility: 'Accessibility audit',
  snapshots: 'History'
};

const QUICK_CUSTOMIZE_TABS: StudioTab[] = ['starterSites', 'presets', 'background', 'colors', 'typography'];

const LAYOUT_TEMPLATES: Array<{
  id: NonNullable<StandardTheme['layout']>['templateId'];
  name: string;
  goal: string;
  alignment: 'left' | 'center';
  headerStyle: 'standard' | 'hero' | 'compact';
  blockWidth: 'full' | 'narrow' | 'mixed';
  navigationStyle: 'none' | 'tabs' | 'pills';
}> = [
  { id: 'centered-creator', name: 'Centered Creator', goal: 'Profile-first storytelling', alignment: 'center', headerStyle: 'hero', blockWidth: 'narrow', navigationStyle: 'pills' },
  { id: 'left-professional', name: 'Left-Aligned Professional', goal: 'Trust and clarity', alignment: 'left', headerStyle: 'standard', blockWidth: 'full', navigationStyle: 'tabs' },
  { id: 'editorial-portfolio', name: 'Editorial Portfolio', goal: 'Work and case studies', alignment: 'left', headerStyle: 'hero', blockWidth: 'mixed', navigationStyle: 'none' },
  { id: 'service-conversion', name: 'Service Conversion', goal: 'Book or contact', alignment: 'center', headerStyle: 'compact', blockWidth: 'full', navigationStyle: 'pills' },
  { id: 'product-showcase', name: 'Product Showcase', goal: 'Sell a featured offer', alignment: 'center', headerStyle: 'hero', blockWidth: 'full', navigationStyle: 'pills' },
  { id: 'gallery-portfolio', name: 'Gallery Portfolio', goal: 'Lead with visual work', alignment: 'center', headerStyle: 'standard', blockWidth: 'mixed', navigationStyle: 'none' },
  { id: 'booking-first', name: 'Booking First', goal: 'Put appointments first', alignment: 'left', headerStyle: 'compact', blockWidth: 'full', navigationStyle: 'none' },
  { id: 'link-collection', name: 'Link Collection', goal: 'Organize many destinations', alignment: 'center', headerStyle: 'standard', blockWidth: 'full', navigationStyle: 'pills' }
];

export const ThemeStudio: React.FC<ThemeStudioProps> = ({ onOpenReportModal }) => {
  const { 
    activeProfile, 
    updateDraftProfile,
    standardTheme, 
    updateStandardTheme, 
    applyTheme, 
    undoThemeChange,
    redoThemeChange,
    canUndoTheme,
    canRedoTheme,
    rollbackToSnapshot,
    saveCustomPreset,
    deleteCustomPreset,
    customPresets
    ,workspace
    ,updateBrandKit
    ,applyBrandKitToTheme,
    hasUnpublishedChanges,
    saveStatus,
    lastSavedAt,
    saveErrorMessage,
    retrySave,
    setPreviewSource,
    resetThemeToPublished,
    rollbackToPublishedSnapshot
  } = useApp();

  const [activeTab, setActiveTab] = useState<StudioTab>('presets');
  const [editorMode, setEditorMode] = useState<'quick' | 'advanced'>('quick');
  const [activeStage, setActiveStage] = useState<StudioStage>('foundation');
  const [customPresetName, setCustomPresetName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ThemeConfirmRequest | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [presetSaveError, setPresetSaveError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<StandardTheme | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [backgroundUploadError, setBackgroundUploadError] = useState<string | null>(null);
  const [themeImportError, setThemeImportError] = useState<string | null>(null);
  const [themeSearch, setThemeSearch] = useState('');
  const [themeCategory, setThemeCategory] = useState('All');
  const [pexelsQuery, setPexelsQuery] = useState('abstract background');
  const [pexelsResults, setPexelsResults] = useState<PexelsMedia[]>([]);
  const [pexelsPage, setPexelsPage] = useState(0);
  const [pexelsTotal, setPexelsTotal] = useState(0);
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);
  const [isLoadingMorePexels, setIsLoadingMorePexels] = useState(false);
  const [isApplyingPexels, setIsApplyingPexels] = useState(false);
  const [pexelsError, setPexelsError] = useState<string | null>(null);
  const [backgroundAssets, setBackgroundAssets] = useState<BackgroundAsset[]>([]);
  const [isLoadingBackgroundAssets, setIsLoadingBackgroundAssets] = useState(false);
  const [backgroundAssetsError, setBackgroundAssetsError] = useState<string | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonSnapshot, setComparisonSnapshot] = useState<PublishedThemeSnapshot | null>(null);
  const [comparisonDevice, setComparisonDevice] = useState<'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'wide'>('mobile');
  const [comparisonLocale, setComparisonLocale] = useState<'en' | 'ar'>('en');
  const [, setRecencyTick] = useState(0);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const mobileBackgroundInputRef = useRef<HTMLInputElement>(null);
  const themeImportRef = useRef<HTMLInputElement>(null);
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const saveModalRef = useRef<HTMLDivElement>(null);
  const brandKit = workspace.brandKit || {
    id: 'brand-kit-main', name: 'Workspace Brand Kit', primaryColor: '#111827', secondaryColor: '#64748B', accentColor: '#6366F1',
    latinFont: 'Inter, ui-sans-serif, system-ui, sans-serif', arabicFont: 'Noto Kufi Arabic, Tahoma, sans-serif', buttonStyle: 'filled' as const,
    imageStyle: 'rounded' as const, socialIconStyle: 'minimal' as const, updatedAt: new Date().toISOString()
  };
  const backgroundControls = previewTheme?.background || standardTheme.background;

  const requestConfirmation = (request: ThemeConfirmRequest) => setConfirmRequest(request);
  const closeConfirmation = () => setConfirmRequest(null);
  const confirmAndClose = async () => {
    if (!confirmRequest) return;
    const action = confirmRequest.onConfirm;
    setConfirmRequest(null);
    await action();
  };

  useEffect(() => {
    const timer = window.setInterval(() => setRecencyTick(value => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, [lastSavedAt]);

  useEffect(() => {
    if (!isMoreActionsOpen && !showSaveModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreActionsOpen(false);
        setShowSaveModal(false);
        return;
      }
      if (showSaveModal && event.key === 'Tab' && saveModalRef.current) {
        const focusable = Array.from(saveModalRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(element => !element.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (isMoreActionsOpen && moreActionsRef.current && !moreActionsRef.current.contains(target)) setIsMoreActionsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMoreActionsOpen, showSaveModal]);

  useEffect(() => {
    if (!showSaveModal) return;
    const firstField = saveModalRef.current?.querySelector<HTMLInputElement>('input');
    firstField?.focus();
  }, [showSaveModal]);

  const refreshBackgroundAssets = useCallback(async () => {
    setIsLoadingBackgroundAssets(true);
    setBackgroundAssetsError(null);
    try {
      setBackgroundAssets(await listBackgroundAssets(activeProfile.id));
    } catch (error) {
      setBackgroundAssetsError(error instanceof Error ? error.message : 'Background library could not be loaded.');
    } finally {
      setIsLoadingBackgroundAssets(false);
    }
  }, [activeProfile.id]);

  useEffect(() => {
    void refreshBackgroundAssets();
  }, [refreshBackgroundAssets]);

  const exportThemeJson = () => {
    const blob = new Blob([JSON.stringify(standardTheme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${standardTheme.id || 'lynkflow-theme'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setIsMoreActionsOpen(false);
  };

  const importThemeJson = async (file: File) => {
    setThemeImportError(null);
    try {
      const raw = JSON.parse(await file.text());
      const migrated = migrateTheme(raw);
      const validation = validateThemeSchema(migrated);
      if (!validation.isValid) throw new Error(validation.errors[0]?.message || 'Unsupported theme schema.');
      updateStandardTheme(() => normalizeTheme({ ...migrated, source: 'imported' }));
      setIsMoreActionsOpen(false);
    } catch (error) {
      setThemeImportError(error instanceof Error ? error.message : 'Theme JSON could not be imported.');
    } finally {
      if (themeImportRef.current) themeImportRef.current.value = '';
    }
  };

  const updateBrandKitField = <K extends keyof BrandKit>(key: K, value: BrandKit[K]) => {
    updateBrandKit(prev => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  };

  // Validate accessibility live
  const themeA11y = validateThemeAccessibility(standardTheme);
  const contentA11y = validateProfileAccessibility(activeProfile, standardTheme);
  const a11y = {
    isValid: themeA11y.isValid && contentA11y.isValid,
    canPublish: themeA11y.canPublish && contentA11y.canPublish,
    errors: [...themeA11y.errors, ...contentA11y.errors],
    warnings: [...themeA11y.warnings, ...contentA11y.warnings],
  };
  const qualityScore = calculateThemeQualityScore(standardTheme);
  const themeSchema = validateThemeSchema(standardTheme);
  const stageCompletion: Record<StudioStage, boolean> = {
    foundation: Boolean(standardTheme.name && (standardTheme.presetId || standardTheme.source === 'custom' || standardTheme.source === 'imported')),
    styling: themeSchema.isValid && Boolean(standardTheme.tokens.typography.bodyFamily && standardTheme.tokens.colors.accent),
    layout: themeSchema.isValid && Boolean(standardTheme.layout && standardTheme.responsive.mobile && standardTheme.responsive.desktop),
    review: a11y.canPublish
  };

  const autoFixAccessibilityIssue = (issue: { tokenKey: string }) => {
    const [, token] = issue.tokenKey.split('.');
    if (!token) return;
    updateStandardTheme(prev => {
      const colors = prev.tokens.colors;
      const chooseText = (background: string) => calculateContrastRatio('#FFFFFF', background) >= calculateContrastRatio('#000000', background) ? '#FFFFFF' : '#000000';
      const chooseBackground = (text: string) => calculateContrastRatio('#FFFFFF', text) >= calculateContrastRatio('#000000', text) ? '#000000' : '#FFFFFF';
      let value: string | undefined;
      if (token === 'primaryText' || token === 'secondaryText' || token === 'accentText') {
        value = chooseText(token === 'accentText' ? colors.accent : colors.pageBackground);
      } else if (token === 'focusRing') {
        value = chooseText(colors.pageBackground);
      } else if (token === 'cardTextColor') {
        value = chooseText(colors.panelBackground || colors.cardBg || colors.pageBackground);
      } else if (token === 'panelBackground' || token === 'cardBg') {
        value = chooseBackground(colors.cardTextColor || colors.primaryText);
      }
      if (!value) return prev;
      return { ...prev, tokens: { ...prev.tokens, colors: { ...colors, [token]: value } } };
    });
    setActionFeedback(`${issue.tokenKey} updated in the draft. Saving… Review the updated contrast before publishing.`);
    window.setTimeout(() => setActionFeedback(null), 5000);
  };

  // Helpers to update token fields
  const handleUpdateColor = (key: keyof typeof standardTheme.tokens.colors, value: string) => {
    updateStandardTheme(prev => {
      const colors = { ...prev.tokens.colors, [key]: value };
      if (key === 'accent') {
        const whiteContrast = calculateContrastRatio('#FFFFFF', value);
        const darkContrast = calculateContrastRatio('#000000', value);
        const bestText = darkContrast > whiteContrast ? '#09090B' : '#FFFFFF';
        // Auto-synchronize text contrast if existing accentText fails 4.5:1
        if (calculateContrastRatio(colors.accentText, value) < 4.5) {
          colors.accentText = bestText;
          colors.ctaText = bestText;
        }
      }
      return {
        ...prev,
        tokens: {
          ...prev.tokens,
          colors
        }
      };
    });
  };

  const generateAccentPalette = () => {
    updateStandardTheme(prev => {
      const colors = prev.tokens.colors;
      const accent = colors.accent;
      return {
        ...prev,
        tokens: {
          ...prev.tokens,
          colors: {
            ...colors,
            accentPrimary: accent,
            accentHover: mixHex(accent, '#FFFFFF', 0.12),
            accentPressed: mixHex(accent, '#000000', 0.16),
            accentDisabled: mixHex(accent, colors.pageBackground, 0.56),
            accentText: calculateContrastRatio('#FFFFFF', accent) >= calculateContrastRatio('#000000', accent) ? '#FFFFFF' : '#000000',
            ctaText: calculateContrastRatio('#FFFFFF', accent) >= calculateContrastRatio('#000000', accent) ? '#FFFFFF' : '#000000'
          }
        }
      };
    });
  };

  const handleUpdateTypography = (key: keyof typeof standardTheme.tokens.typography, value: unknown) => {
    updateStandardTheme(prev => ({
      ...prev,
      tokens: {
        ...prev.tokens,
        typography: {
          ...prev.tokens.typography,
          [key]: value
        }
      }
    }));
  };

  const handleUpdateShape = (key: keyof typeof standardTheme.tokens.shape, value: number) => {
    updateStandardTheme(prev => ({
      ...prev,
      tokens: {
        ...prev.tokens,
        shape: {
          ...prev.tokens.shape,
          [key]: value
        }
      }
    }));
  };

  const handleUpdateSpacing = (key: keyof typeof standardTheme.tokens.spacing, value: number) => {
    updateStandardTheme(prev => ({
      ...prev,
      tokens: {
        ...prev.tokens,
        spacing: {
          ...prev.tokens.spacing,
          [key]: value
        }
      }
    }));
  };

  const handleUpdateBackground = (key: keyof typeof standardTheme.background, value: unknown) => {
    if (previewTheme) {
      setPreviewTheme(prev => prev ? normalizeTheme({
        ...prev,
        background: { ...prev.background, [key]: value }
      }) : prev);
      return;
    }
    updateStandardTheme(prev => ({ ...prev, background: { ...prev.background, [key]: value } }));
  };

  const adjustBackgroundScale = (delta: number) => {
    const currentScale = Number(backgroundControls.scale || 1);
    handleUpdateBackground('scale', Math.min(2, Math.max(1, Number((currentScale + delta).toFixed(2)))));
  };

  const handleBackgroundUpload = async (file: File, target: 'desktop' | 'mobile' = 'desktop') => {
    setBackgroundUploadError(null);
    setIsUploadingBackground(true);
    try {
      const uploaded = await uploadBackgroundAsset(file, activeProfile.id);
      const accentGradient = uploaded.kind === 'image'
        ? await extractImageAccentGradient(uploaded.assetUrl)
        : null;
      updateStandardTheme(prev => ({
        ...prev,
        background: {
          ...prev.background,
          ...(target === 'desktop' ? {
            type: uploaded.kind,
            assetId: uploaded.assetId,
            assetUrl: uploaded.assetUrl,
            placeholderUrl: uploaded.placeholderUrl || prev.background.placeholderUrl,
            gradientStops: accentGradient || prev.background.gradientStops,
            overlay: uploaded.kind === 'image' ? Math.max(prev.background.overlay ?? 0, 0.08) : prev.background.overlay
          } : { mobileAssetId: uploaded.assetId, mobileAssetUrl: uploaded.assetUrl })
        }
      }));
      await refreshBackgroundAssets();
    } catch (error) {
      setBackgroundUploadError(error instanceof Error ? error.message : 'Background upload failed.');
    } finally {
      setIsUploadingBackground(false);
      if (backgroundInputRef.current) backgroundInputRef.current.value = '';
      if (mobileBackgroundInputRef.current) mobileBackgroundInputRef.current.value = '';
    }
  };

  const handleClearBackground = async () => {
    const assetIds = [...new Set([standardTheme.background.assetId, standardTheme.background.mobileAssetId].filter(Boolean) as string[])];
    setBackgroundUploadError(null);
    try {
      for (const assetId of assetIds) await removeBackgroundAsset(assetId);
      updateStandardTheme(prev => ({
        ...prev,
        background: {
          ...prev.background,
          type: 'solid',
          assetId: null,
          mobileAssetId: null,
          assetUrl: null,
          mobileAssetUrl: null,
          posterUrl: null,
          gradientStops: undefined
        }
      }));
    } catch (error) {
      setBackgroundUploadError(error instanceof Error ? error.message : 'Background removal failed.');
    }
  };

  const applyLibraryAsset = (asset: BackgroundAsset) => {
    updateStandardTheme(prev => ({
      ...prev,
      background: {
        ...prev.background,
        type: asset.kind,
        assetId: asset.storagePath,
        assetUrl: asset.assetUrl,
        overlay: asset.kind === 'image' ? Math.max(prev.background.overlay ?? 0, 0.08) : prev.background.overlay,
      }
    }));
  };

  const deleteLibraryAsset = async (asset: BackgroundAsset) => {
    requestConfirmation({
      title: 'Delete background asset?',
      message: 'Existing themes using this asset may no longer display it. This cannot be undone.',
      confirmLabel: 'Delete asset',
      destructive: true,
      onConfirm: async () => {
        try {
          const wasSelected = standardTheme.background.assetId === asset.storagePath;
          await removeBackgroundAsset(asset.storagePath);
          setBackgroundAssets(prev => prev.filter(item => item.id !== asset.id));
          if (wasSelected) updateStandardTheme(prev => ({ ...prev, background: { ...prev.background, type: 'solid', assetId: null, assetUrl: null, mobileAssetUrl: null, posterUrl: null } }));
        } catch (error) {
          setBackgroundUploadError(error instanceof Error ? error.message : 'Background asset deletion failed.');
        }
      }
    });
  };

  const searchPexels = async () => {
    const query = pexelsQuery.trim();
    if (!query) return;
    setIsSearchingPexels(true);
    setPexelsError(null);
    try {
      const type = standardTheme.background.type === 'video' ? 'videos' : 'photos';
      const response = await fetch(`/api/media/pexels?type=${type}&query=${encodeURIComponent(query)}&page=1&per_page=24`);
      const payload = await response.json() as { page?: number; totalResults?: number; results?: PexelsMedia[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Pexels search failed.');
      setPexelsResults(payload.results || []);
      setPexelsPage(payload.page || 1);
      setPexelsTotal(payload.totalResults || (payload.results || []).length);
    } catch (error) {
      setPexelsError(error instanceof Error ? error.message : 'Pexels search failed.');
      setPexelsResults([]);
      setPexelsPage(0);
      setPexelsTotal(0);
    } finally {
      setIsSearchingPexels(false);
    }
  };

  const loadMorePexels = async () => {
    const query = pexelsQuery.trim();
    if (!query || !pexelsPage || pexelsPage >= 50 || pexelsResults.length >= pexelsTotal) return;
    setIsLoadingMorePexels(true);
    setPexelsError(null);
    try {
      const type = standardTheme.background.type === 'video' ? 'videos' : 'photos';
      const nextPage = pexelsPage + 1;
      const response = await fetch(`/api/media/pexels?type=${type}&query=${encodeURIComponent(query)}&page=${nextPage}&per_page=24`);
      const payload = await response.json() as { page?: number; totalResults?: number; results?: PexelsMedia[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'More Pexels results could not be loaded.');
      setPexelsResults(previous => {
        const existing = new Set(previous.map(result => `${result.kind}:${result.id}`));
        return [...previous, ...(payload.results || []).filter(result => !existing.has(`${result.kind}:${result.id}`))];
      });
      setPexelsPage(payload.page || nextPage);
      setPexelsTotal(payload.totalResults || pexelsTotal);
    } catch (error) {
      setPexelsError(error instanceof Error ? error.message : 'More Pexels results could not be loaded.');
    } finally {
      setIsLoadingMorePexels(false);
    }
  };

  const previewPexelsMedia = (media: PexelsMedia) => {
    setPexelsError(null);
    setPreviewTheme(normalizeTheme({
      ...standardTheme,
      background: {
        ...standardTheme.background,
        type: media.kind,
        assetId: null,
        assetUrl: media.assetUrl,
        placeholderUrl: null,
        posterUrl: media.kind === 'video' ? (media.thumbnail || standardTheme.background.posterUrl) : null,
        gradientStops: undefined,
        overlay: media.kind === 'image' ? Math.max(standardTheme.background.overlay ?? 0, 0.08) : standardTheme.background.overlay,
        fallbackColor: standardTheme.background.fallbackColor || standardTheme.tokens.colors.pageBackground
      }
    }));
  };

  const applyPexelsMedia = async (media: PexelsMedia) => {
    setPexelsError(null);
    setIsApplyingPexels(true);
    try {
      const asset = await registerRemoteBackgroundAsset({
        id: media.id,
        kind: media.kind,
        assetUrl: media.assetUrl,
        sourceUrl: media.sourceUrl,
        photographer: media.photographer,
        width: media.width,
        height: media.height,
      }, activeProfile.id);
      updateStandardTheme(prev => ({
        ...prev,
        background: {
          ...prev.background,
          type: asset.kind,
          assetId: asset.storagePath,
          assetUrl: asset.assetUrl,
          placeholderUrl: null,
          posterUrl: asset.kind === 'video' ? (media.thumbnail || prev.background.posterUrl || null) : null,
          gradientStops: undefined,
          overlay: asset.kind === 'image' ? Math.max(prev.background.overlay ?? 0, 0.08) : prev.background.overlay,
          fallbackColor: prev.background.fallbackColor || prev.tokens.colors.pageBackground
        }
      }));
      setPreviewTheme(null);
      await refreshBackgroundAssets();
    } catch (error) {
      setPexelsError(error instanceof Error ? error.message : 'Pexels background could not be saved.');
    } finally {
      setIsApplyingPexels(false);
    }
  };

  const handleUpdateLayout = (key: keyof NonNullable<StandardTheme['layout']>, value: string | boolean) => {
    updateStandardTheme(prev => ({
      ...prev,
      layout: {
        ...(prev.layout || { maxWidth: '680px', alignment: 'center', headerStyle: 'standard', blockWidth: 'full', navigationStyle: 'pills' }),
        [key]: value
      }
    }));
  };

  const handleUpdateConversion = (key: keyof NonNullable<StandardTheme['conversion']>, value: string | null) => {
    updateStandardTheme(prev => ({
      ...prev,
      conversion: { ...(prev.conversion || { goal: 'contact' }), [key]: value }
    }));
  };

  const handleUpdateResponsive = (viewport: keyof StandardTheme['responsive'], key: 'pageX' | 'pageY' | 'blockGap' | 'avatarSize' | 'headingScale' | 'imageHeight' | 'textAlign' | 'navigationPosition' | 'blockVisibility', value: number | string) => {
    updateStandardTheme(prev => ({
      ...prev,
      responsive: {
        ...prev.responsive,
        [viewport]: { ...prev.responsive[viewport], [key]: value }
      }
    }));
  };

  const applyLayoutTemplate = (template: typeof LAYOUT_TEMPLATES[number]) => {
    updateStandardTheme(prev => ({
      ...prev,
      layout: {
        ...(prev.layout || { maxWidth: '680px', alignment: 'center', headerStyle: 'standard', blockWidth: 'full', navigationStyle: 'pills' }),
        templateId: template.id,
        alignment: template.alignment,
        headerStyle: template.headerStyle,
        blockWidth: template.blockWidth,
        navigationStyle: template.navigationStyle,
        ctaPosition: template.goal === 'Book or contact' || template.goal === 'Put appointments first' ? 'first' : 'priority-order'
      }
    }));
    setActionFeedback(`${template.name} layout updated in the draft. Saving…`);
    window.setTimeout(() => setActionFeedback(null), 4000);
  };

  const previewPreset = (preset: StandardTheme) => setPreviewTheme(normalizeTheme(preset));
  const applyMarketplaceTheme = (preset: StandardTheme) => {
    applyTheme(preset);
    setActionFeedback(`${preset.name} is now your draft theme. Your content was preserved; publish when ready.`);
    window.setTimeout(() => setActionFeedback(null), 4000);
  };
  const applyLayoutOnly = (preset: StandardTheme) => {
    const next = normalizeTheme(preset);
    updateStandardTheme(prev => ({
      ...prev,
      name: next.name,
      presetId: next.presetId,
      tokens: next.tokens,
      background: next.background,
      componentVariants: next.componentVariants,
      blockDefaults: next.blockDefaults,
      layout: next.layout,
      responsive: next.responsive
    }));
    setActionFeedback(`${preset.name} layout updated in the draft. Saving… Your content was preserved.`);
    window.setTimeout(() => setActionFeedback(null), 4000);
  };

  const applySavedPreset = (preset: StandardTheme) => {
    const composition = preset.presetComposition;
    const changesLayout = composition?.changesLayout !== false;
    const includesContent = composition?.includesStarterContent === true || composition?.changesContent === true;
    const summary = changesLayout
      ? `Apply “${preset.name}”? This changes the visual style and layout composition, but preserves your profile content and blocks.`
      : `Apply “${preset.name}”? This changes appearance only and preserves your layout and content.`;
    if (includesContent || changesLayout) {
      requestConfirmation({
        title: `Apply ${preset.name}?`,
        message: includesContent ? `${summary} This preset also contains starter content and will replace the current content.` : summary,
        confirmLabel: includesContent ? 'Replace content' : 'Apply preset',
        destructive: includesContent,
        onConfirm: () => applyTheme(preset)
      });
      return;
    }
    applyTheme(preset);
  };

  const handleUpdateVariant = (key: keyof NonNullable<StandardTheme['componentVariants']>, value: string) => {
    updateStandardTheme(prev => ({
      ...prev,
      componentVariants: {
        ...(prev.componentVariants || { link: 'solid', image: 'rounded', socialIcons: 'line', form: 'card' }),
        [key]: value
      },
      ...(key === 'link' ? {
        blockDefaults: {
          ...prev.blockDefaults,
          link: {
            ...(prev.blockDefaults?.link || { height: 56, thumbnail: 'none', shadow: 'sm' }),
            variant: (value === 'soft-card' ? 'soft' : value === 'solid' || value === 'image-card' ? 'filled' : value) as 'filled' | 'outline' | 'soft' | 'glass'
          }
        }
      } : {})
    }));
  };

  const handleUpdateThemeSection = (section: 'profile' | 'socialIcons' | 'effects' | 'buttons' | 'cards', key: string, value: unknown) => {
    updateStandardTheme(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value }
    }));
  };

  const handleUpdateBlockDefaults = (blockType: 'link' | 'text' | 'media' | 'folder', key: string, value: unknown) => {
    updateStandardTheme(prev => ({
      ...prev,
      blockDefaults: {
        ...prev.blockDefaults,
        [blockType]: {
          ...(prev.blockDefaults[blockType] || {}),
          [key]: value
        }
      },
      ...(blockType === 'link' && key === 'variant' ? {
        componentVariants: {
          ...(prev.componentVariants || { link: 'solid', image: 'rounded', socialIcons: 'line', form: 'card' }),
          link: (value === 'soft' ? 'soft-card' : value === 'filled' ? 'solid' : value) as NonNullable<StandardTheme['componentVariants']>['link']
        }
      } : {})
    }));
  };

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customPresetName.trim()) {
      setPresetSaveError(null);
      try {
        await saveCustomPreset(customPresetName.trim());
        setCustomPresetName('');
        setShowSaveModal(false);
      } catch (error) {
        setPresetSaveError(error instanceof Error ? error.message : 'Custom preset could not be saved.');
      }
    }
  };

  const duplicateCurrentPreset = async () => {
    setPresetSaveError(null);
    try {
      await saveCustomPreset(`${standardTheme.name} Copy`);
      setIsMoreActionsOpen(false);
    } catch (error) {
      setPresetSaveError(error instanceof Error ? error.message : 'Custom preset could not be saved.');
    }
  };

  const removeCustomPreset = (preset: StandardTheme) => {
    requestConfirmation({
      title: `Delete ${preset.name}?`,
      message: 'This removes the reusable preset from your workspace. It will not change themes already applied to profiles.',
      confirmLabel: 'Delete preset',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteCustomPreset(preset.id);
        } catch (error) {
          setPresetSaveError(error instanceof Error ? error.message : 'Custom preset could not be deleted.');
        }
      }
    });
  };

  const snapshots = activeProfile.themeSnapshots || [];
  const savedRecency = (() => {
    if (!lastSavedAt) return 'Saved';
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 60000));
    if (elapsedMinutes < 1) return 'Saved just now';
    if (elapsedMinutes === 1) return 'Saved 1 minute ago';
    if (elapsedMinutes < 60) return `Saved ${elapsedMinutes} minutes ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    return `Saved ${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`;
  })();
  const currentStage = STUDIO_STAGES.find(stage => stage.id === activeStage) || STUDIO_STAGES[0];
  const visibleStageTabs = currentStage.tabs.filter(tab => editorMode === 'advanced' || QUICK_CUSTOMIZE_TABS.includes(tab));
  const themeCategories = ['All', ...Array.from(new Set(SPEC_THEME_PRESETS.map(theme => theme.category || 'Creator'))).sort()];
  const normalizedThemeSearch = themeSearch.trim().toLowerCase();
  const visibleThemePresets = SPEC_THEME_PRESETS.filter(preset => {
    const category = preset.category || 'Creator';
    const matchesCategory = themeCategory === 'All' || category === themeCategory;
    const matchesSearch = !normalizedThemeSearch || `${preset.name} ${category} ${preset.tokens.typography.displayFamily}`.toLowerCase().includes(normalizedThemeSearch);
    return matchesCategory && matchesSearch;
  });
  const personaForTheme = (preset: StandardTheme): PersonaTemplate => {
    const category = (preset.category || '').toLowerCase();
    const personaId = category.includes('music') || category.includes('audio') || category.includes('entertainment')
      ? 'music-artist'
      : category.includes('beauty') || category.includes('salon') || category.includes('wellness')
        ? 'beauty-service'
        : category.includes('bakery') || category.includes('food') || category.includes('shop') || category.includes('business')
          ? 'small-business-shop'
          : category.includes('finance') || category.includes('professional') || category.includes('coach')
            ? 'coach-consultant'
            : 'creator-portfolio';
    return PERSONA_TEMPLATES.find(template => template.id === personaId) || PERSONA_TEMPLATES[0];
  };
  const changeEditorMode = (mode: 'quick' | 'advanced') => {
    setEditorMode(mode);
    if (mode === 'quick' && !QUICK_CUSTOMIZE_TABS.includes(activeTab)) {
      setActiveStage('foundation');
      setActiveTab('presets');
    }
  };
  const openStudioTab = (tab: StudioTab) => {
    const stage = STUDIO_STAGES.find(item => item.tabs.includes(tab));
    if (stage) setActiveStage(stage.id);
    setActiveTab(tab);
  };
  const openStudioStage = (stage: typeof STUDIO_STAGES[number]) => {
    setActiveStage(stage.id);
    if (!stage.tabs.includes(activeTab)) setActiveTab(stage.tabs[0]);
  };

  const applyPersonaTemplate = (template: PersonaTemplate, themeOverride?: StandardTheme) => {
    requestConfirmation({
      title: themeOverride ? `Use ${themeOverride.name} with starter content?` : `Use ${template.name} starter?`,
      message: themeOverride
        ? `This applies the complete theme and replaces the current draft blocks with a ${template.name.toLowerCase()} starter structure. Your published page will not change until you publish.`
        : 'This replaces the current draft blocks with the persona starter structure. Your published page will not change until you publish.',
      confirmLabel: themeOverride ? 'Use theme and starter' : 'Use starter',
      destructive: true,
      onConfirm: () => {
        const stamp = Date.now();
        applyTheme(themeOverride || composeStarterSiteTheme(template));
        updateDraftProfile(prev => ({
      ...prev,
      starterSiteId: template.id,
      category: template.category,
      bio: prev.bio && !prev.bio.toLowerCase().includes('welcome to my') ? prev.bio : template.bio,
        socialLinks: template.socialLinks.map((social, index) => ({
        id: `persona-social-${stamp}-${index}`,
        platform: social.platform,
        url: '',
        active: true
      })),
      tabs: [{
        ...(prev.tabs[0] || { id: `tab-${stamp}`, title: 'Main', slug: 'main', position: 0 }),
        title: 'Main',
        slug: 'main',
        position: 0,
        blocks: template.blocks.map((starter, index) => ({
          id: `persona-block-${stamp}-${index}`,
          type: starter.type as BlockType,
          title: starter.title,
          payload: starter.payload as unknown as Block['payload'],
          position: index,
          isHidden: false,
          clicks: 0
        }))
      }],
      seo: {
        ...prev.seo,
        title: `${prev.displayName || template.name} | ${template.name}`,
        description: template.description,
        noIndex: false
      },
      updatedAt: new Date().toISOString()
        }));
        setActionFeedback(`${template.name} starter updated in the draft. Saving…`);
        window.setTimeout(() => setActionFeedback(null), 4000);
      }
    });
  };

  return (
    <div className="studio-theme min-w-0 min-h-0 flex-1 flex flex-col min-[900px]:flex-row overflow-hidden">
      {/* Controls Column */}
      <div className="order-2 min-[900px]:order-1 min-w-0 w-full min-[900px]:w-[58%] xl:w-[60%] flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        
        {/* Header & Undo/Redo/Save Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              <span>Theme & Styling Studio</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-accent border border-indigo-500/20">
                v{standardTheme.schemaVersion}.0
              </span>
            </h2>
          <p className="text-xs text-muted mt-0.5">
              Live design tokens interpreted by the shared public renderer. Changes appear in the preview immediately.
            </p>
            <div className="mt-3 inline-flex rounded-lg border border-line bg-canvas p-0.5" aria-label="Theme editor mode">
              <button type="button" onClick={() => changeEditorMode('quick')} aria-pressed={editorMode === 'quick'} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${editorMode === 'quick' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'}`}>Quick customize</button>
              <button type="button" onClick={() => changeEditorMode('advanced')} aria-pressed={editorMode === 'advanced'} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${editorMode === 'advanced' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'}`}>Advanced</button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span role="status" title={saveErrorMessage || undefined} className={`inline-flex items-center max-w-[12rem] truncate rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${saveStatus === 'error' || saveStatus === 'conflict' ? 'border-danger/30 bg-danger-surface text-danger' : saveStatus === 'offline' ? 'border-warning/30 bg-warning-surface text-warning' : saveStatus === 'saving' ? 'border-warning/30 bg-warning-surface text-warning' : 'border-success/30 bg-success-surface text-success'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${saveStatus === 'error' || saveStatus === 'conflict' ? 'bg-danger' : saveStatus === 'saving' || saveStatus === 'offline' ? 'bg-warning' : 'bg-success'}`} />
              <span className="truncate">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'offline' ? 'Offline changes pending' : saveStatus === 'error' ? 'Save failed' : saveStatus === 'conflict' ? 'Conflict detected' : hasUnpublishedChanges ? `Draft · ${savedRecency.toLowerCase()}` : savedRecency}</span>
            </span>
            {(saveStatus === 'error' || saveStatus === 'conflict') && (
              <button 
                type="button" 
                onClick={() => void retrySave()} 
                className="h-9 px-2.5 rounded-lg border border-danger/30 bg-danger-surface text-[11px] font-semibold text-danger hover:bg-danger/20 transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
            
            <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-line">
              <button
                type="button"
                onClick={undoThemeChange}
                disabled={!canUndoTheme}
                aria-label="Undo last theme change"
                title="Undo last token change"
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                  canUndoTheme 
                    ? 'text-ink hover:bg-surface-2 cursor-pointer' 
                    : 'text-subtle/50 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={redoThemeChange}
                disabled={!canRedoTheme}
                aria-label="Redo last theme change"
                title="Redo token change"
                className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                  canRedoTheme 
                    ? 'text-ink hover:bg-surface-2 cursor-pointer' 
                    : 'text-subtle/50 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="h-9 rounded-lg bg-surface px-3 hover:bg-surface-2 border border-line-strong text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-accent" />
              <span>Save Preset</span>
            </button>

            <button 
              type="button" 
              onClick={() => setPreviewSource('draft')} 
              className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors cursor-pointer shadow-xs"
            >
              Preview
            </button>

            <button 
              type="button" 
              onClick={() => { setComparisonSnapshot(null); setShowComparison(value => !value); }} 
              className={`h-9 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                showComparison 
                  ? 'border-accent/40 bg-accent/10 text-accent font-bold' 
                  : 'border-line-strong bg-surface text-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              {showComparison ? 'Exit compare' : 'Compare'}
            </button>

            <button 
              type="button" 
              onClick={() => setIsPublishOpen(true)} 
              disabled={!hasUnpublishedChanges || !a11y.canPublish} 
              title={!hasUnpublishedChanges ? 'Make and save a change before publishing.' : !a11y.canPublish ? 'Resolve accessibility findings before publishing.' : 'Publish draft'} 
              className="h-9 rounded-lg bg-accent px-4 text-xs font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
            >
              Publish
            </button>

            <div className="relative" ref={moreActionsRef}>
              <button 
                type="button" 
                aria-label="More theme actions" 
                aria-expanded={isMoreActionsOpen} 
                onClick={() => setIsMoreActionsOpen(value => !value)} 
                className="h-9 w-9 rounded-lg border border-line-strong bg-surface flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer shadow-xs"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
              {isMoreActionsOpen && (
                <div className="absolute right-0 top-full z-40 mt-1.5 w-48 rounded-xl border border-line bg-surface p-1 shadow-xl">
                  <button type="button" onClick={exportThemeJson} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-canvas hover:text-ink cursor-pointer transition-colors"><Download className="h-3.5 w-3.5" /> Export theme JSON</button>
                  <button type="button" onClick={() => themeImportRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-canvas hover:text-ink cursor-pointer transition-colors"><Upload className="h-3.5 w-3.5" /> Import theme JSON</button>
                  <button type="button" onClick={() => { setPreviewTheme(null); setPexelsError(null); resetThemeToPublished(); setIsMoreActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-canvas hover:text-ink cursor-pointer transition-colors"><RotateCcw className="h-3.5 w-3.5" /> Reset unsaved theme</button>
                <button type="button" onClick={() => void duplicateCurrentPreset()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-canvas hover:text-ink cursor-pointer transition-colors"><BookmarkPlus className="h-3.5 w-3.5" /> Duplicate as preset</button>
                </div>
              )}
            </div>
            <input ref={themeImportRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importThemeJson(file); }} />
          </div>
        </div>

        {actionFeedback && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-success/30 bg-success-surface px-3 py-2 text-xs text-success">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionFeedback}</span>
          </div>
        )}
        {presetSaveError && !showSaveModal && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger-surface px-3 py-2 text-xs text-danger">
            {presetSaveError}
          </div>
        )}
        {themeImportError && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-danger/30 bg-danger-surface px-3 py-2 text-xs text-danger">
            <span>Theme import failed: {themeImportError}</span>
            <button type="button" onClick={() => setThemeImportError(null)} aria-label="Dismiss theme import error" className="min-h-8 min-w-8 rounded-md hover:bg-danger/10 cursor-pointer">×</button>
          </div>
        )}

        {previewTheme && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
            <span className="text-muted">Previewing <strong className="text-ink">{previewTheme.name}</strong>. Your draft has not changed.</span>
            <button type="button" onClick={() => setPreviewTheme(null)} className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:bg-canvas hover:text-ink cursor-pointer">Exit preview</button>
          </div>
        )}

        {/* Live Accessibility Indicator Bar */}
        <div className={`p-3 rounded-xl border flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between text-xs ${
          a11y.canPublish 
            ? 'bg-success-surface border-success/40 text-success' 
            : 'bg-danger-surface border-danger/40 text-danger'
        }`}>
          <div className="flex min-w-0 items-start gap-2">
            {a11y.canPublish ? (
              <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
            )}
            <div className="min-w-0 leading-snug">
              <span className="block font-semibold break-words">
                {a11y.canPublish ? 'WCAG AA Compliant' : 'Accessibility Warning (Blocking Publish)'}
              </span>
              <span className="mt-1 block text-[11px] opacity-80 break-words sm:mt-0 sm:inline sm:ml-2">
                {a11y.canPublish 
                  ? 'Colors satisfy minimum 4.5:1 contrast requirements.' 
                  : a11y.errors[0]?.message}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {!a11y.canPublish && a11y.errors[0]?.suggestedFix && (
              <button
                type="button"
                onClick={() => autoFixAccessibilityIssue(a11y.errors[0])}
                className="min-h-10 flex-1 px-3 py-2 text-[11px] font-semibold rounded bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer sm:min-h-0 sm:flex-none sm:py-1"
              >
                Auto-Fix Contrast
              </button>
            )}
            <button
              onClick={() => openStudioTab('accessibility')}
              className="min-h-10 flex-1 rounded px-2 py-2 text-center text-[11px] underline font-medium hover:opacity-80 cursor-pointer sm:min-h-0 sm:flex-none sm:py-1"
            >
              Review Audit
            </button>
          </div>
        </div>

        {/* Four-stage builder navigation */}
        <div className="rounded-2xl border border-line bg-surface/90 p-2.5 shadow-xs backdrop-blur-xs">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
            {STUDIO_STAGES.map((stage, index) => {
              const isActive = activeStage === stage.id;
              const isComplete = stageCompletion[stage.id] && !isActive;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => openStudioStage(stage)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`${stage.label}: ${stage.description}`}
                  className={`min-h-14 min-w-[9.5rem] flex-1 rounded-xl px-3 py-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                    isActive 
                      ? 'bg-ink text-white shadow-sm ring-1 ring-ink/20' 
                      : 'text-muted hover:bg-canvas hover:text-ink border border-transparent hover:border-line'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : isComplete 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-canvas text-muted border border-line'
                    }`}>
                      {isComplete ? '✓' : index + 1}
                    </span>
                    <span className="text-xs font-bold truncate">{stage.label}</span>
                  </div>
                  <span className={`mt-1 block pl-7 text-[10px] leading-tight ${isActive ? 'text-white/70' : 'text-subtle'}`}>
                    {stage.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div role="tablist" aria-label={`${currentStage.label} theme settings`} className="mt-2.5 flex items-center gap-1.5 overflow-x-auto border-t border-line/70 px-1 pt-2.5 scrollbar-none">
            {visibleStageTabs.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => openStudioTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={`min-h-9 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-accent text-white shadow-xs' 
                    : 'text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                {STUDIO_TAB_LABELS[tab]}{tab === 'snapshots' ? ` (${snapshots.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'starterSites' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Starter Sites Catalog</div>
                  <h3 className="mt-1 text-base font-bold text-ink">Start with curated content, not a blank canvas</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">A starter site crafts real bio copy, relevant social platforms, structured blocks, SEO metadata, and goal-driven conversion defaults.</p>
                </div>
                <span className="rounded-full bg-surface border border-line px-3 py-1 text-[10px] font-semibold text-muted shrink-0">{PERSONA_TEMPLATES.length} content starters</span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {PERSONA_TEMPLATES.map(persona => (
                  <article key={persona.id} className="rounded-2xl border border-line bg-surface p-4 flex flex-col justify-between hover:border-line-strong hover:shadow-xs transition-all">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{persona.eyebrow}</span>
                        <span className="text-[9px] font-mono text-muted uppercase px-1.5 py-0.5 rounded bg-canvas border border-line">{persona.category}</span>
                      </div>
                      <h4 className="mt-1.5 text-sm font-bold text-ink">{persona.name}</h4>
                      <p className="mt-1.5 min-h-11 text-[11px] leading-relaxed text-muted">{persona.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {persona.fields.slice(0, 5).map(field => (
                          <span key={field} className="rounded-md bg-canvas border border-line/60 px-2 py-0.5 text-[10px] text-muted">{field}</span>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => applyPersonaTemplate(persona)} className="mt-4 min-h-10 w-full rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink/85 cursor-pointer transition-colors shadow-xs">
                      Use this starter
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme presets & custom library */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider font-mono">
                    Specification Curated Presets ({SPEC_THEME_PRESETS.length})
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">Finished visual directions, tested for contrast and responsive preview. Choose a look first; customize details later.</p>
                </div>
              </div>
              <div className="mb-4 flex flex-col gap-2 rounded-xl border border-line bg-surface p-2.5 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" aria-hidden="true" />
                  <span className="sr-only">Search themes</span>
                  <input value={themeSearch} onChange={event => setThemeSearch(event.target.value)} placeholder="Search by style, category, or font" className="h-9 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </label>
                <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Theme categories">
                  {themeCategories.map(category => (
                    <button key={category} type="button" role="tab" aria-selected={themeCategory === category} onClick={() => setThemeCategory(category)} className={`min-h-9 shrink-0 rounded-lg px-2.5 text-[11px] font-semibold transition-colors cursor-pointer ${themeCategory === category ? 'bg-ink text-white' : 'bg-canvas text-muted hover:text-ink'}`}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              {visibleThemePresets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
                  <p className="text-sm font-semibold text-ink">No themes match that search.</p>
                  <button type="button" onClick={() => { setThemeSearch(''); setThemeCategory('All'); }} className="mt-2 text-xs font-semibold text-accent hover:underline cursor-pointer">Clear filters</button>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleThemePresets.map((preset) => {
                  const isSelected = standardTheme.presetId === preset.presetId || standardTheme.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                        isSelected 
                          ? 'border-accent ring-2 ring-accent/20 bg-surface shadow-md' 
                          : 'border-line bg-surface/70 hover:border-line-strong hover:bg-surface hover:shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="relative overflow-hidden rounded-xl">
                          <ThemePreviewCard theme={preset} profile={activeProfile} />
                          {isSelected && (
                            <span className="absolute top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                              <span>{preset.name}</span>
                              <span className="text-[9px] font-mono text-muted/80">({preset.tokens.typography.displayFamily.split(',')[0]})</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded-md bg-canvas border border-line px-1.5 py-0.5 text-[9px] font-semibold text-ink">{preset.category || 'Creator'}</span>
                              <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[9px] text-muted capitalize">{preset.mode || 'system'}</span>
                              <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[9px] text-muted capitalize">{preset.background.type}</span>
                              {preset.supportsRTL !== false && <span className="rounded-md bg-indigo-500/10 text-accent px-1.5 py-0.5 text-[9px] font-medium">RTL</span>}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />}
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3 pt-2.5 border-t border-line/60">
                        <button type="button" onClick={() => previewPreset(preset)} className="min-h-9 rounded-lg border border-line px-2 py-1.5 text-[11px] font-semibold text-muted hover:bg-canvas hover:text-ink cursor-pointer transition-colors">Preview</button>
                        <button type="button" onClick={() => applyMarketplaceTheme(preset)} className="min-h-9 rounded-lg bg-ink px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-ink/85 cursor-pointer transition-colors sm:col-span-2">Use this theme</button>
                        {editorMode === 'quick' && <button type="button" onClick={() => applyPersonaTemplate(personaForTheme(preset), preset)} className="min-h-9 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20 cursor-pointer transition-colors sm:col-span-3">Use with starter content</button>}
                        {editorMode === 'advanced' && <button type="button" onClick={() => applyLayoutOnly(preset)} className="min-h-9 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/20 cursor-pointer transition-colors sm:col-span-3">Apply layout only</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Custom Presets saved by user */}
            {customPresets.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider font-mono mb-3">
                  Workspace Custom Presets ({customPresets.length})
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {customPresets.map((preset) => {
                    const isSelected = standardTheme.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                          isSelected 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-surface' 
                            : 'border-line bg-surface/60 hover:border-line-strong'
                        }`}
                      >
                        <button type="button" onClick={() => applySavedPreset(preset)} className="block w-full text-left cursor-pointer">
                          <ThemePreviewCard theme={preset} label="Custom theme preview" profile={activeProfile} />
                        </button>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-ink truncate">{preset.name}</div>
                          {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                        </div>
                        <div className="mt-1 text-[10px] leading-snug text-muted">
                          Appearance only · {preset.presetComposition?.changesLayout ? `layout: ${preset.presetComposition.layoutId?.split(':').pop() || 'saved'}` : 'current layout'}
                        </div>
                        <div className="mt-3 flex justify-end border-t border-line/60 pt-2">
                          <button type="button" onClick={() => removeCustomPreset(preset)} className="rounded-md border border-danger/30 px-2 py-1 text-[10px] font-semibold text-danger hover:bg-danger/10 cursor-pointer">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Colors */}
        {activeTab === 'colors' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Color tokens</h3>
                <p className="mt-1 text-[11px] text-muted">Semantic colors are shared by the editor and published renderer.</p>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-muted">
                <span>Theme mode</span>
                <select aria-label="Theme mode" value={standardTheme.mode || 'system'} onChange={(e) => updateStandardTheme(prev => ({ ...prev, mode: e.target.value as 'light' | 'dark' | 'system' }))} className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>

            {/* Quick Harmonious Accent Palettes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink">Curated Accent Harmonies</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { name: 'Indigo Electric', accent: '#6366F1', text: '#FFFFFF', bg: '#090D16' },
                  { name: 'Emerald Luxe', accent: '#10B981', text: '#022C22', bg: '#061712' },
                  { name: 'Rose Radiance', accent: '#F43F5E', text: '#FFFFFF', bg: '#14080E' },
                  { name: 'Amber Sunset', accent: '#F59E0B', text: '#18181B', bg: '#181408' }
                ].map(palette => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => {
                      handleUpdateColor('accent', palette.accent);
                      handleUpdateColor('accentText', palette.text);
                    }}
                    className="p-2.5 rounded-xl border border-line bg-canvas/70 hover:border-line-strong hover:bg-canvas text-left cursor-pointer transition-all flex items-center gap-2.5"
                  >
                    <div className="h-6 w-6 rounded-lg border border-black/10 shadow-xs shrink-0 flex items-center justify-center font-bold text-[9px]" style={{ backgroundColor: palette.accent, color: palette.text }}>
                      A
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold text-ink truncate">{palette.name}</span>
                      <span className="block font-mono text-[9px] text-muted">{palette.accent}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">surface.page (Page Background)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Page background color"
                    type="color"
                    value={standardTheme.tokens.colors.pageBackground}
                    onChange={(e) => handleUpdateColor('pageBackground', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="Page background HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.pageBackground}
                    onChange={(e) => handleUpdateColor('pageBackground', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">surface.panel (Card & Folder Surface)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Panel surface color"
                    type="color"
                    value={standardTheme.tokens.colors.panelBackground}
                    onChange={(e) => handleUpdateColor('panelBackground', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="Panel surface HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.panelBackground}
                    onChange={(e) => handleUpdateColor('panelBackground', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">content.primary (Headings & Titles)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Primary text color"
                    type="color"
                    value={standardTheme.tokens.colors.primaryText}
                    onChange={(e) => handleUpdateColor('primaryText', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="Primary text HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.primaryText}
                    onChange={(e) => handleUpdateColor('primaryText', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                  <span className="text-[11px] font-mono text-muted">
                    {calculateContrastRatio(standardTheme.tokens.colors.primaryText, standardTheme.tokens.colors.pageBackground)}:1
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">content.secondary (Subtitles & Notes)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Secondary text color"
                    type="color"
                    value={standardTheme.tokens.colors.secondaryText}
                    onChange={(e) => handleUpdateColor('secondaryText', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="Secondary text HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.secondaryText}
                    onChange={(e) => handleUpdateColor('secondaryText', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">action.primary (CTA Accent)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="CTA accent color"
                    type="color"
                    value={standardTheme.tokens.colors.accent}
                    onChange={(e) => handleUpdateColor('accent', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="CTA accent HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.accent}
                    onChange={(e) => handleUpdateColor('accent', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">action.primaryText (CTA Label)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="CTA text color"
                    type="color"
                    value={standardTheme.tokens.colors.accentText}
                    onChange={(e) => handleUpdateColor('accentText', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="CTA text HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.accentText}
                    onChange={(e) => handleUpdateColor('accentText', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                  <span className="text-[11px] font-mono text-muted">
                    {calculateContrastRatio(standardTheme.tokens.colors.accentText, standardTheme.tokens.colors.accent)}:1
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">border.default (Dividers & Outlines)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Border color"
                    type="color"
                    value={standardTheme.tokens.colors.border}
                    onChange={(e) => handleUpdateColor('border', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="Border HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.border}
                    onChange={(e) => handleUpdateColor('border', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">focus.ring (Keyboard Indicator)</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Focus ring color"
                    type="color"
                    value={standardTheme.tokens.colors.focusRing}
                    onChange={(e) => handleUpdateColor('focusRing', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line-strong cursor-pointer bg-transparent"
                  />
                  <input
                    aria-label="Focus ring HEX value"
                    type="text"
                    value={standardTheme.tokens.colors.focusRing}
                    onChange={(e) => handleUpdateColor('focusRing', e.target.value)}
                    className="w-28 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                  />
                </div>
              </div>
            </div>

            <details className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-3">
              <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-ink">Advanced semantic token editor</h4>
                  <p className="mt-1 text-[11px] text-muted">Use HEX, RGB or HSL values. Changes are explicit and never silently overwrite brand colors.</p>
                </div>
                <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); generateAccentPalette(); }} className="rounded-lg bg-accent px-3 py-2 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer">Generate accent states</button>
              </summary>
              <div className="pt-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COLOR_TOKEN_LABELS.map(([token, label]) => {
                  const value = standardTheme.tokens.colors[token] || standardTheme.tokens.colors.pageBackground;
                  const defaults = normalizeTheme({}).tokens.colors;
                  return <ColorTokenEditor key={token} token={token} label={label} value={value} defaultValue={defaults[token] || defaults.pageBackground} contrastAgainst={token === 'accentText' ? standardTheme.tokens.colors.accent : token === 'accent' ? standardTheme.tokens.colors.pageBackground : token.includes('Text') ? standardTheme.tokens.colors.pageBackground : standardTheme.tokens.colors.primaryText} onChange={(next) => handleUpdateColor(token, next)} />;
                })}
              </div>
              </div>
            </details>
          </div>
        )}

        {/* Tab 3: Typography */}
        {activeTab === 'typography' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Typography</h3>
                <p className="mt-1 text-[11px] text-muted">Preview real font specimens and configure architectural typographic scales.</p>
              </div>
              <span className="text-[10px] rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-accent font-medium">Curated Catalog</span>
            </div>

            {/* Visual Font Specimen Carousel / Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink">Curated Display Typefaces</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'Syne, ui-sans-serif, system-ui, sans-serif', name: 'Syne', tag: 'Architectural Modern', sample: 'Aa Bb Cc 123', style: { fontFamily: 'Syne, sans-serif' } },
                  { id: 'Plus Jakarta Sans, system-ui, sans-serif', name: 'Plus Jakarta Sans', tag: 'Balanced Editorial', sample: 'Aa Bb Cc 123', style: { fontFamily: 'Plus Jakarta Sans, sans-serif' } },
                  { id: 'Manrope, Inter, ui-sans-serif, sans-serif', name: 'Manrope', tag: 'Clean Geometric', sample: 'Aa Bb Cc 123', style: { fontFamily: 'Manrope, sans-serif' } },
                  { id: 'Inter, ui-sans-serif, system-ui, sans-serif', name: 'Inter', tag: 'Universal Technical', sample: 'Aa Bb Cc 123', style: { fontFamily: 'Inter, sans-serif' } },
                  { id: 'Fraunces, serif', name: 'Fraunces', tag: 'Expressive Serif', sample: 'Aa Bb Cc 123', style: { fontFamily: 'Fraunces, serif' } }
                ].map(font => {
                  const isSelected = standardTheme.tokens.typography.displayFamily.includes(font.name);
                  return (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => handleUpdateTypography('displayFamily', font.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-accent bg-accent/10 ring-1 ring-accent/30 text-ink shadow-xs' 
                          : 'border-line bg-canvas/70 hover:border-line-strong hover:bg-canvas'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink" style={font.style}>{font.name}</span>
                        {isSelected && <span className="text-[10px] font-bold text-accent">Active</span>}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">{font.tag}</div>
                      <div className="mt-2 text-sm text-ink truncate" style={font.style}>{font.sample}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Display Family (Headings)</label>
                <select
                  aria-label="Display font family"
                  value={standardTheme.tokens.typography.displayFamily}
                  onChange={(e) => handleUpdateTypography('displayFamily', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="Syne, ui-sans-serif, system-ui, sans-serif">Syne (Architectural Modern)</option>
                  <option value="Fraunces, serif">Fraunces (Editorial Serif)</option>
                  <option value="Manrope, Inter, ui-sans-serif, sans-serif">Manrope (Clean Geometric)</option>
                  <option value="Plus Jakarta Sans, system-ui, sans-serif">Plus Jakarta Sans (Balanced Sans)</option>
                  <option value="Inter, ui-sans-serif, system-ui, sans-serif">Inter (Universal Technical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Body Family (Prose & Links)</label>
                <select
                  aria-label="Body font family"
                  value={standardTheme.tokens.typography.bodyFamily}
                  onChange={(e) => handleUpdateTypography('bodyFamily', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="Plus Jakarta Sans, system-ui, sans-serif">Plus Jakarta Sans</option>
                  <option value="Inter, ui-sans-serif, system-ui, sans-serif">Inter</option>
                  <option value="sans-serif">System Sans Fallback</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Arabic Family (RTL content)</label>
                <select
                  aria-label="Arabic font family"
                  value={standardTheme.tokens.typography.arabicFamily || 'Noto Kufi Arabic, Tahoma, sans-serif'}
                  onChange={(e) => handleUpdateTypography('arabicFamily', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="Noto Kufi Arabic, Tahoma, sans-serif">Noto Kufi Arabic</option>
                  <option value="Noto Sans Arabic, Tahoma, sans-serif">Noto Sans Arabic</option>
                  <option value="Tajawal, Tahoma, sans-serif">Tajawal</option>
                  <option value="Cairo, Tahoma, sans-serif">Cairo</option>
                  <option value="IBM Plex Sans Arabic, Tahoma, sans-serif">IBM Plex Sans Arabic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Body Font Size</label>
                <select
                  aria-label="Body font size"
                  value={standardTheme.tokens.typography.bodySize}
                  onChange={(e) => handleUpdateTypography('bodySize', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="14px">Small (14px)</option>
                  <option value="16px">Standard (16px / 1rem)</option>
                  <option value="18px">Large (18px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Heading Weight</label>
                <select
                  aria-label="Heading weight"
                  value={standardTheme.tokens.typography.headingWeight}
                  onChange={(e) => handleUpdateTypography('headingWeight', Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value={500}>Medium (500)</option>
                  <option value={600}>Semibold (600)</option>
                  <option value={700}>Bold (700)</option>
                  <option value={800}>Extra Bold (800)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Body Weight</label>
                <select aria-label="Body weight" value={standardTheme.tokens.typography.bodyWeight} onChange={(e) => handleUpdateTypography('bodyWeight', Number(e.target.value))} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  {[300, 400, 500, 600, 700].map(weight => <option key={weight} value={weight}>{weight}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Heading Scale ({Math.round((standardTheme.tokens.typography.headingScale || 1) * 100)}%)</label>
                <input aria-label="Heading scale" type="range" min="75" max="150" value={Math.round((standardTheme.tokens.typography.headingScale || 1) * 100)} onChange={(e) => handleUpdateTypography('headingScale', Number(e.target.value) / 100)} className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Body Scale ({Math.round((standardTheme.tokens.typography.bodyScale || 1) * 100)}%)</label>
                <input aria-label="Body scale" type="range" min="85" max="125" value={Math.round((standardTheme.tokens.typography.bodyScale || 1) * 100)} onChange={(e) => handleUpdateTypography('bodyScale', Number(e.target.value) / 100)} className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Body line height ({standardTheme.tokens.typography.bodyLineHeight})</label>
                <input aria-label="Body line height" type="range" min="110" max="220" value={Math.round(standardTheme.tokens.typography.bodyLineHeight * 100)} onChange={(e) => handleUpdateTypography('bodyLineHeight', Number(e.target.value) / 100)} className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Heading line height ({standardTheme.tokens.typography.headingLineHeight})</label>
                <input aria-label="Heading line height" type="range" min="85" max="180" value={Math.round(standardTheme.tokens.typography.headingLineHeight * 100)} onChange={(e) => handleUpdateTypography('headingLineHeight', Number(e.target.value) / 100)} className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Letter spacing</label>
                <select aria-label="Letter spacing" value={standardTheme.tokens.typography.letterSpacing || '0px'} onChange={(e) => handleUpdateTypography('letterSpacing', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="-0.02em">Tight</option><option value="0px">Normal</option><option value="0.02em">Open</option><option value="0.05em">Wide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Caption size</label>
                <select aria-label="Caption size" value={standardTheme.tokens.typography.captionSize || '12px'} onChange={(e) => handleUpdateTypography('captionSize', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="11px">Small (11px)</option><option value="12px">Standard (12px)</option><option value="14px">Large (14px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Button text size</label>
                <select aria-label="Button text size" value={standardTheme.tokens.typography.buttonTextSize || '14px'} onChange={(e) => handleUpdateTypography('buttonTextSize', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="13px">Small (13px)</option><option value="14px">Standard (14px)</option><option value="16px">Large (16px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Maximum text line length</label>
                <select aria-label="Maximum text line length" value={standardTheme.tokens.typography.maxLineLength || '68ch'} onChange={(e) => handleUpdateTypography('maxLineLength', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="56ch">Compact (56ch)</option><option value="68ch">Comfortable (68ch)</option><option value="78ch">Wide (78ch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Text transform</label>
                <select aria-label="Text transform" value={standardTheme.tokens.typography.textTransform || 'none'} onChange={(e) => handleUpdateTypography('textTransform', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="none">Default case</option><option value="capitalize">Capitalize</option><option value="uppercase">Uppercase</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Brand Kit: shared identity across profiles */}
        {activeTab === 'brand' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Reusable Brand Kit</h3>
                <p className="text-[11px] text-muted mt-1">Shared workspace identity. Applying styles never changes profile content or blocks.</p>
              </div>
              <span className="text-[10px] rounded-full bg-accent/10 px-2 py-1 text-accent">Workspace</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-body mb-1.5">Brand kit name</label>
                <input aria-label="Brand kit name" value={brandKit.name} onChange={(e) => updateBrandKitField('name', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none" />
              </div>
              {([
                ['logoUrl', 'Primary logo URL'], ['lightLogoUrl', 'Light logo URL'], ['darkLogoUrl', 'Dark logo URL'], ['faviconUrl', 'Favicon URL']
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-body mb-1.5">{label}</label>
                  <input aria-label={label} disabled={brandKit.lockedFields?.logo === true} value={brandKit[key] || ''} onChange={(e) => updateBrandKitField(key, e.target.value)} placeholder="https://…" className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50" />
                </div>
              ))}
              {([
                ['primaryColor', 'Primary color'], ['secondaryColor', 'Secondary color'], ['accentColor', 'Accent color']
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-body mb-1.5">{label}</label>
                  <div className="flex gap-2"><input aria-label={`${label} color picker`} disabled={brandKit.lockedFields?.colors === true} type="color" value={brandKit[key]} onChange={(e) => updateBrandKitField(key, e.target.value)} className="h-9 w-10 rounded border border-line bg-canvas disabled:opacity-50" /><input aria-label={`${label} value`} disabled={brandKit.lockedFields?.colors === true} value={brandKit[key]} onChange={(e) => updateBrandKitField(key, e.target.value)} className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50" /></div>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Latin font</label>
                <select aria-label="Latin font" disabled={brandKit.lockedFields?.fonts === true} value={brandKit.latinFont} onChange={(e) => updateBrandKitField('latinFont', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"><option>Inter, ui-sans-serif, system-ui, sans-serif</option><option>Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif</option><option>DM Sans, ui-sans-serif, system-ui, sans-serif</option><option>Syne, Inter, ui-sans-serif, sans-serif</option></select>
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Arabic font</label>
                <select aria-label="Arabic font" disabled={brandKit.lockedFields?.fonts === true} value={brandKit.arabicFont} onChange={(e) => updateBrandKitField('arabicFont', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"><option>Noto Kufi Arabic, Tahoma, sans-serif</option><option>Tajawal, Tahoma, sans-serif</option><option>IBM Plex Sans Arabic, Tahoma, sans-serif</option></select>
              </div>
              <div><label className="block text-xs font-medium text-body mb-1.5">Button style</label><select value={brandKit.buttonStyle} onChange={(e) => updateBrandKitField('buttonStyle', e.target.value as BrandKit['buttonStyle'])} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"><option value="filled">Filled</option><option value="outline">Outline</option><option value="soft">Soft</option><option value="pill">Pill</option></select></div>
              <div><label className="block text-xs font-medium text-body mb-1.5">Image style</label><select value={brandKit.imageStyle} onChange={(e) => updateBrandKitField('imageStyle', e.target.value as BrandKit['imageStyle'])} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"><option value="rounded">Rounded</option><option value="full-bleed">Full bleed</option><option value="polaroid">Polaroid</option></select></div>
              <div><label className="block text-xs font-medium text-body mb-1.5">Social icon style</label><select value={brandKit.socialIconStyle} onChange={(e) => updateBrandKitField('socialIconStyle', e.target.value as BrandKit['socialIconStyle'])} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"><option value="line">Line</option><option value="filled">Filled</option><option value="minimal">Minimal</option></select></div>
            </div>
            <div className="rounded-xl border border-line bg-canvas/60 p-3">
              <p className="text-[11px] font-semibold text-ink">Agency/team editing controls</p>
              <p className="mt-1 text-[11px] text-muted">Lock brand foundations so collaborators can edit content without drifting from the approved identity.</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                {([['logo', 'Lock logos'], ['colors', 'Lock colors'], ['fonts', 'Lock fonts'], ['spacing', 'Lock spacing']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={brandKit.lockedFields?.[key] === true} onChange={(e) => updateBrandKitField('lockedFields', { ...(brandKit.lockedFields || {}), [key]: e.target.checked })} /> {label}</label>)}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-medium text-body">Collaborator editing mode
                  <select aria-label="Collaborator editing mode" value={brandKit.editingMode || 'full'} onChange={(e) => updateBrandKitField('editingMode', e.target.value as BrandKit['editingMode'])} className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink focus:outline-none">
                    <option value="full">Full theme editing</option>
                    <option value="content-only">Content-only editing</option>
                    <option value="selected-overrides">Selected theme overrides</option>
                  </select>
                </label>
                {brandKit.editingMode === 'selected-overrides' && <div className="rounded-lg border border-line bg-surface p-2.5 text-[10px] text-muted">
                  <p className="font-semibold text-ink">Allowed theme overrides</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([['colors', 'Colors'], ['fonts', 'Fonts'], ['spacing', 'Spacing'], ['background', 'Background'], ['layout', 'Layout'], ['components', 'Components']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-1.5"><input type="checkbox" checked={(brandKit.allowedThemeOverrides || []).includes(key)} onChange={(e) => { const current = new Set(brandKit.allowedThemeOverrides || []); if (e.target.checked) current.add(key); else current.delete(key); updateBrandKitField('allowedThemeOverrides', Array.from(current)); }} /> {label}</label>)}
                  </div>
                </div>}
              </div>
              <p className="mt-3 text-[10px] text-subtle">These rules are enforced when themes are applied or edited, including imported themes and saved presets.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
              <p className="text-[11px] text-muted">Use this kit on the current profile without replacing its name, bio, links, pages, or blocks.</p>
              <button type="button" onClick={applyBrandKitToTheme} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer">Apply styles to this profile</button>
            </div>
          </div>
        )}

        {/* Background controls */}
        {activeTab === 'background' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Background</h3>
              <span className="text-[11px] text-muted">Solid, Gradient, Pattern, Image, Video</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Background Type</label>
                <div className="flex items-center gap-2">
                  {(['solid', 'gradient', 'pattern', 'image', 'video'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleUpdateBackground('type', type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer border ${
                        backgroundControls.type === type
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-canvas border-line text-muted hover:text-ink'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {backgroundControls.type === 'gradient' && (
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Gradient Formula</label>
                  <select
                    value={backgroundControls.gradientStops || 'linear-gradient(135deg, #090e1a 0%, #111a33 100%)'}
                    onChange={(e) => handleUpdateBackground('gradientStops', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                  >
                    <option value="linear-gradient(135deg, #090e1a 0%, #111a33 100%)">Midnight Indigo Deep</option>
                    <option value="linear-gradient(180deg, #18181b 0%, #09090b 100%)">Onyx Dual Depth</option>
                    <option value="linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)">Cosmic Horizon</option>
                    <option value="linear-gradient(135deg, #061a14 0%, #022c22 100%)">Emerald Mist</option>
                  </select>
                </div>
              )}

              {backgroundControls.type === 'pattern' && (
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Pattern texture</label>
                  <select value={backgroundControls.gradientStops || 'radial-gradient(circle at 1px 1px, rgba(99,102,241,.22) 1px, transparent 1px)'} onChange={(e) => handleUpdateBackground('gradientStops', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                    <option value="radial-gradient(circle at 1px 1px, rgba(99,102,241,.22) 1px, transparent 1px)">Accent dot grid</option>
                    <option value="repeating-linear-gradient(135deg, rgba(99,102,241,.12) 0 1px, transparent 1px 12px)">Diagonal line texture</option>
                    <option value="radial-gradient(circle at 30% 20%, rgba(255,255,255,.16), transparent 28%), radial-gradient(circle at 80% 80%, rgba(99,102,241,.18), transparent 32%)">Soft editorial texture</option>
                  </select>
                  <p className="mt-1 text-[11px] text-subtle">Patterns are generated from safe CSS gradients and do not load external stylesheets.</p>
                </div>
              )}

              {backgroundControls.type === 'image' && (
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Background Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={backgroundControls.assetUrl || ''}
                      onChange={(e) => handleUpdateBackground('assetUrl', e.target.value)}
                      className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                    />
                    <button type="button" onClick={() => backgroundInputRef.current?.click()} disabled={isUploadingBackground} className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer">
                      {isUploadingBackground ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  <input ref={backgroundInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBackgroundUpload(file); }} />
                  {backgroundUploadError && <p role="alert" className="text-[11px] text-danger mt-2">{backgroundUploadError}</p>}
                  <p className="text-[11px] text-subtle mt-1">JPG, PNG, WebP, GIF or AVIF up to 50 MB.</p>
                  <p className="text-[11px] text-subtle mt-1">The uploaded image is layered with a gradient sampled from its accent colors. Fallback: {backgroundControls.fallbackColor}.</p>
                </div>
              )}

              {backgroundControls.type === 'video' && (
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Background Video</label>
                  <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste a video URL or upload a file"
                    value={backgroundControls.assetUrl || ''}
                    onChange={(e) => handleUpdateBackground('assetUrl', e.target.value)}
                    className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                  />
                    <button type="button" onClick={() => backgroundInputRef.current?.click()} disabled={isUploadingBackground} className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer">
                      {isUploadingBackground ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  <input ref={backgroundInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBackgroundUpload(file); }} />
                  {backgroundUploadError && <p role="alert" className="text-[11px] text-danger mt-2">{backgroundUploadError}</p>}
                  <p className="text-[11px] text-subtle mt-1">MP4, WebM or MOV up to 50 MB. Videos play muted and loop on public pages.</p>
                </div>
              )}

              {(backgroundControls.type === 'image' || backgroundControls.type === 'video') && (
                <div className="rounded-xl border border-line bg-canvas/60 p-3 space-y-2">
                  <label className="block text-xs font-medium text-body">Mobile background asset</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={backgroundControls.type === 'video' ? 'Paste a mobile video URL or upload a file' : 'Paste a mobile image URL or upload a file'}
                      value={backgroundControls.mobileAssetUrl || ''}
                      onChange={(e) => handleUpdateBackground('mobileAssetUrl', e.target.value)}
                      className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                    />
                    <button type="button" onClick={() => mobileBackgroundInputRef.current?.click()} disabled={isUploadingBackground} className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer">
                      Upload mobile
                    </button>
                  </div>
                  <input ref={mobileBackgroundInputRef} type="file" accept={backgroundControls.type === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif,image/avif'} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBackgroundUpload(file, 'mobile'); }} />
                  <p className="text-[10px] text-subtle">When supplied, this asset is used below 640px; otherwise the desktop asset is reused.</p>
                </div>
              )}

              {(backgroundControls.type === 'image' || backgroundControls.type === 'video') && (
                <div className="rounded-xl border border-line bg-canvas/70 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink">Find a background on Pexels</p>
                      <p className="text-[11px] text-subtle">Free photos and videos with creator attribution.</p>
                    </div>
                    <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline">Pexels</a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="search"
                      value={pexelsQuery}
                      onChange={(e) => setPexelsQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void searchPexels(); }}
                      placeholder={backgroundControls.type === 'video' ? 'ambient clouds' : 'editorial studio'}
                      className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      aria-label="Search Pexels backgrounds"
                    />
                    <button type="button" onClick={() => void searchPexels()} disabled={isSearchingPexels || !pexelsQuery.trim()} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer">
                      {isSearchingPexels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Search
                    </button>
                  </div>
                  {pexelsError && <p role="alert" className="text-[11px] text-danger">{pexelsError}</p>}
                  {pexelsResults.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Pexels background results">
                        {pexelsResults.map(media => (
                          <div key={`${media.kind}-${media.id}`} className="overflow-hidden rounded-lg border border-line bg-surface">
                            <div className="relative">
                              {media.kind === 'video' ? <video src={media.assetUrl} poster={media.thumbnail || undefined} muted autoPlay loop playsInline preload="auto" className="h-20 w-full object-cover" aria-label={`Video by ${media.photographer} on Pexels`} /> : <img src={media.thumbnail || media.assetUrl} alt={`Photo by ${media.photographer} on Pexels`} loading="lazy" className="h-20 w-full object-cover" />}
                              <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-2 py-1 text-[9px] text-white">Photo by {media.photographer}</span>
                            </div>
                            <div className="flex gap-1 p-1.5">
                              <button type="button" onClick={() => previewPexelsMedia(media)} disabled={isApplyingPexels} className="min-h-7 flex-1 rounded-md border border-line px-1.5 py-1 text-[10px] font-semibold text-ink hover:bg-canvas disabled:cursor-wait disabled:opacity-60">Preview</button>
                              <button type="button" onClick={() => void applyPexelsMedia(media)} disabled={isApplyingPexels} className="min-h-7 flex-1 rounded-md bg-indigo-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60">{isApplyingPexels ? 'Saving…' : 'Apply'}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-[10px] text-subtle">Showing {pexelsResults.length}{pexelsTotal ? ` of ${pexelsTotal}` : ''} results</span>
                        {pexelsPage > 0 && pexelsPage < 50 && pexelsResults.length < pexelsTotal && (
                          <button type="button" onClick={() => void loadMorePexels()} disabled={isLoadingMorePexels || isApplyingPexels} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-surface disabled:cursor-wait disabled:opacity-60">
                            {isLoadingMorePexels ? 'Loading…' : 'Load more'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  <p className="text-[10px] text-subtle">Preview changes the theme locally. Apply saves the selected asset to this profile. Attribution remains visible and links to Pexels.</p>
                </div>
              )}

              {(backgroundControls.type === 'image' || backgroundControls.type === 'video') && (
                <div className="rounded-xl border border-line bg-canvas/60 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink">Workspace background library</p>
                      <p className="text-[11px] text-subtle">Reuse validated uploads across profiles without uploading again.</p>
                    </div>
                    {isLoadingBackgroundAssets && <Loader2 className="w-4 h-4 animate-spin text-muted" aria-label="Loading background library" />}
                  </div>
                  {backgroundAssetsError ? (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger-surface px-3 py-2 text-[11px] text-danger">
                      <span>{backgroundAssetsError}</span>
                      <button type="button" onClick={() => void refreshBackgroundAssets()} className="rounded-md border border-danger/30 px-2 py-1 font-semibold hover:bg-danger/10 cursor-pointer">Retry</button>
                    </div>
                  ) : !isLoadingBackgroundAssets && backgroundAssets.length === 0 ? (
                    <p className="text-[11px] text-subtle">No uploaded backgrounds yet. Upload an image or video to add the first asset.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Workspace background library">
                      {backgroundAssets.filter(asset => asset.kind === backgroundControls.type).map(asset => (
                        <div key={asset.id} className="group relative overflow-hidden rounded-lg border border-line bg-surface">
                          {asset.kind === 'video' ? <video src={asset.assetUrl} muted playsInline preload="metadata" className="h-20 w-full object-cover" /> : <img src={asset.assetUrl} alt="Uploaded background" loading="lazy" className="h-20 w-full object-cover" />}
                          <div className="flex items-center justify-between gap-1 p-1.5">
                            <button type="button" onClick={() => applyLibraryAsset(asset)} className="min-w-0 flex-1 truncate rounded bg-accent px-1.5 py-1 text-[10px] font-semibold text-white hover:opacity-90 cursor-pointer">Use</button>
                            <button type="button" onClick={() => void deleteLibraryAsset(asset)} aria-label="Delete background asset" className="rounded border border-danger/30 px-1.5 py-1 text-[10px] font-semibold text-danger hover:bg-danger/10 cursor-pointer">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(backgroundControls.type === 'image' || backgroundControls.type === 'video') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-line bg-canvas/60 p-3">
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Media fit</label>
                    <select value={backgroundControls.fit || 'cover'} onChange={(e) => handleUpdateBackground('fit', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"><option value="cover">Cover</option><option value="contain">Contain</option><option value="natural">Natural</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Focal position</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] text-muted">X <input aria-label="Background horizontal position" type="range" min="0" max="100" value={backgroundControls.focalPoint?.x ?? 50} onChange={(e) => handleUpdateBackground('focalPoint', { ...(backgroundControls.focalPoint || { x: 50, y: 50 }), x: Number(e.target.value) })} className="flex-1 accent-indigo-500" /><span className="w-8 text-right font-mono">{Math.round(backgroundControls.focalPoint?.x ?? 50)}%</span></label>
                      <label className="flex items-center gap-2 text-[11px] text-muted">Y <input aria-label="Background vertical position" type="range" min="0" max="100" value={backgroundControls.focalPoint?.y ?? 50} onChange={(e) => handleUpdateBackground('focalPoint', { ...(backgroundControls.focalPoint || { x: 50, y: 50 }), y: Number(e.target.value) })} className="flex-1 accent-indigo-500" /><span className="w-8 text-right font-mono">{Math.round(backgroundControls.focalPoint?.y ?? 50)}%</span></label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Overlay color</label>
                    <div className="flex gap-2"><input type="color" value={backgroundControls.overlayColor || '#000000'} onChange={(e) => handleUpdateBackground('overlayColor', e.target.value)} className="h-9 w-10 rounded border border-line bg-surface" /><input value={backgroundControls.overlayColor || '#000000'} onChange={(e) => handleUpdateBackground('overlayColor', e.target.value)} className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none" /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Fallback color</label>
                    <div className="flex gap-2"><input type="color" value={backgroundControls.fallbackColor || standardTheme.tokens.colors.pageBackground} onChange={(e) => handleUpdateBackground('fallbackColor', e.target.value)} className="h-9 w-10 rounded border border-line bg-surface" /><input value={backgroundControls.fallbackColor || standardTheme.tokens.colors.pageBackground} onChange={(e) => handleUpdateBackground('fallbackColor', e.target.value)} className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink font-mono focus:outline-none" /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Background blur ({backgroundControls.blur || 0}px)</label>
                    <input type="range" min="0" max="24" value={backgroundControls.blur || 0} onChange={(e) => handleUpdateBackground('blur', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Background zoom ({Math.round((backgroundControls.scale || 1) * 100)}%)</label>
                    <div className="flex items-center gap-2"><button type="button" aria-label="Zoom background out" onClick={() => adjustBackgroundScale(-0.05)} disabled={(backgroundControls.scale || 1) <= 1} className="min-h-10 min-w-10 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40">−</button><input aria-label="Background zoom" type="range" min="100" max="200" value={Math.round((backgroundControls.scale || 1) * 100)} onChange={(e) => handleUpdateBackground('scale', Number(e.target.value) / 100)} className="flex-1 accent-indigo-500 cursor-pointer" /><button type="button" aria-label="Zoom background in" onClick={() => adjustBackgroundScale(0.05)} disabled={(backgroundControls.scale || 1) >= 2} className="min-h-10 min-w-10 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40">+</button></div>
                  </div>
                  {backgroundControls.type === 'video' && <>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-body mb-1.5">Video poster image URL</label><input value={backgroundControls.posterUrl || ''} onChange={(e) => handleUpdateBackground('posterUrl', e.target.value)} placeholder="https://…" className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none" /></div>
                    <div><label className="block text-xs font-medium text-body mb-1.5">Reduced-motion fallback</label><select value={backgroundControls.reducedMotionFallback || 'poster'} onChange={(e) => handleUpdateBackground('reducedMotionFallback', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"><option value="poster">Poster image</option><option value="image">Image background</option><option value="solid">Fallback color</option></select></div>
                    <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-muted"><label className="flex items-center gap-2"><input type="checkbox" checked={backgroundControls.autoplay !== false} onChange={(e) => handleUpdateBackground('autoplay', e.target.checked)} /> Autoplay</label><label className="flex items-center gap-2"><input type="checkbox" checked={backgroundControls.loop !== false} onChange={(e) => handleUpdateBackground('loop', e.target.checked)} /> Loop</label><label className="flex items-center gap-2"><input type="checkbox" checked={backgroundControls.muted !== false} onChange={(e) => handleUpdateBackground('muted', e.target.checked)} /> Muted</label></div>
                  </>}
                  {backgroundControls.assetUrl && <button type="button" onClick={() => void handleClearBackground()} className="sm:col-span-2 justify-self-start rounded-lg border border-danger/40 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 cursor-pointer">Remove background asset</button>}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-body">Dark Overlay Contrast Scrim</label>
                  <span className="text-[11px] text-muted font-mono">
                    {Math.round((backgroundControls.overlay ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={backgroundControls.overlay ?? 0}
                  onChange={(e) => handleUpdateBackground('overlay', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Layout & Geometry */}
        {activeTab === 'layout' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Shape & spacing</h3>
              <span className="text-[11px] text-muted">Pixels scale</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-body">Layout template</label>
                  <span className="text-[10px] text-subtle">Appearance and composition only</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LAYOUT_TEMPLATES.map(template => {
                    const isSelected = standardTheme.layout?.templateId === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyLayoutTemplate(template)}
                        className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected 
                            ? 'border-accent bg-accent/10 ring-1 ring-accent/30 text-ink shadow-xs' 
                            : 'border-line bg-canvas/70 hover:border-line-strong hover:bg-canvas'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="block text-xs font-bold text-ink">{template.name}</span>
                            <span className="mt-0.5 block text-[10px] text-muted">{template.goal}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">Selected</span>
                          )}
                        </div>

                        {/* Visual mini-wireframe preview */}
                        <div className="mt-3 h-8 w-full rounded-md border border-line/80 bg-surface/80 p-1 flex flex-col justify-center gap-1">
                          <div className={`h-1.5 rounded-full bg-muted/40 ${template.alignment === 'center' ? 'mx-auto w-12' : 'w-10'}`} />
                          <div className="flex gap-1 justify-center items-center">
                            <div className="h-2 rounded-xs bg-accent/30 flex-1" />
                            <div className="h-2 rounded-xs bg-muted/20 flex-1" />
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1">
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted uppercase tracking-wider">{template.headerStyle}</span>
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted uppercase tracking-wider">{template.alignment}</span>
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted uppercase tracking-wider">{template.navigationStyle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Content language</label>
                  <select aria-label="Content language" value={standardTheme.language || 'en'} onChange={(e) => updateStandardTheme(prev => ({ ...prev, language: e.target.value as 'en' | 'ar' | 'auto' }))} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="auto">Auto / future locale detection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Text direction</label>
                  <select aria-label="Text direction" value={standardTheme.direction || 'ltr'} onChange={(e) => updateStandardTheme(prev => ({ ...prev, direction: e.target.value as 'ltr' | 'rtl' | 'auto' }))} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                    <option value="ltr">Left-to-right</option>
                    <option value="rtl">Right-to-left</option>
                    <option value="auto">Automatic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-ink">Conversion goal</h4>
                <p className="mt-1 text-[11px] text-muted">The renderer uses this goal and CTA priority to make the next action obvious without changing your content.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-body mb-1.5">Primary visitor goal</label>
                  <select aria-label="Primary visitor goal" value={standardTheme.conversion?.goal || 'contact'} onChange={(e) => handleUpdateConversion('goal', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                    <option value="contact">Contact me</option><option value="book">Book an appointment</option><option value="buy">Buy a product</option><option value="portfolio">View my work</option><option value="newsletter">Join my newsletter</option><option value="whatsapp">Visit WhatsApp</option><option value="download">Download something</option><option value="social">Follow social channels</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-body mb-1.5">CTA placement</label>
                  <select aria-label="CTA placement" value={standardTheme.layout?.ctaPosition || 'priority-order'} onChange={(e) => handleUpdateLayout('ctaPosition', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"><option value="first">First after header</option><option value="after-header">After profile header</option><option value="priority-order">Use block priorities</option></select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-[11px] font-medium text-body">Primary CTA block
                  <select value={standardTheme.conversion?.primaryBlockId || ''} onChange={(e) => handleUpdateConversion('primaryBlockId', e.target.value || null)} className="mt-1.5 w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                    <option value="">Use theme priority order</option>
                    {activeProfile.tabs.flatMap(tab => tab.blocks).map(block => <option key={block.id} value={block.id}>{block.title || block.type}</option>)}
                  </select>
                </label>
                <label className="block text-[11px] font-medium text-body">Secondary CTA block
                  <select value={standardTheme.conversion?.secondaryBlockId || ''} onChange={(e) => handleUpdateConversion('secondaryBlockId', e.target.value || null)} className="mt-1.5 w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                    <option value="">None</option>
                    {activeProfile.tabs.flatMap(tab => tab.blocks).map(block => <option key={block.id} value={block.id}>{block.title || block.type}</option>)}
                  </select>
                </label>
              </div>
              {standardTheme.conversion?.goal === 'whatsapp' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input value={standardTheme.conversion.whatsappCountryCode || ''} onChange={(e) => handleUpdateConversion('whatsappCountryCode', e.target.value)} placeholder="Country code, e.g. +966" className="px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none" /><input value={standardTheme.conversion.whatsappMessage || ''} onChange={(e) => handleUpdateConversion('whatsappMessage', e.target.value)} placeholder="Prefilled message" className="px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none" /><input value={standardTheme.conversion.whatsappTrackingParameter || ''} onChange={(e) => handleUpdateConversion('whatsappTrackingParameter', e.target.value)} placeholder="Tracking parameter, e.g. theme_studio" className="px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none" /><input value={standardTheme.conversion.businessHours || ''} onChange={(e) => handleUpdateConversion('businessHours', e.target.value)} placeholder="Business hours, e.g. Sun–Thu 09:00–17:00" className="px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none" /></div>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Content Width</label>
                <select value={standardTheme.layout?.maxWidth || '680px'} onChange={(e) => handleUpdateLayout('maxWidth', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="560px">Narrow editorial (560px)</option>
                  <option value="640px">Compact (640px)</option>
                  <option value="680px">Standard (680px)</option>
                  <option value="720px">Wide (720px)</option>
                  <option value="860px">Full (860px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Profile Alignment</label>
                <select value={standardTheme.layout?.alignment || 'center'} onChange={(e) => handleUpdateLayout('alignment', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="center">Centered</option>
                  <option value="left">Left aligned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Header Composition</label>
                <select value={standardTheme.layout?.headerStyle || 'standard'} onChange={(e) => handleUpdateLayout('headerStyle', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="standard">Standard</option>
                  <option value="hero">Hero / expressive</option>
                  <option value="compact">Compact / service-led</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Block Width</label>
                <select value={standardTheme.layout?.blockWidth || 'full'} onChange={(e) => handleUpdateLayout('blockWidth', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="full">Full width</option>
                  <option value="narrow">Narrow cards</option>
                  <option value="mixed">Mixed editorial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Navigation position</label>
                <select value={standardTheme.layout?.navigationPosition || 'below-header'} onChange={(e) => handleUpdateLayout('navigationPosition', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="top">Top of page</option><option value="below-header">Below profile header</option><option value="bottom">Bottom of page</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2">
                <input
                  type="checkbox"
                  checked={standardTheme.layout?.showFooter !== false}
                  onChange={(e) => handleUpdateLayout('showFooter', e.target.checked)}
                />
                Show LynkFlow footer and report-page action
              </label>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Section grouping</label>
                <select value={standardTheme.layout?.sectionGrouping || 'flat'} onChange={(e) => handleUpdateLayout('sectionGrouping', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="flat">Flat stack</option><option value="grouped">Grouped surfaces</option><option value="editorial">Editorial sections</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Section background</label>
                <div className="flex gap-2"><input type="color" value={standardTheme.layout?.sectionBackground || standardTheme.tokens.colors.panelBackground} onChange={(e) => handleUpdateLayout('sectionBackground', e.target.value)} className="h-9 w-10 rounded border border-line bg-canvas" /><input value={standardTheme.layout?.sectionBackground || standardTheme.tokens.colors.panelBackground} onChange={(e) => handleUpdateLayout('sectionBackground', e.target.value)} className="min-w-0 flex-1 px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink font-mono focus:outline-none" /></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Section divider</label>
                <select value={standardTheme.layout?.sectionDivider || 'none'} onChange={(e) => handleUpdateLayout('sectionDivider', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="none">None</option><option value="line">Subtle line</option><option value="accent">Accent line</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Image placement</label>
                <select value={standardTheme.layout?.imagePlacement || 'inline'} onChange={(e) => handleUpdateLayout('imagePlacement', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="inline">Inline media</option><option value="full-bleed">Full bleed media</option><option value="alternating">Alternating media</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Social icon placement</label>
                <select value={standardTheme.layout?.socialIconPlacement || 'header'} onChange={(e) => handleUpdateLayout('socialIconPlacement', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="header">Profile header</option><option value="footer">Page footer</option><option value="inline">Inline with content</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Link Surface Variant</label>
                <select value={standardTheme.componentVariants?.link || 'solid'} onChange={(e) => handleUpdateVariant('link', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="solid">Solid</option>
                  <option value="outline">Editorial outline</option>
                  <option value="soft-card">Soft card</option>
                  <option value="image-card">Thumbnail card</option>
                  <option value="glass">Frosted glass</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Media Presentation</label>
                <select value={standardTheme.componentVariants?.image || 'rounded'} onChange={(e) => handleUpdateVariant('image', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="rounded">Rounded image</option>
                  <option value="full-bleed">Full bleed</option>
                  <option value="polaroid">Polaroid editorial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Avatar Shape</label>
                <select value={standardTheme.profile?.avatarShape || 'circle'} onChange={(e) => handleUpdateThemeSection('profile', 'avatarShape', e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="circle">Circle</option>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                </select>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={standardTheme.profile?.showAvatar !== false} onChange={(e) => handleUpdateThemeSection('profile', 'showAvatar', e.target.checked)} /> Show avatar</label>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Social Icon Style</label>
                <select value={standardTheme.socialIcons?.style || standardTheme.componentVariants?.socialIcons || 'line'} onChange={(e) => { handleUpdateThemeSection('socialIcons', 'style', e.target.value); handleUpdateVariant('socialIcons', e.target.value); }} className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none">
                  <option value="line">Line</option>
                  <option value="filled">Filled</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Social Icon Size ({standardTheme.socialIcons?.size || 36}px)</label>
                <input type="range" min="28" max="56" value={standardTheme.socialIcons?.size || 36} onChange={(e) => handleUpdateThemeSection('socialIcons', 'size', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-muted">
                <label className="flex items-center gap-2"><input type="checkbox" checked={standardTheme.effects?.grain ?? false} onChange={(e) => handleUpdateThemeSection('effects', 'grain', e.target.checked)} /> Grain texture</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={standardTheme.effects?.glow ?? false} onChange={(e) => handleUpdateThemeSection('effects', 'glow', e.target.checked)} /> Surface glow</label>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Button blur ({standardTheme.buttons?.blur || 0}px)</label>
                <input type="range" min="0" max="24" value={standardTheme.buttons?.blur || 0} onChange={(e) => handleUpdateThemeSection('buttons', 'blur', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Card blur ({standardTheme.cards?.blur || 0}px)</label>
                <input type="range" min="0" max="24" value={standardTheme.cards?.blur || 0} onChange={(e) => handleUpdateThemeSection('cards', 'blur', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Button Corner Radius ({standardTheme.tokens.shape.buttonRadius}px)</label>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={standardTheme.tokens.shape.buttonRadius}
                  onChange={(e) => handleUpdateShape('buttonRadius', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Card Container Radius ({standardTheme.tokens.shape.cardRadius}px)</label>
                <input
                  type="range"
                  min="0"
                  max="36"
                  value={standardTheme.tokens.shape.cardRadius}
                  onChange={(e) => handleUpdateShape('cardRadius', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Block Gap Vertical ({standardTheme.tokens.spacing.blockGap}px)</label>
                <input
                  type="range"
                  min="8"
                  max="28"
                  value={standardTheme.tokens.spacing.blockGap}
                  onChange={(e) => handleUpdateSpacing('blockGap', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Header Avatar Radius ({standardTheme.tokens.shape.avatarRadius}px)</label>
                <input
                  type="range"
                  min="0"
                  max="999"
                  value={standardTheme.tokens.shape.avatarRadius}
                  onChange={(e) => handleUpdateShape('avatarRadius', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-canvas/60 p-3 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-ink">Responsive overrides</h4>
                <p className="text-[11px] text-muted mt-1">Tune page padding and block rhythm independently for small mobile, mobile, tablet, and desktop.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['smallMobile', 'mobile', 'tablet', 'desktop'] as const).map(viewport => {
                  const viewportRules = standardTheme.responsive[viewport] || standardTheme.responsive.mobile;
                  return (
                  <div key={viewport} className="rounded-lg border border-line bg-surface p-3 space-y-2">
                    <div className="text-[11px] font-semibold capitalize text-ink">{viewport === 'smallMobile' ? 'Small mobile' : viewport}</div>
                    <label className="block text-[10px] text-muted">Horizontal padding ({viewportRules.pageX}px)</label>
                    <input aria-label={`${viewport} horizontal padding`} type="range" min="8" max="48" value={viewportRules.pageX} onChange={(e) => handleUpdateResponsive(viewport, 'pageX', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                    <label className="block text-[10px] text-muted">Vertical padding ({viewportRules.pageY}px)</label>
                    <input aria-label={`${viewport} vertical padding`} type="range" min="8" max="64" value={viewportRules.pageY} onChange={(e) => handleUpdateResponsive(viewport, 'pageY', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                    <label className="block text-[10px] text-muted">Block gap ({viewportRules.blockGap}px)</label>
                    <input aria-label={`${viewport} block gap`} type="range" min="6" max="36" value={viewportRules.blockGap} onChange={(e) => handleUpdateResponsive(viewport, 'blockGap', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                    <label className="block text-[10px] text-muted">Avatar size ({viewportRules.avatarSize || 88}px)</label>
                    <input aria-label={`${viewport} avatar size`} type="range" min="48" max="140" value={viewportRules.avatarSize || 88} onChange={(e) => handleUpdateResponsive(viewport, 'avatarSize', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                    <label className="block text-[10px] text-muted">Heading scale ({Math.round((viewportRules.headingScale || 1) * 100)}%)</label>
                    <input aria-label={`${viewport} heading scale`} type="range" min="75" max="160" value={Math.round((viewportRules.headingScale || 1) * 100)} onChange={(e) => handleUpdateResponsive(viewport, 'headingScale', Number(e.target.value) / 100)} className="w-full accent-indigo-500 cursor-pointer" />
                    <label className="block text-[10px] text-muted">Media height ({viewportRules.imageHeight || 320}px)</label>
                    <input aria-label={`${viewport} media height`} type="range" min="120" max="720" step="10" value={viewportRules.imageHeight || 320} onChange={(e) => handleUpdateResponsive(viewport, 'imageHeight', Number(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                    <label className="block text-[10px] text-muted">Text alignment</label>
                    <select aria-label={`${viewport} text alignment`} value={viewportRules.textAlign || 'center'} onChange={(e) => handleUpdateResponsive(viewport, 'textAlign', e.target.value)} className="w-full rounded-md border border-line bg-canvas px-2 py-1 text-[10px] text-ink"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
                    <label className="block text-[10px] text-muted">Navigation</label>
                    <select aria-label={`${viewport} navigation position`} value={viewportRules.navigationPosition || 'below-header'} onChange={(e) => handleUpdateResponsive(viewport, 'navigationPosition', e.target.value)} className="w-full rounded-md border border-line bg-canvas px-2 py-1 text-[10px] text-ink"><option value="top">Top</option><option value="below-header">Below header</option><option value="bottom">Bottom</option></select>
                    <label className="block text-[10px] text-muted">Block visibility</label>
                    <select aria-label={`${viewport} block visibility`} value={viewportRules.blockVisibility || 'all'} onChange={(e) => handleUpdateResponsive(viewport, 'blockVisibility', e.target.value)} className="w-full rounded-md border border-line bg-canvas px-2 py-1 text-[10px] text-ink"><option value="all">All blocks</option><option value="hide-media">Hide media</option><option value="hide-socials">Hide socials</option></select>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Block defaults */}
        {activeTab === 'blocks' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Block defaults</h3>
              <span className="text-[11px] text-muted">Controls default block styling</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Link Block Variant</label>
                <select
                  value={standardTheme.blockDefaults?.link?.variant || 'filled'}
                  onChange={(e) => handleUpdateBlockDefaults('link', 'variant', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="filled">Filled Surface</option>
                  <option value="outline">Outline Border</option>
                  <option value="glass">Frosted Glass</option>
                  <option value="soft">Soft Muted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Link Min Height ({standardTheme.blockDefaults?.link?.height || 56}px)</label>
                <input
                  type="range"
                  min="44"
                  max="76"
                  value={standardTheme.blockDefaults?.link?.height || 56}
                  onChange={(e) => handleUpdateBlockDefaults('link', 'height', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Text Block Alignment</label>
                <select
                  value={standardTheme.blockDefaults?.text?.alignment || 'left'}
                  onChange={(e) => handleUpdateBlockDefaults('text', 'alignment', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Hover Animation</label>
                <select
                  value={standardTheme.tokens.motion.hoverEffect || 'lift'}
                  onChange={(e) => updateStandardTheme(prev => ({
                    ...prev,
                    tokens: {
                      ...prev.tokens,
                      motion: {
                        ...prev.tokens.motion,
                        hoverEffect: e.target.value as StandardTheme['tokens']['motion']['hoverEffect']
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="lift">Lift Up</option>
                  <option value="scale">Subtle Scale</option>
                  <option value="glow">Accent Glow</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Accessibility audit */}
        {activeTab === 'accessibility' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Accessibility Gatekeeper (WCAG AA)</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                a11y.canPublish ? 'bg-emerald-500/20 text-success' : 'bg-rose-500/20 text-danger'
              }`}>
                {a11y.canPublish ? 'PASS' : 'BLOCKING'}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-canvas/60 p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-ink">Theme quality score</p><p className="mt-1 text-[11px] text-muted">Explainable readiness score; each category links to findings below.</p></div><span className={`text-xl font-bold ${qualityScore.overall >= 90 ? 'text-success' : qualityScore.overall >= 75 ? 'text-warning' : 'text-danger'}`}>{qualityScore.overall}</span></div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {qualityScore.categories.map(category => {
                  const targetTab: StudioTab = category.id === 'accessibility' ? 'accessibility' : category.id === 'mobile' ? 'layout' : category.id === 'brand' ? 'brand' : category.id === 'conversion' ? 'layout' : 'background';
                  return (
                    <div key={category.id} className="rounded-lg border border-line bg-surface p-2">
                      <button type="button" onClick={() => openStudioTab(targetTab)} className="flex w-full items-center justify-between gap-2 text-left cursor-pointer" aria-label={`Review ${category.label} findings`}>
                        <span className="text-[10px] font-semibold text-ink">{category.label}</span>
                        <span className={`font-mono text-[10px] ${category.score >= 90 ? 'text-success' : category.score >= 75 ? 'text-warning' : 'text-danger'}`}>{category.score}/100</span>
                      </button>
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[10px] text-accent hover:underline">View {category.findings.length || 1} finding{category.findings.length === 1 ? '' : 's'}</summary>
                        <ul className="mt-1.5 space-y-1 pl-3 text-[10px] leading-snug text-subtle">
                          {(category.findings.length ? category.findings : ['No findings recorded.']).map((finding, index) => <li key={`${category.id}-${index}`} className="list-disc">{finding}</li>)}
                        </ul>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {a11y.errors.length === 0 && a11y.warnings.length === 0 && (
                <div className="p-4 rounded-xl bg-success-surface border border-success/40 text-success text-xs flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-success shrink-0" />
                  <div>
                    <div className="font-semibold">All Contrast Checks Pass</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Your primary copy, buttons, and focus indicators comply with WCAG 2.1 AA standards.
                    </div>
                  </div>
                </div>
              )}

              {a11y.errors.map((err, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-danger-surface border border-danger/40 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-danger">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-danger" />
                      {err.tokenKey}
                    </span>
                    <span className="font-mono text-[11px]">Ratio: {err.ratio}:1 (Min {err.requiredRatio}:1)</span>
                  </div>
                  {err.suggestedFix && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-accent-soft">
                        Suggested compliant value: <code className="font-mono bg-canvas px-1 py-0.5 rounded">{err.suggestedFix}</code>
                      </span>
                      <button
                        type="button"
                        onClick={() => autoFixAccessibilityIssue(err)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shrink-0"
                      >
                        Apply Fix
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {a11y.warnings.map((warn, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-warning-surface border border-warning/40 text-xs space-y-1">
                  <div className="font-semibold text-warning">{warn.tokenKey}</div>
                  <p className="text-body text-[11px]">{warn.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Published snapshots & rollback */}
        {activeTab === 'snapshots' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-xs font-bold text-ink tracking-tight uppercase">Immutable Published Snapshots</h3>
                <p className="text-[11px] text-muted">Restore a previous published version safely.</p>
              </div>
              <History className="w-4 h-4 text-muted" />
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-8 text-subtle text-xs">
                No published theme snapshots recorded yet. Publish your profile to generate immutable snapshots.
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshots.map((snap) => (
                  <div 
                    key={snap.snapshotId}
                    className="p-3 rounded-xl bg-canvas border border-line flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink flex items-center gap-2">
                        <span>v{snap.version} {snap.versionName || 'Release'}</span>
                        <span className="font-mono text-[10px] text-muted px-1.5 py-0.5 rounded bg-surface border border-line">
                          {snap.theme.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-subtle mt-0.5">
                        {new Date(snap.timestamp).toLocaleString()} by {snap.publishedBy}
                      </div>
                      {snap.versionNotes && <div className="mt-1 max-w-xl text-[11px] text-muted">{snap.versionNotes}</div>}
                    </div>

                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => setPreviewTheme(snap.theme)}
                        className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-surface-2 text-ink-strong text-xs font-medium transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => { setComparisonSnapshot(snap); setShowComparison(true); }}
                        className="px-2.5 py-1 rounded-lg border border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors cursor-pointer"
                      >
                        Compare
                      </button>
                      <button
                        onClick={() => requestConfirmation({
                          title: `Restore theme v${snap.version}?`,
                          message: 'Only the visual theme will be restored. Your profile content and blocks will stay unchanged.',
                          confirmLabel: 'Restore theme',
                          onConfirm: () => rollbackToSnapshot(snap.snapshotId)
                        })}
                        className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-strong text-xs font-medium transition-colors cursor-pointer"
                      >
                        Restore theme
                      </button>
                      <button
                        onClick={() => requestConfirmation({
                          title: `Restore all from v${snap.version}?`,
                          message: 'This restores profile content and theme, then creates a new safe rollback release.',
                          confirmLabel: 'Restore all',
                          destructive: true,
                          onConfirm: async () => { await rollbackToPublishedSnapshot(snap.snapshotId, `Restored published version v${snap.version} from Theme Studio.`); }
                        })}
                        className="px-2.5 py-1 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Restore all
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {confirmRequest && (
          <Dialog open={true} onClose={closeConfirmation} labelledBy="theme-confirm-title" describedBy="theme-confirm-message" className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <h3 id="theme-confirm-title" className="text-base font-bold text-ink">{confirmRequest.title}</h3>
            <p id="theme-confirm-message" className="mt-2 text-sm leading-relaxed text-muted">{confirmRequest.message}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeConfirmation} className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink cursor-pointer">Cancel</button>
              <button type="button" onClick={() => void confirmAndClose()} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-white cursor-pointer ${confirmRequest.destructive ? 'bg-danger hover:bg-danger/90' : 'bg-accent hover:opacity-90'}`}>{confirmRequest.confirmLabel}</button>
            </div>
          </Dialog>
        )}

        {/* Save Custom Preset Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="save-preset-title">
            <div ref={saveModalRef} className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 id="save-preset-title" className="text-sm font-bold text-ink">Save Current Theme as Preset</h3>
                <button type="button" onClick={() => setShowSaveModal(false)} aria-label="Close save preset dialog" className="min-h-11 min-w-11 rounded-lg text-xl leading-none text-muted hover:bg-canvas hover:text-ink cursor-pointer">×</button>
              </div>
              <p className="text-xs text-muted">
                Saves the theme, layout reference, brand-kit reference, and block variants. Applying it changes appearance and layout only; it does not replace profile content or blocks.
              </p>
              {presetSaveError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-surface px-3 py-2 text-xs text-danger">{presetSaveError}</p>}
              <form onSubmit={handleSaveCustom} className="space-y-3">
                <label htmlFor="custom-preset-name" className="sr-only">Preset name</label>
                <input
                  id="custom-preset-name"
                  type="text"
                  placeholder="e.g., Midnight Minimalist"
                  value={customPresetName}
                  onChange={(e) => setCustomPresetName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Save Preset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <PublishLifecycleModal
          isOpen={isPublishOpen}
          initialTab="publish"
          onClose={() => setIsPublishOpen(false)}
        />

        <div className="sticky bottom-2 z-30 flex items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface/95 px-3 py-2 shadow-xl backdrop-blur min-[900px]:hidden">
          <span className="min-w-0 truncate text-[11px] font-medium text-muted" role="status">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'offline' ? 'Offline changes pending' : saveStatus === 'error' ? 'Save failed — retry above' : saveStatus === 'conflict' ? 'Conflict detected' : hasUnpublishedChanges ? `Draft ready to publish · ${savedRecency.toLowerCase()}` : savedRecency}
          </span>
          <button type="button" onClick={() => setIsPublishOpen(true)} disabled={!hasUnpublishedChanges || !a11y.canPublish} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Publish</button>
        </div>

      </div>

      {/* Right Column: Live Phone Mockup Preview */}
      <div className="order-1 min-[900px]:order-2 flex min-w-0 w-full min-[900px]:w-[42%] xl:w-[40%] h-[min(58vh,520px)] min-[900px]:h-full shrink-0 border-b min-[900px]:border-b-0 min-[900px]:border-l border-line bg-canvas/40 p-3 sm:p-4 xl:p-6 items-center justify-center overflow-hidden">
        {showComparison ? (
          <div className="flex h-full w-full min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink">Comparison controls</p>
                <p className="text-[10px] text-muted">Review the same draft and published snapshot at one viewport and locale.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-md border border-line-strong bg-canvas p-0.5" aria-label="Comparison source">
                  <button type="button" onClick={() => setComparisonSnapshot(null)} aria-pressed={!comparisonSnapshot} className={`rounded px-2 py-1 text-[10px] font-semibold ${!comparisonSnapshot ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}>Published</button>
                  {comparisonSnapshot && <span className="rounded px-2 py-1 text-[10px] font-semibold text-accent">v{comparisonSnapshot.version} {comparisonSnapshot.versionName || 'Release'}</span>}
                </div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                  <span className="sr-only">Comparison viewport</span>
                  <select value={comparisonDevice} onChange={event => setComparisonDevice(event.target.value as typeof comparisonDevice)} className="rounded-md border border-line-strong bg-canvas px-2 py-1.5 text-[10px] text-ink outline-none">
                    <option value="mobile-small">Small mobile</option>
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="desktop">Desktop</option>
                    <option value="wide">Wide desktop</option>
                  </select>
                </label>
                <div className="flex items-center rounded-md border border-line-strong bg-canvas p-0.5" aria-label="Comparison language">
                  {(['en', 'ar'] as const).map(locale => <button key={locale} type="button" onClick={() => setComparisonLocale(locale)} aria-pressed={comparisonLocale === locale} className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${comparisonLocale === locale ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}>{locale}</button>)}
                </div>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 w-full min-w-0 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-2">
              <div className="min-h-0 min-w-0 overflow-hidden rounded-xl border border-warning/30 bg-warning/5 p-2"><div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-warning">Current draft</div><PhoneMockup hideControls previewSourceOverride="draft" previewDeviceOverride={comparisonDevice} previewLocaleOverride={comparisonLocale} onOpenReportModal={onOpenReportModal} profileOverride={previewTheme ? { ...activeProfile, standardTheme: previewTheme } : undefined} /></div>
              <div className="min-h-0 min-w-0 overflow-hidden rounded-xl border border-success/30 bg-success/5 p-2"><div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-success">{comparisonSnapshot ? `Before · v${comparisonSnapshot.version} ${comparisonSnapshot.versionName || 'Release'}` : 'Published version'}</div><PhoneMockup hideControls previewSourceOverride={comparisonSnapshot ? 'draft' : 'published'} previewDeviceOverride={comparisonDevice} previewLocaleOverride={comparisonLocale} onOpenReportModal={onOpenReportModal} profileOverride={comparisonSnapshot ? { ...activeProfile, standardTheme: comparisonSnapshot.theme } : undefined} /></div>
            </div>
          </div>
        ) : <PhoneMockup
          onOpenReportModal={onOpenReportModal}
          profileOverride={previewTheme ? { ...activeProfile, standardTheme: previewTheme } : undefined}
          onBackgroundChange={(patch) => {
            if (patch.focalPoint) handleUpdateBackground('focalPoint', patch.focalPoint);
            if (patch.scale !== undefined) handleUpdateBackground('scale', patch.scale);
          }}
        />}
      </div>
    </div>
  );
};
