import React, { useRef, useEffect } from 'react';
import { Block, BlockType, AnimeBlockEffect, LinkBlockPayload } from '../../types';
import { animate, stagger } from 'animejs';
import { 
  ANIME_BLOCK_EFFECTS,
  triggerBlockEntranceAnimation,
  applyBlockContinuousAnimation,
  stopBlockAnimation,
  triggerBlockClickFx
} from '../../utils/animeAnimations';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Edit3, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  BarChart2, 
  Calendar,
  Link2,
  Video,
  Type,
  FolderTree,
  HelpCircle,
  Quote,
  FileDown,
  MailCheck,
  PhoneCall,
  Minus,
  Sparkles,
  Play
  ,Images
  ,GalleryHorizontal
  ,ShoppingBag
  ,HandCoins
  ,Pin
} from 'lucide-react';
import { ProductIllustration } from '../illustration/ProductIllustration';

interface BlockListProps {
  blocks: Block[];
  onEditBlock: (block: Block) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onToggleHide: (block: Block) => void;
  onTogglePin: (block: Block) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export const BlockList: React.FC<BlockListProps> = ({
  blocks,
  onEditBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onToggleHide,
  onTogglePin,
  onMoveUp,
  onMoveDown,
  onReorder
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null);
  const touchDragRef = useRef<{ index: number; pointerId: number } | null>(null);
  const touchDropRef = useRef<{ index: number; position: 'before' | 'after' } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const getActiveAnimationEffect = (b: Block): AnimeBlockEffect => {
    if (b.animationConfig?.effect && b.animationConfig.effect !== 'none') {
      return b.animationConfig.effect;
    }
    if (b.animation && b.animation !== 'none') {
      return b.animation;
    }
    const payloadAnim = (b.payload as Partial<LinkBlockPayload>).animation;
    if (payloadAnim && payloadAnim !== 'none') {
      if (payloadAnim === 'pulse') return 'pulseGlow';
      if (payloadAnim === 'shimmer') return 'shimmerGleam';
      if (payloadAnim === 'bounce') return 'springBounce';
      return payloadAnim as AnimeBlockEffect;
    }
    return 'none';
  };

  const handleTestBlockAnimation = (e: React.MouseEvent<HTMLElement>, block: Block) => {
    e.stopPropagation();
    const anim = getActiveAnimationEffect(block);
    const cardEl = (e.currentTarget.closest('.anime-editor-block') as HTMLElement);
    if (!cardEl) return;
    
    stopBlockAnimation(cardEl);
    if (anim === 'none') {
      triggerBlockClickFx(e, cardEl, 'squashPop', '#6366f1');
    } else {
      const def = ANIME_BLOCK_EFFECTS.find(x => x.id === anim);
      if (def?.category === 'entrance') {
        triggerBlockEntranceAnimation(cardEl, anim);
      } else {
        applyBlockContinuousAnimation(cardEl, anim, 'fast', 'expressive', '#6366f1');
        setTimeout(() => stopBlockAnimation(cardEl), 2400);
      }
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLElement>('.anime-editor-block');
      if (items.length > 0) {
        animate(Array.from(items), {
          opacity: [0, 1],
          translateY: [10, 0],
          delay: stagger(35),
          duration: 450,
          ease: 'outExpo'
        });
      }
    }
  }, [blocks.length]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const isAfter = e.clientY > midPoint;

    setDragOverIndex(index);
    setDropPosition(isAfter ? 'after' : 'before');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the card boundary completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || onReorder === undefined) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    let toIndex = targetIndex;
    if (dropPosition === 'after' && draggedIndex < targetIndex) {
      toIndex = targetIndex;
    } else if (dropPosition === 'after' && draggedIndex > targetIndex) {
      toIndex = targetIndex + 1;
    } else if (dropPosition === 'before' && draggedIndex < targetIndex) {
      toIndex = targetIndex - 1;
    } else if (dropPosition === 'before' && draggedIndex > targetIndex) {
      toIndex = targetIndex;
    }

    if (toIndex >= 0 && toIndex < blocks.length && toIndex !== draggedIndex) {
      onReorder(draggedIndex, toIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  // HTML5 drag events do not consistently fire on mobile browsers. Keep the
  // same reorder semantics with a pointer gesture started from the grip.
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (e.pointerType === 'mouse' || onReorder === undefined) return;
    e.preventDefault();
    touchDragRef.current = { index, pointerId: e.pointerId };
    touchDropRef.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = touchDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-block-index]');
    const targetIndex = target ? Number(target.dataset.blockIndex) : NaN;
    if (!target || !Number.isInteger(targetIndex) || targetIndex === drag.index) {
      touchDropRef.current = null;
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const position = e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
    touchDropRef.current = { index: targetIndex, position };
    setDragOverIndex(targetIndex);
    setDropPosition(position);
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    const drag = touchDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const drop = touchDropRef.current;
    if (drop && onReorder) {
      let toIndex = drop.index;
      if (drop.position === 'after' && drag.index > drop.index) toIndex += 1;
      if (drop.position === 'before' && drag.index < drop.index) toIndex -= 1;
      if (toIndex >= 0 && toIndex < blocks.length && toIndex !== drag.index) onReorder(drag.index, toIndex);
    }
    touchDragRef.current = null;
    touchDropRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };
  const getBlockIcon = (type: BlockType) => {
    const props = { className: 'w-4 h-4' };
    switch (type) {
      case 'link': return <Link2 {...props} className="w-4 h-4 text-accent" />;
      case 'media': return <Video {...props} className="w-4 h-4 text-danger" />;
      case 'gallery': return <Images {...props} className="w-4 h-4 text-accent-soft" />;
      case 'carousel': return <GalleryHorizontal {...props} className="w-4 h-4 text-warning" />;
      case 'product': return <ShoppingBag {...props} className="w-4 h-4 text-lime-400" />;
      case 'tip': return <HandCoins {...props} className="w-4 h-4 text-warning" />;
      case 'text': return <Type {...props} className="w-4 h-4 text-body" />;
      case 'folder': return <FolderTree {...props} className="w-4 h-4 text-warning" />;
      case 'faq': return <HelpCircle {...props} className="w-4 h-4 text-accent-soft" />;
      case 'testimonial': return <Quote {...props} className="w-4 h-4 text-danger" />;
      case 'file': return <FileDown {...props} className="w-4 h-4 text-info" />;
      case 'form': return <MailCheck {...props} className="w-4 h-4 text-success" />;
      case 'emailSignup': return <MailCheck {...props} className="w-4 h-4 text-success" />;
      case 'contact': return <PhoneCall {...props} className="w-4 h-4 text-info" />;
      case 'divider': return <Minus {...props} className="w-4 h-4 text-muted" />;
    }
  };

  if (blocks.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-line bg-canvas/40 text-center">
        <div className="max-w-xs mx-auto mb-4">
          <ProductIllustration variant="empty-blocks" />
        </div>
        <p className="text-xs text-muted mb-1">No blocks added to this tab yet</p>
        <p className="text-[11px] text-subtle">Click "+ Add Block" above to add your first link, media embed, or form</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="space-y-2.5">
      {blocks.map((block, index) => {
        const isFirst = index === 0;
        const isLast = index === blocks.length - 1;

        return (
          <div
            key={block.id}
            data-block-index={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`anime-editor-block p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 group relative select-none ${
              draggedIndex === index
                ? 'opacity-40 border-dashed border-indigo-500 bg-indigo-500/10 scale-[0.98]'
                : block.isHidden 
                ? 'bg-canvas/40 border-line opacity-60' 
                : 'bg-surface/90 border-line hover:border-line-strong'
            }`}
          >
            {/* Visual drop indicator bar */}
            {dragOverIndex === index && draggedIndex !== index && (
              <div 
                className={`absolute left-0 right-0 h-1 bg-indigo-500 rounded-full shadow-md shadow-indigo-500/50 pointer-events-none z-10 ${
                  dropPosition === 'before' ? '-top-1' : '-bottom-1'
                }`}
              />
            )}

            {/* Left: Drag Handle, Reorder Arrows & Icon */}
            <div className="flex items-center gap-2">
              {/* Dedicated Drag Grip Handle */}
              <div 
                className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-subtle hover:text-body transition-colors shrink-0"
                title="Drag to reorder"
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Accessible Reorder Arrows (Keyboard/Quick fallback) */}
              <div className="flex flex-col text-subtle">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => onMoveUp(index)}
                  aria-label={`Move ${block.title} up`}
                  className={`p-0.5 hover:text-ink transition-colors cursor-pointer ${isFirst ? 'opacity-20 cursor-not-allowed' : ''}`}
                  title="Move Up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => onMoveDown(index)}
                  aria-label={`Move ${block.title} down`}
                  className={`p-0.5 hover:text-ink transition-colors cursor-pointer ${isLast ? 'opacity-20 cursor-not-allowed' : ''}`}
                  title="Move Down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 rounded-lg bg-canvas border border-line shrink-0">
                {getBlockIcon(block.type)}
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-ink tracking-tight truncate max-w-[200px] sm:max-w-xs">
                    {block.title}
                  </span>
                  {block.isHidden && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-2 text-muted">
                      Hidden
                    </span>
                  )}
                  {block.schedule?.enabled && (
                    <span className="text-[10px] text-accent flex items-center gap-0.5" title="Scheduled">
                      <Calendar className="w-3 h-3" />
                      <span>Scheduled</span>
                    </span>
                  )}
                  {(() => {
                    const anim = getActiveAnimationEffect(block);
                    if (anim === 'none') return null;
                    const def = ANIME_BLOCK_EFFECTS.find(x => x.id === anim);
                    return (
                      <span 
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/20 text-accent-soft border border-indigo-500/30"
                        title={`Anime.js: ${def?.name || anim}`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-accent" />
                        <span className="truncate max-w-[120px]">{def?.name || anim}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                  <span className="capitalize">{block.type}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <BarChart2 className="w-3 h-3 text-subtle" />
                    <span>{block.clicks} clicks</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handleTestBlockAnimation(e, block)}
                aria-label={`Test animation for ${block.title}`}
                title="Test Anime.js Motion FX"
                className="p-1.5 rounded-lg text-accent hover:text-white hover:bg-indigo-950 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onTogglePin(block)}
                aria-label={block.pinned ? `Unpin ${block.title}` : `Pin ${block.title} to the top`}
                title={block.pinned ? 'Remove from top' : 'Keep at top'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${block.pinned ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent hover:bg-surface-2'}`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onToggleHide(block)}
                aria-label={block.isHidden ? `Show ${block.title}` : `Hide ${block.title}`}
                title={block.isHidden ? 'Show on page' : 'Hide from page'}
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                {block.isHidden ? <EyeOff className="w-4 h-4 text-warning" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => onEditBlock(block)}
                aria-label={`Edit ${block.title}`}
                title="Edit block settings"
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onDuplicateBlock(block.id)}
                aria-label={`Duplicate ${block.title}`}
                title="Duplicate block"
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer hidden sm:inline-flex"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onRemoveBlock(block.id)}
                aria-label={`Delete ${block.title}`}
                title="Delete block"
                className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
