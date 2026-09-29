import React, { useState, useRef, useEffect } from 'react';
import { 
  Block, 
  AnimeBlockEffect, 
  AnimeHoverEffect, 
  AnimeClickEffect,
  LinkBlockPayload, 
  MediaBlockPayload, 
  TextBlockPayload, 
  DividerBlockPayload, 
  FolderBlockPayload, 
  FaqBlockPayload, 
  TestimonialBlockPayload, 
  FileBlockPayload, 
  FormBlockPayload, 
  ContactBlockPayload 
} from '../../types';
import { 
  ANIME_BLOCK_EFFECTS, 
  ANIME_HOVER_OPTIONS, 
  ANIME_CLICK_OPTIONS, 
  applyBlockContinuousAnimation, 
  triggerBlockEntranceAnimation, 
  triggerBlockHoverEnter, 
  triggerBlockHoverLeave, 
  triggerBlockClickFx, 
  triggerBlockTextAnimation, 
  stopBlockAnimation 
} from '../../utils/animeAnimations';
import { validateUrl, validateBlockPayload, sanitizeMediaEmbed } from '../../utils/blockValidator';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Check, 
  Play, 
  RotateCcw, 
  Zap, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Heart,
  Cloud,
  Compass,
  Bell,
  Sun,
  Palette,
  Flame,
  Wind,
  Maximize2,
  ArrowDown,
  Film,
  Layers,
  RefreshCw,
  Disc,
  Eye,
  FastForward,
  Terminal,
  Type,
  Sliders,
  Minus,
  MousePointer,
  Waves
} from 'lucide-react';

interface BlockEditModalProps {
  block: Block | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Block>) => void;
}

export const BlockEditModal: React.FC<BlockEditModalProps> = ({ block, isOpen, onClose, onSave }) => {
  if (!isOpen || !block) return null;

  const [title, setTitle] = useState(block.title);
  const [isHidden, setIsHidden] = useState(block.isHidden);
  const [scheduleEnabled, setScheduleEnabled] = useState(block.schedule?.enabled ?? false);
  const [scheduleStart, setScheduleStart] = useState(block.schedule?.start ?? '');
  const [scheduleEnd, setScheduleEnd] = useState(block.schedule?.end ?? '');
  const [payload, setPayload] = useState<any>(JSON.parse(JSON.stringify(block.payload)));
  const [blockStyle, setBlockStyle] = useState(block.style || {});

  // Anime.js Animation Configuration State
  const initialEffect: AnimeBlockEffect = 
    block.animationConfig?.effect || 
    block.animation || 
    ((block.payload as any)?.animation === 'pulse' ? 'pulseGlow' :
     (block.payload as any)?.animation === 'shimmer' ? 'shimmerGleam' :
     (block.payload as any)?.animation === 'bounce' ? 'springBounce' :
     (block.payload as any)?.animation ? (block.payload as any).animation : 'none');

  const [animationEffect, setAnimationEffect] = useState<AnimeBlockEffect>(initialEffect);
  const [hoverEffect, setHoverEffect] = useState<AnimeHoverEffect>(block.animationConfig?.hoverEffect || 'magneticLift');
  const [clickEffect, setClickEffect] = useState<AnimeClickEffect>(block.animationConfig?.clickEffect || 'rippleWave');
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>(block.animationConfig?.speed || 'normal');
  const [intensity, setIntensity] = useState<'subtle' | 'medium' | 'expressive'>(block.animationConfig?.intensity || 'medium');
  const [activeCategory, setActiveCategory] = useState<'all' | 'attention' | 'entrance' | 'text'>('all');
  const [showTuning, setShowTuning] = useState(false);

  // Live Preview Refs
  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewTextRef = useRef<HTMLSpanElement>(null);

  const playPreview = () => {
    if (!previewCardRef.current) return;
    stopBlockAnimation(previewCardRef.current);

    const selectedDef = ANIME_BLOCK_EFFECTS.find(e => e.id === animationEffect);
    if (!selectedDef || selectedDef.id === 'none') {
      if (previewTextRef.current) previewTextRef.current.textContent = title || block.title;
      return;
    }

    if (selectedDef.category === 'entrance') {
      triggerBlockEntranceAnimation(previewCardRef.current, animationEffect);
    } else if (selectedDef.category === 'text') {
      triggerBlockTextAnimation(previewTextRef.current, title || block.title, animationEffect);
    } else if (selectedDef.isContinuous) {
      applyBlockContinuousAnimation(previewCardRef.current, animationEffect, speed, intensity, '#6366f1');
    }
  };

  useEffect(() => {
    playPreview();
    return () => {
      if (previewCardRef.current) stopBlockAnimation(previewCardRef.current);
    };
  }, [animationEffect, speed, intensity]);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = () => {
    // Validate block payload
    const valResult = validateBlockPayload(block.type, payload);
    if (!valResult.isValid) {
      setValidationError(valResult.errors.join(' '));
      return;
    }

    setValidationError(null);
    onSave({
      title,
      isHidden,
      schedule: {
        enabled: scheduleEnabled,
        start: scheduleStart || undefined,
        end: scheduleEnd || undefined
      },
      animation: animationEffect,
      animationConfig: {
        effect: animationEffect,
        hoverEffect,
        clickEffect,
        speed,
        intensity,
      },
      payload: {
        ...payload,
        ...(block.type === 'link' ? {
          animation: animationEffect === 'none' ? 'none' : 
                     animationEffect === 'pulseGlow' ? 'pulse' :
                     animationEffect === 'shimmerGleam' ? 'shimmer' :
                     animationEffect === 'springBounce' ? 'bounce' : animationEffect
        } : {})
      },
      style: blockStyle
    });
    onClose();
  };

  const updatePayloadField = (key: string, value: any) => {
    setValidationError(null);
    setPayload((prev: any) => ({ ...prev, [key]: value }));
  };

  // Helper icon for animation definition
  const renderEffectIcon = (iconName: string) => {
    const props = { className: "w-4 h-4 shrink-0" };
    switch (iconName) {
      case 'Sparkles': return <Sparkles {...props} className="w-4 h-4 text-warning" />;
      case 'Cloud': return <Cloud {...props} className="w-4 h-4 text-info" />;
      case 'Heart': return <Heart {...props} className="w-4 h-4 text-danger" />;
      case 'Activity': return <Activity {...props} className="w-4 h-4 text-accent" />;
      case 'Compass': return <Compass {...props} className="w-4 h-4 text-success" />;
      case 'Bell': return <Bell {...props} className="w-4 h-4 text-warning" />;
      case 'Zap': return <Zap {...props} className="w-4 h-4 text-yellow-400" />;
      case 'Sun': return <Sun {...props} className="w-4 h-4 text-warning" />;
      case 'Palette': return <Palette {...props} className="w-4 h-4 text-accent-soft" />;
      case 'Flame': return <Flame {...props} className="w-4 h-4 text-danger" />;
      case 'Wind': return <Wind {...props} className="w-4 h-4 text-success" />;
      case 'Sparkle': return <Sparkles {...props} className="w-4 h-4 text-accent-soft" />;
      case 'Waves': return <Waves {...props} className="w-4 h-4 text-info" />;
      case 'Maximize2': return <Maximize2 {...props} className="w-4 h-4 text-accent-soft" />;
      case 'ArrowDown': return <ArrowDown {...props} className="w-4 h-4 text-success" />;
      case 'Film': return <Film {...props} className="w-4 h-4 text-info" />;
      case 'Layers': return <Layers {...props} className="w-4 h-4 text-accent-soft" />;
      case 'RefreshCw': return <RefreshCw {...props} className="w-4 h-4 text-danger" />;
      case 'Disc': return <Disc {...props} className="w-4 h-4 text-accent" />;
      case 'Eye': return <Eye {...props} className="w-4 h-4 text-info" />;
      case 'FastForward': return <FastForward {...props} className="w-4 h-4 text-warning" />;
      case 'Terminal': return <Terminal {...props} className="w-4 h-4 text-success" />;
      case 'Type': return <Type {...props} className="w-4 h-4 text-info" />;
      case 'Sliders': return <Sliders {...props} className="w-4 h-4 text-success" />;
      default: return <Minus {...props} className="w-4 h-4 text-subtle" />;
    }
  };

  const filteredEffects = ANIME_BLOCK_EFFECTS.filter(e => {
    if (activeCategory === 'all') return true;
    return e.category === activeCategory;
  });

  const selectedDef = ANIME_BLOCK_EFFECTS.find(e => e.id === animationEffect) || ANIME_BLOCK_EFFECTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="block-edit-title">
      <div 
        className="w-full max-w-2xl bg-surface border border-line rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-md bg-surface-2 text-body">
                {block.type}
              </span>
              <h3 id="block-edit-title" className="text-base font-bold text-ink tracking-tight">Edit Block</h3>
            </div>
            <p className="text-xs text-muted mt-0.5">Customize content, layout parameters, and Anime.js motion behaviors.</p>
          </div>

          <details className="rounded-xl bg-canvas/70 border border-line p-3.5">
            <summary className="cursor-pointer text-xs font-semibold text-body">Per-block style override</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="text-[11px] text-muted">Background<input value={blockStyle.backgroundColor || ''} onChange={(e) => setBlockStyle(prev => ({ ...prev, backgroundColor: e.target.value || undefined }))} placeholder="#ffffff or transparent" className="mt-1 w-full px-2 py-1.5 rounded bg-surface border border-line text-xs text-ink" /></label>
              <label className="text-[11px] text-muted">Text color<input value={blockStyle.textColor || ''} onChange={(e) => setBlockStyle(prev => ({ ...prev, textColor: e.target.value || undefined }))} placeholder="#ffffff" className="mt-1 w-full px-2 py-1.5 rounded bg-surface border border-line text-xs text-ink" /></label>
              <label className="text-[11px] text-muted">Radius (px)<input type="number" min="0" max="999" value={blockStyle.borderRadius ?? ''} onChange={(e) => setBlockStyle(prev => ({ ...prev, borderRadius: e.target.value === '' ? undefined : Number(e.target.value) }))} className="mt-1 w-full px-2 py-1.5 rounded bg-surface border border-line text-xs text-ink" /></label>
              <label className="text-[11px] text-muted">Height (px)<input type="number" min="40" max="240" value={blockStyle.height ?? ''} onChange={(e) => setBlockStyle(prev => ({ ...prev, height: e.target.value === '' ? undefined : Number(e.target.value) }))} className="mt-1 w-full px-2 py-1.5 rounded bg-surface border border-line text-xs text-ink" /></label>
            </div>
          </details>
          <button
            onClick={onClose}
            aria-label="Close block editor dialog"
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-danger text-xs flex items-center gap-2">
            <span className="font-semibold">Validation Error:</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Main Title */}
          <div>
            <label className="block text-xs font-medium text-body mb-1">Block Title / Label</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
              placeholder="Title for this block"
            />
          </div>

          {/* Type-Specific Configurations */}
          {block.type === 'link' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div>
                <label className="block text-xs font-medium text-body mb-1">Destination URL</label>
                <input
                  type="url"
                  value={payload.url || ''}
                  onChange={(e) => updatePayloadField('url', e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Subtitle / Context</label>
                <input
                  type="text"
                  value={payload.subtitle || ''}
                  onChange={(e) => updatePayloadField('subtitle', e.target.value)}
                  placeholder="e.g. Free shipping on orders over $50"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Highlight Badge</label>
                <input
                  type="text"
                  value={payload.highlightBadge || ''}
                  onChange={(e) => updatePayloadField('highlightBadge', e.target.value)}
                  placeholder="e.g. New, 20% Off, Top Pick"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {block.type === 'media' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div>
                <label className="block text-xs font-medium text-body mb-1">Media Type</label>
                <select
                  value={payload.mediaType || 'video'}
                  onChange={(e) => updatePayloadField('mediaType', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500"
                >
                  <option value="video">Video Embed (YouTube / Vimeo)</option>
                  <option value="image">Image Banner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Embed URL / Image URL</label>
                <input
                  type="text"
                  value={payload.url || ''}
                  onChange={(e) => updatePayloadField('url', e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Caption</label>
                <input
                  type="text"
                  value={payload.caption || ''}
                  onChange={(e) => updatePayloadField('caption', e.target.value)}
                  placeholder="Optional caption beneath media"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {(block.type === 'gallery' || block.type === 'carousel') && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div>
                <label className="block text-xs font-medium text-body mb-1">Image items (JSON)</label>
                <textarea
                  value={JSON.stringify(payload.items || [], null, 2)}
                  onChange={(e) => { try { updatePayloadField('items', JSON.parse(e.target.value)); } catch { setValidationError('Image items must be valid JSON.'); } }}
                  rows={7}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder='[{"id":"1","image":"https://...","title":"Work"}]'
                />
              </div>
              {block.type === 'gallery' ? <div><label className="block text-xs font-medium text-body mb-1">Grid columns</label><select value={payload.columns || 2} onChange={(e) => updatePayloadField('columns', Number(e.target.value))} className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div> : <label className="flex items-center gap-2 text-xs text-body"><input type="checkbox" checked={payload.autoplay || false} onChange={(e) => updatePayloadField('autoplay', e.target.checked)} /> Autoplay carousel</label>}
            </div>
          )}

          {block.type === 'product' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              {(['image', 'url', 'price', 'currency', 'buttonLabel', 'description'] as const).map(field => (
                <div key={field}><label className="block text-xs font-medium text-body mb-1">{field === 'url' ? 'Product URL' : field[0].toUpperCase() + field.slice(1)}</label>{field === 'description' ? <textarea value={payload[field] || ''} onChange={(e) => updatePayloadField(field, e.target.value)} rows={3} className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink" /> : <input type={field === 'url' || field === 'image' ? 'url' : 'text'} value={payload[field] || ''} onChange={(e) => updatePayloadField(field, e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink" />}</div>
              ))}
            </div>
          )}

          {block.type === 'text' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Text Style</label>
                  <select
                    value={payload.textType || 'h2'}
                    onChange={(e) => updatePayloadField('textType', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                  >
                    <option value="h1">Large Header (H1)</option>
                    <option value="h2">Section Header (H2)</option>
                    <option value="p">Paragraph Body</option>
                    <option value="quote">Pull Quote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Alignment</label>
                  <select
                    value={payload.alignment || 'center'}
                    onChange={(e) => updatePayloadField('alignment', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Content</label>
                <textarea
                  value={payload.content || ''}
                  onChange={(e) => updatePayloadField('content', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                  placeholder="Enter your text content here..."
                />
              </div>
            </div>
          )}

          {block.type === 'divider' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Line Style</label>
                  <select
                    value={payload.style || 'hairline'}
                    onChange={(e) => updatePayloadField('style', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                  >
                    <option value="hairline">Hairline Border</option>
                    <option value="solid">Solid Line</option>
                    <option value="dashed">Dashed Line</option>
                    <option value="dotted">Dotted Line</option>
                    <option value="spacer">Invisible Spacer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Spacing Height</label>
                  <select
                    value={payload.height || 'md'}
                    onChange={(e) => updatePayloadField('height', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                  >
                    <option value="sm">Small (12px)</option>
                    <option value="md">Medium (24px)</option>
                    <option value="lg">Large (48px)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {block.type === 'folder' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div>
                <label className="block text-xs font-medium text-body mb-1">Folder Description</label>
                <input
                  type="text"
                  value={payload.description || ''}
                  onChange={(e) => updatePayloadField('description', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  placeholder="Optional brief description"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Nested Sub-Links ({payload.items?.length || 0})</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(payload.items || []).map((item: any, idx: number) => (
                    <div key={item.id} className="p-2.5 rounded-lg bg-surface border border-line space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted">Item #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = payload.items.filter((_: any, i: number) => i !== idx);
                            updatePayloadField('items', newItems);
                          }}
                          className="text-subtle hover:text-danger text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const newItems = [...payload.items];
                          newItems[idx].title = e.target.value;
                          updatePayloadField('items', newItems);
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-canvas border border-line text-ink"
                        placeholder="Link Label"
                      />
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => {
                          const newItems = [...payload.items];
                          newItems[idx].url = e.target.value;
                          updatePayloadField('items', newItems);
                        }}
                        className="w-full px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-mono"
                        placeholder="https://..."
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = [...(payload.items || [])];
                    newItems.push({
                      id: `item-${Date.now()}`,
                      title: 'New Link',
                      url: 'https://',
                    });
                    updatePayloadField('items', newItems);
                  }}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg border border-dashed border-line-strong hover:border-ink text-body text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sub-Link</span>
                </button>
              </div>
            </div>
          )}

          {block.type === 'faq' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <label className="block text-xs font-medium text-body mb-1">Q&A Items ({payload.items?.length || 0})</label>
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {(payload.items || []).map((item: any, idx: number) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-surface border border-line space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted">Q#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = payload.items.filter((_: any, i: number) => i !== idx);
                          updatePayloadField('items', newItems);
                        }}
                        className="text-subtle hover:text-danger text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const newItems = [...payload.items];
                        newItems[idx].question = e.target.value;
                        updatePayloadField('items', newItems);
                      }}
                      className="w-full px-2 py-1 text-xs rounded bg-canvas border border-line text-ink font-medium"
                      placeholder="Question"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const newItems = [...payload.items];
                        newItems[idx].answer = e.target.value;
                        updatePayloadField('items', newItems);
                      }}
                      rows={2}
                      className="w-full px-2 py-1 text-xs rounded bg-canvas border border-line text-ink"
                      placeholder="Answer text..."
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newItems = [...(payload.items || [])];
                  newItems.push({
                    id: `faq-${Date.now()}`,
                    question: 'Frequently Asked Question',
                    answer: 'Helpful detailed answer explaining this topic.'
                  });
                  updatePayloadField('items', newItems);
                }}
                className="w-full py-1.5 px-3 rounded-lg border border-dashed border-line-strong hover:border-ink text-body text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ Item</span>
              </button>
            </div>
          )}

          {(block.type === 'form' || block.type === 'emailSignup') && (
            <div className="space-y-3.5 p-3.5 rounded-xl bg-canvas/70 border border-line">
              {/* Form Presets / Templates */}
              <div>
                <label className="block text-xs font-semibold text-body mb-1.5">Apply Form Template</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updatePayloadField('formType', 'newsletter');
                      updatePayloadField('description', 'Get our exclusive weekly newsletter directly in your inbox.');
                      updatePayloadField('submitButtonText', 'Subscribe Now');
                      updatePayloadField('successMessage', '🎉 Welcome to the community! Check your email for confirmation.');
                      updatePayloadField('subscriberMode', true);
                      updatePayloadField('requireConsent', true);
                      updatePayloadField('consentText', 'I agree to receive email updates. Unsubscribe anytime.');
                      updatePayloadField('fields', [
                        { id: 'f_name', label: 'First Name', type: 'text', placeholder: 'Alex', required: false },
                        { id: 'f_email', label: 'Email Address', type: 'email', placeholder: 'alex@domain.com', required: true }
                      ]);
                    }}
                    className="p-2 rounded-lg bg-surface border border-line hover:border-indigo-500/50 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-ink">Newsletter</div>
                    <div className="text-[10px] text-muted">Audience capture</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePayloadField('formType', 'contact');
                      updatePayloadField('description', 'Send a direct message or collaboration inquiry.');
                      updatePayloadField('submitButtonText', 'Send Message');
                      updatePayloadField('successMessage', 'Thank you! We will get back to you within 24 hours.');
                      updatePayloadField('subscriberMode', false);
                      updatePayloadField('requireConsent', false);
                      updatePayloadField('consentText', '');
                      updatePayloadField('fields', [
                        { id: 'f_name', label: 'Your Name', type: 'text', placeholder: 'Jane Doe', required: true },
                        { id: 'f_email', label: 'Email Address', type: 'email', placeholder: 'jane@example.com', required: true },
                        { id: 'f_msg', label: 'Message', type: 'textarea', placeholder: 'Tell us about your project...', required: true }
                      ]);
                    }}
                    className="p-2 rounded-lg bg-surface border border-line hover:border-indigo-500/50 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-ink">Contact Inquiry</div>
                    <div className="text-[10px] text-muted">Direct messages</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePayloadField('formType', 'lead');
                      updatePayloadField('description', 'Download our free guide and access exclusive resources.');
                      updatePayloadField('submitButtonText', 'Get Free Access');
                      updatePayloadField('successMessage', 'Check your inbox! Your free download link is on its way.');
                      updatePayloadField('subscriberMode', true);
                      updatePayloadField('requireConsent', true);
                      updatePayloadField('consentText', 'I agree to receive resources and marketing emails.');
                      updatePayloadField('fields', [
                        { id: 'f_name', label: 'Full Name', type: 'text', placeholder: 'Alex Smith', required: true },
                        { id: 'f_email', label: 'Email', type: 'email', placeholder: 'alex@company.com', required: true },
                        { id: 'f_phone', label: 'Phone Number', type: 'phone', placeholder: '+1 (555) 000-0000', required: false }
                      ]);
                    }}
                    className="p-2 rounded-lg bg-surface border border-line hover:border-indigo-500/50 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-ink">Lead Magnet</div>
                    <div className="text-[10px] text-muted">High-intent leads</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePayloadField('formType', 'feedback');
                      updatePayloadField('description', 'Help us improve with your quick feedback.');
                      updatePayloadField('submitButtonText', 'Submit Feedback');
                      updatePayloadField('successMessage', 'Thank you for your valuable feedback!');
                      updatePayloadField('subscriberMode', false);
                      updatePayloadField('requireConsent', false);
                      updatePayloadField('consentText', '');
                      updatePayloadField('fields', [
                        { id: 'f_category', label: 'Category', type: 'select', options: ['General', 'Bug Report', 'Feature Request', 'Partnership'], required: true },
                        { id: 'f_feedback', label: 'Feedback & Thoughts', type: 'textarea', placeholder: 'What can we improve?', required: true }
                      ]);
                    }}
                    className="p-2 rounded-lg bg-surface border border-line hover:border-indigo-500/50 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-ink">Feedback</div>
                    <div className="text-[10px] text-muted">Structured review</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Form Classification</label>
                  <select
                    value={payload.formType || 'newsletter'}
                    onChange={(e) => updatePayloadField('formType', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  >
                    <option value="newsletter">Newsletter Sign-up</option>
                    <option value="contact">Contact Message</option>
                    <option value="lead">Lead Capture</option>
                    <option value="feedback">Feedback Form</option>
                    <option value="custom">Custom Form</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={payload.submitButtonText || 'Submit'}
                    onChange={(e) => updatePayloadField('submitButtonText', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  />
                </div>
              </div>

              {/* Subscriber Mode (FORM-004) */}
              <div className="p-3 rounded-lg bg-accent-surface border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink">Subscriber Mode (Audience Capture)</div>
                  <div className="text-[11px] text-muted">
                    Automatically sync email entries to your centralized, deduplicated Subscriber list.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payload.subscriberMode !== false}
                    onChange={(e) => updatePayloadField('subscriberMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-inverse after:border-line-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Description / Value Prop</label>
                <input
                  type="text"
                  value={payload.description || ''}
                  onChange={(e) => updatePayloadField('description', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  placeholder="e.g. Subscribe to our monthly newsletter"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Success Confirmation Message</label>
                <input
                  type="text"
                  value={payload.successMessage || 'Thank you! We received your submission.'}
                  onChange={(e) => updatePayloadField('successMessage', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  placeholder="e.g. Thank you for subscribing!"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-body">Consent / Privacy Disclaimer</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!payload.requireConsent}
                      onChange={(e) => updatePayloadField('requireConsent', e.target.checked)}
                      className="rounded border-line-strong text-accent focus:ring-0"
                    />
                    <span>Require Opt-In</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={payload.consentText || ''}
                  onChange={(e) => updatePayloadField('consentText', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  placeholder="e.g. By submitting, you agree to receive email updates. Unsubscribe anytime."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1">Form Fields ({payload.fields?.length || 0})</label>
                <div className="space-y-2">
                  {(payload.fields || []).map((field: any, fIdx: number) => (
                    <div key={field.id} className="p-2.5 rounded-lg bg-surface border border-line space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newFields = [...payload.fields];
                            newFields[fIdx].label = e.target.value;
                            updatePayloadField('fields', newFields);
                          }}
                          className="flex-1 px-2 py-1 text-xs rounded bg-canvas border border-line text-ink"
                          placeholder="Field Label"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newFields = [...payload.fields];
                            newFields[fIdx].type = e.target.value;
                            if (e.target.value === 'select' && !newFields[fIdx].options) {
                              newFields[fIdx].options = ['Option 1', 'Option 2'];
                            }
                            updatePayloadField('fields', newFields);
                          }}
                          className="px-2 py-1 text-xs rounded bg-canvas border border-line text-ink"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Dropdown Select</option>
                          <option value="checkbox">Single Checkbox</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] text-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const newFields = [...payload.fields];
                              newFields[fIdx].required = e.target.checked;
                              updatePayloadField('fields', newFields);
                            }}
                            className="rounded border-line-strong text-accent focus:ring-0"
                          />
                          <span>Req</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = payload.fields.filter((_: any, i: number) => i !== fIdx);
                            updatePayloadField('fields', newFields);
                          }}
                          className="text-subtle hover:text-danger p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Options Editor */}
                      {field.type === 'select' && (
                        <div className="pt-1 border-t border-line text-[11px] space-y-1">
                          <label className="text-muted block text-[10px]">Select Options (comma-separated):</label>
                          <input
                            type="text"
                            value={(field.options || []).join(', ')}
                            onChange={(e) => {
                              const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              const newFields = [...payload.fields];
                              newFields[fIdx].options = opts;
                              updatePayloadField('fields', newFields);
                            }}
                            className="w-full px-2 py-1 text-xs rounded bg-canvas border border-line text-ink"
                            placeholder="e.g. Option A, Option B, Option C"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newFields = [...(payload.fields || [])];
                      newFields.push({
                        id: `field-${Date.now()}`,
                        label: 'New Question',
                        type: 'text',
                        placeholder: '',
                        required: false
                      });
                      updatePayloadField('fields', newFields);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg border border-dashed border-line-strong hover:border-ink text-body text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {block.type === 'testimonial' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div>
                <label className="block text-xs font-medium text-body mb-1">Endorsement / Quote Text</label>
                <textarea
                  value={payload.quote || ''}
                  onChange={(e) => updatePayloadField('quote', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                  placeholder="What did your client or collaborator say?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Author Name</label>
                  <input
                    type="text"
                    value={payload.authorName || ''}
                    onChange={(e) => updatePayloadField('authorName', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Star Rating (1-5)</label>
                  <select
                    value={payload.rating || 5}
                    onChange={(e) => updatePayloadField('rating', Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  >
                    <option value={5}>★★★★★ (5 Stars)</option>
                    <option value={4}>★★★★☆ (4 Stars)</option>
                    <option value={3}>★★★☆☆ (3 Stars)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    value={payload.authorRole || ''}
                    onChange={(e) => updatePayloadField('authorRole', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="e.g. Lead Producer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={payload.company || ''}
                    onChange={(e) => updatePayloadField('company', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="e.g. Acme Media"
                  />
                </div>
              </div>
            </div>
          )}

          {block.type === 'file' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">File Name</label>
                  <input
                    type="text"
                    value={payload.fileName || ''}
                    onChange={(e) => updatePayloadField('fileName', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="e.g. Media-Kit-2026.pdf"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">File Size Label</label>
                  <input
                    type="text"
                    value={payload.fileSize || ''}
                    onChange={(e) => updatePayloadField('fileSize', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="e.g. 4.2 MB"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-1">Direct Download URL</label>
                <input
                  type="url"
                  value={payload.fileUrl || ''}
                  onChange={(e) => updatePayloadField('fileUrl', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink font-mono"
                  placeholder="https://example.com/downloads/file.pdf"
                />
              </div>
            </div>
          )}

          {block.type === 'contact' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas/70 border border-line">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Contact Method</label>
                  <select
                    value={payload.contactType || 'email'}
                    onChange={(e) => updatePayloadField('contactType', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                  >
                    <option value="email">Email (mailto:)</option>
                    <option value="phone">Phone Call (tel:)</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Target Address / Phone</label>
                  <input
                    type="text"
                    value={payload.value || ''}
                    onChange={(e) => updatePayloadField('value', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="you@domain.com or +1234567890"
                  />
                </div>
              </div>
              {payload.contactType === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-body mb-1">Preset Email Subject</label>
                  <input
                    type="text"
                    value={payload.presetSubject || ''}
                    onChange={(e) => updatePayloadField('presetSubject', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-line text-ink"
                    placeholder="e.g. Project Inquiry from Liinx"
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              ANIME.JS MOTION ENGINE STUDIO SECTION (FOR ALL BLOCKS)
              ========================================================================= */}
          <div className="p-4 rounded-xl bg-linear-to-b from-indigo-950/30 to-canvas border border-accent/40 space-y-4">
            {/* Section Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    Anime.js Motion Engine (v4.5)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-accent-soft font-mono border border-indigo-500/30">
                    Physics Powered
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Select from all official Anime.js animations to command viewer attention and add kinetic polish.
                </p>
              </div>

              {/* Quick Play Trigger */}
              <button
                type="button"
                onClick={playPreview}
                className="px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Replay Selected Animation"
              >
                <RotateCcw className="w-3.5 h-3.5 text-accent" />
                <span>Test FX</span>
              </button>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="p-3 rounded-lg bg-black/50 border border-line/80">
              <div className="flex items-center justify-between text-[11px] text-muted mb-2">
                <span className="flex items-center gap-1.5 font-medium text-body">
                  <Eye className="w-3.5 h-3.5 text-accent" />
                  <span>Real-Time Animation Preview</span>
                </span>
                <span className="font-mono text-[10px] text-accent">
                  {selectedDef.badge}
                </span>
              </div>

              {/* The Live Animating Card */}
              <div
                ref={previewCardRef}
                onMouseEnter={(e) => triggerBlockHoverEnter(e.currentTarget, hoverEffect, '#6366f1')}
                onMouseLeave={(e) => triggerBlockHoverLeave(e.currentTarget, hoverEffect)}
                onClick={(e) => triggerBlockClickFx(e, e.currentTarget, clickEffect, '#6366f1')}
                className="p-3.5 rounded-xl bg-surface border border-line-strong text-ink shadow-lg cursor-pointer select-none transition-colors relative overflow-hidden"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-accent-soft">
                      {renderEffectIcon(selectedDef.iconName)}
                    </div>
                    <div className="min-w-0">
                      <span ref={previewTextRef} className="font-semibold text-xs text-ink truncate block">
                        {title || block.title || 'Interactive Block Card'}
                      </span>
                      <span className="text-[10px] text-muted block truncate">
                        {selectedDef.name} · Hover & click to feel physics
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-indigo-600/30 text-accent-soft font-mono text-[10px] shrink-0 border border-indigo-500/20">
                    Active
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: `All (${ANIME_BLOCK_EFFECTS.length})` },
                { id: 'attention', label: `Ambient & Loops (${ANIME_BLOCK_EFFECTS.filter(e => e.category === 'attention').length})` },
                { id: 'entrance', label: `Entrance Reveals (${ANIME_BLOCK_EFFECTS.filter(e => e.category === 'entrance').length})` },
                { id: 'text', label: `Typography FX (${ANIME_BLOCK_EFFECTS.filter(e => e.category === 'text').length})` },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-surface text-muted hover:text-ink hover:bg-surface-2'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredEffects.map(effect => {
                const isSelected = animationEffect === effect.id;
                return (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => setAnimationEffect(effect.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-accent-surface border-indigo-500 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-950/40'
                        : 'bg-canvas border-line/80 hover:border-line-strong hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderEffectIcon(effect.iconName)}
                        <span className="text-xs font-semibold text-ink tracking-tight truncate">
                          {effect.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-body shrink-0">
                        {effect.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted line-clamp-2 leading-relaxed">
                      {effect.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Micro-Interaction & Physics Fine-Tuning Drawer */}
            <div className="border-t border-line/80 pt-3">
              <button
                type="button"
                onClick={() => setShowTuning(!showTuning)}
                className="w-full flex items-center justify-between text-xs text-body hover:text-ink font-medium cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                  <span>Fine-Tune Physics, Speed & Micro-Interactions</span>
                </div>
                {showTuning ? <ChevronUp className="w-4 h-4 text-subtle" /> : <ChevronDown className="w-4 h-4 text-subtle" />}
              </button>

              {showTuning && (
                <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-line animate-in fade-in duration-150">
                  {/* Speed */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted mb-1">Motion Speed</label>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                    >
                      <option value="slow">Slow & Cinematic (1.5x)</option>
                      <option value="normal">Balanced Normal (1.0x)</option>
                      <option value="fast">Snappy Fast (0.65x)</option>
                    </select>
                  </div>

                  {/* Intensity */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted mb-1">Physics Amplitude</label>
                    <select
                      value={intensity}
                      onChange={(e) => setIntensity(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                    >
                      <option value="subtle">Subtle & Gentle</option>
                      <option value="medium">Medium & Expressive</option>
                      <option value="expressive">High Energy Elastic</option>
                    </select>
                  </div>

                  {/* Hover Interaction */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted mb-1">Hover Micro-Physics</label>
                    <select
                      value={hoverEffect}
                      onChange={(e) => setHoverEffect(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                    >
                      {ANIME_HOVER_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Click Interaction */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted mb-1">Click / Tap Physics</label>
                    <select
                      value={clickEffect}
                      onChange={(e) => setClickEffect(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-line text-ink focus:outline-none"
                    >
                      {ANIME_CLICK_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visibility & Scheduling Section */}
          <div className="p-3.5 rounded-xl bg-canvas/70 border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-ink">Hide Block</span>
                <p className="text-[11px] text-muted">Temporarily unpublish from your live page</p>
              </div>
              <input
                type="checkbox"
                checked={isHidden}
                onChange={(e) => setIsHidden(e.target.checked)}
                className="w-4 h-4 rounded border-line-strong bg-surface text-accent focus:ring-0 cursor-pointer"
              />
            </div>

            <hr className="border-line" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  <span>Time-Based Scheduling</span>
                </span>
                <p className="text-[11px] text-muted">Set start and expiration dates for campaigns</p>
              </div>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-line-strong bg-surface text-accent focus:ring-0 cursor-pointer"
              />
            </div>

            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-line text-ink"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-line text-ink"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-body hover:text-ink bg-surface-2 hover:bg-surface-3 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-inverse-text bg-inverse hover:bg-inverse-hover rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
