import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { Block, LinkBlockPayload } from '../../types';
import type { AnimeBlockEffect } from '../../types';
import type { StandardTheme } from '../../types/themeSchema';
import {
  applyBlockContinuousAnimation,
  stopBlockAnimation,
  triggerBlockClickFx,
  triggerBlockEntranceAnimation,
  triggerBlockHoverEnter,
  triggerBlockHoverLeave,
  triggerBlockTextAnimation
} from '../../utils/animeAnimations';

export interface AnimationTheme extends StandardTheme {
  accentColor?: string;
  animeMicroInteractions?: boolean;
}

interface AnimatedProfileBlockProps {
  block: Block;
  theme: AnimationTheme;
  className?: string;
  'data-variant-id'?: string;
  'data-block-style'?: string;
  children: React.ReactNode;
}

const ENTRANCE_EFFECTS: AnimeBlockEffect[] = ['springPop', 'elasticWave', 'backZoom', 'kineticDrop', 'cinematicGlide', 'flip3dX', 'flip3dY', 'spiralUnfold', 'blurFocus', 'slideSkew'];

export const AnimatedProfileBlock: React.FC<AnimatedProfileBlockProps> = ({ block, theme, className = '', 'data-variant-id': variantId, 'data-block-style': blockStyle, children }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { animationTrigger } = useApp();
  const legacyAnimation = (block.payload as Partial<LinkBlockPayload>).animation;
  const effect: AnimeBlockEffect = block.animationConfig?.effect || block.animation || (legacyAnimation === 'pulse' ? 'pulseGlow' : legacyAnimation === 'shimmer' ? 'shimmerGleam' : legacyAnimation === 'bounce' ? 'springBounce' : legacyAnimation || 'none');
  const hoverEffect = block.animationConfig?.hoverEffect || (theme.animeMicroInteractions !== false ? 'magneticLift' : 'none');
  const clickEffect = block.animationConfig?.clickEffect || 'rippleWave';
  const speed = block.animationConfig?.speed || 'normal';
  const intensity = block.animationConfig?.intensity || 'medium';

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    stopBlockAnimation(element);
    if (effect === 'none') return;
    const timer = window.setTimeout(() => animateBlock(element, block.title, effect, speed, intensity, theme.accentColor), 220);
    return () => { window.clearTimeout(timer); stopBlockAnimation(element); };
  }, [block.id, block.title, effect, speed, intensity, theme.accentColor, animationTrigger]);

  const handleMouseEnter = () => {
    if (theme.animeMicroInteractions === false || !elementRef.current) return;
    triggerBlockHoverEnter(elementRef.current, hoverEffect, theme.accentColor);
  };

  const handleMouseLeave = () => {
    if (theme.animeMicroInteractions === false || !elementRef.current) return;
    triggerBlockHoverLeave(elementRef.current, hoverEffect);
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (elementRef.current && clickEffect !== 'none') triggerBlockClickFx(event, elementRef.current, clickEffect, theme.accentColor);
  };

  return <div ref={elementRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleClick} className={`anime-profile-item ${className}`} data-block-id={block.id} data-variant-id={variantId} data-block-style={blockStyle} data-anime-effect={effect}>{children}</div>;
};

function animateBlock(element: HTMLElement, title: string, effect: AnimeBlockEffect, speed: 'slow' | 'normal' | 'fast', intensity: 'subtle' | 'medium' | 'expressive', accentColor?: string): void {
  if (effect === 'scrambleDecode' || effect === 'typewriterStagger' || effect === 'waveLetters') {
    const titleElement = element.querySelector('h1, h2, h3, h4, span.font-semibold') as HTMLElement | null;
    if (titleElement) triggerBlockTextAnimation(titleElement, titleElement.textContent || title, effect);
    return;
  }
  if (ENTRANCE_EFFECTS.includes(effect)) {
    triggerBlockEntranceAnimation(element, effect);
    return;
  }
  applyBlockContinuousAnimation(element, effect, speed, intensity, accentColor || '#6366f1');
}
