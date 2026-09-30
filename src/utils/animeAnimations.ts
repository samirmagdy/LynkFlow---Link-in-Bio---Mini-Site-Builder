import { animate, stagger } from 'animejs';
import type { AnimationParams, JSAnimation } from 'animejs';
import { 
  AnimeBlockEffect, 
  AnimeHoverEffect, 
  AnimeClickEffect, 
  AnimeEntrancePreset
} from '../types';
import { ANIME_ENTRANCE_PRESETS } from './animeCatalog';
export { ANIME_ENTRANCE_PRESETS, ANIME_BLOCK_EFFECTS, ANIME_HOVER_OPTIONS, ANIME_CLICK_OPTIONS } from './animeCatalog';
export type { AnimePresetConfig, BlockEffectMetadata } from './animeCatalog';

export type { AnimeEntrancePreset };

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


/* ==========================================================================
   ACTIVE ANIMATION REGISTRY & CLEANUP
   ========================================================================== */

const activeAnimationsMap = new WeakMap<HTMLElement, { stop: () => void }>();

export function stopBlockAnimation(element: HTMLElement | null) {
  if (!element) return;
  const existing = activeAnimationsMap.get(element);
  if (existing) {
    existing.stop();
    activeAnimationsMap.delete(element);
  }
}

/* ==========================================================================
   BLOCK CONTINUOUS ANIMATIONS ENGINE
   ========================================================================== */

export function applyBlockContinuousAnimation(
  element: HTMLElement | null,
  effect: AnimeBlockEffect,
  speed: 'slow' | 'normal' | 'fast' = 'normal',
  intensity: 'subtle' | 'medium' | 'expressive' = 'medium',
  accentColor: string = '#6366f1'
) {
  if (!element || effect === 'none') return null;

  // Stop previous animation on this element
  stopBlockAnimation(element);

  const speedMultipliers = { slow: 1.5, normal: 1.0, fast: 0.65 };
  const intensityMultipliers = { subtle: 0.6, medium: 1.0, expressive: 1.5 };

  const sm = speedMultipliers[speed] || 1;
  const im = intensityMultipliers[intensity] || 1;

  let animInstance: JSAnimation | null = null;

  switch (effect) {
    case 'pulseGlow': {
      const glowSpread = 16 * im;
      animInstance = animate(element, {
        scale: [1, 1 + 0.025 * im, 1],
        boxShadow: [
          `0 0 0px 0px ${accentColor}00`,
          `0 0 ${glowSpread}px ${glowSpread / 3}px ${accentColor}40`,
          `0 0 0px 0px ${accentColor}00`,
        ],
        duration: 2200 * sm,
        ease: 'inOutSine',
        loop: true,
      });
      break;
    }

    case 'floating': {
      const distance = 6 * im;
      animInstance = animate(element, {
        translateY: [-distance, distance],
        duration: 1800 * sm,
        direction: 'alternate',
        ease: 'inOutSine',
        loop: true,
      });
      break;
    }

    case 'heartbeat': {
      const scale1 = 1 + 0.05 * im;
      const scale2 = 1 + 0.025 * im;
      animInstance = animate(element, {
        keyframes: [
          { scale: 1, duration: 0 },
          { scale: scale1, duration: 160 * sm, ease: 'outExpo' },
          { scale: 1, duration: 140 * sm, ease: 'inQuad' },
          { scale: scale2, duration: 150 * sm, ease: 'outExpo' },
          { scale: 1, duration: 350 * sm, ease: 'inQuad' },
          { scale: 1, duration: 600 * sm }, // pause between beats
        ],
        loop: true,
      });
      break;
    }

    case 'rubberBand': {
      const sx = 1 + 0.08 * im;
      const sy = 1 - 0.08 * im;
      animInstance = animate(element, {
        keyframes: [
          { scaleX: 1, scaleY: 1, duration: 0 },
          { scaleX: sx, scaleY: sy, duration: 250 * sm, ease: 'outQuad' },
          { scaleX: 0.95, scaleY: 1.05, duration: 200 * sm, ease: 'inOutQuad' },
          { scaleX: 1.02, scaleY: 0.98, duration: 180 * sm, ease: 'outQuad' },
          { scaleX: 1, scaleY: 1, duration: 250 * sm, ease: 'outElastic(1, .5)' },
          { scaleX: 1, scaleY: 1, duration: 1000 * sm }, // rest
        ],
        loop: true,
      });
      break;
    }

    case 'gentleWobble': {
      const angle = 2.8 * im;
      animInstance = animate(element, {
        rotate: [-angle, angle],
        duration: 1400 * sm,
        direction: 'alternate',
        ease: 'inOutSine',
        loop: true,
      });
      break;
    }

    case 'jiggleAlert': {
      const shift = 4 * im;
      animInstance = animate(element, {
        keyframes: [
          { translateX: 0, duration: 0 },
          { translateX: -shift, duration: 60 * sm },
          { translateX: shift, duration: 60 * sm },
          { translateX: -shift * 0.7, duration: 60 * sm },
          { translateX: shift * 0.7, duration: 60 * sm },
          { translateX: -shift * 0.3, duration: 60 * sm },
          { translateX: 0, duration: 60 * sm },
          { translateX: 0, duration: 1400 * sm }, // rest pause
        ],
        loop: true,
      });
      break;
    }

    case 'springBounce': {
      const hop = 12 * im;
      animInstance = animate(element, {
        keyframes: [
          { translateY: 0, scaleY: 1, scaleX: 1, duration: 0 },
          { translateY: -hop, scaleY: 1.04, scaleX: 0.97, duration: 320 * sm, ease: 'outCubic' },
          { translateY: 0, scaleY: 0.94, scaleX: 1.06, duration: 280 * sm, ease: 'inCubic' },
          { translateY: -hop * 0.35, scaleY: 1.02, scaleX: 0.99, duration: 180 * sm, ease: 'outCubic' },
          { translateY: 0, scaleY: 0.98, scaleX: 1.02, duration: 160 * sm, ease: 'inCubic' },
          { translateY: 0, scaleY: 1, scaleX: 1, duration: 150 * sm, ease: 'outElastic(1, .5)' },
          { translateY: 0, scaleY: 1, scaleX: 1, duration: 1200 * sm }, // rest
        ],
        loop: true,
      });
      break;
    }

    case 'shimmerGleam': {
      // Dynamic shimmer sweep line created or animated via background gradient
      let shimmerOverlay = element.querySelector('.anime-shimmer-sweep') as HTMLElement;
      if (!shimmerOverlay) {
        shimmerOverlay = document.createElement('div');
        shimmerOverlay.className = 'anime-shimmer-sweep';
        shimmerOverlay.style.position = 'absolute';
        shimmerOverlay.style.inset = '0';
        shimmerOverlay.style.pointerEvents = 'none';
        shimmerOverlay.style.background = 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)';
        shimmerOverlay.style.zIndex = '5';
        shimmerOverlay.style.transform = 'translateX(-100%)';
        element.style.position = element.style.position || 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(shimmerOverlay);
      }
      animInstance = animate(shimmerOverlay, {
        translateX: ['-100%', '200%'],
        duration: 1800 * sm,
        ease: 'outExpo',
        loop: true,
        delay: 800,
      });
      break;
    }

    case 'rainbowBorder': {
      const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];
      animInstance = animate(element, {
        borderColor: colors,
        boxShadow: [
          '0 0 10px rgba(99, 102, 241, 0.3)',
          '0 0 10px rgba(236, 72, 153, 0.3)',
          '0 0 10px rgba(245, 158, 11, 0.3)',
          '0 0 10px rgba(16, 185, 129, 0.3)',
          '0 0 10px rgba(6, 182, 212, 0.3)',
          '0 0 10px rgba(99, 102, 241, 0.3)',
        ],
        duration: 3600 * sm,
        ease: 'linear',
        loop: true,
      });
      break;
    }

    case 'neonFlicker': {
      animInstance = animate(element, {
        opacity: [1, 0.75, 1, 0.6, 0.9, 0.55, 1, 0.85, 1],
        boxShadow: [
          `0 0 14px ${accentColor}66`,
          `0 0 4px ${accentColor}22`,
          `0 0 14px ${accentColor}66`,
          `0 0 2px ${accentColor}11`,
          `0 0 10px ${accentColor}44`,
          `0 0 1px ${accentColor}11`,
          `0 0 14px ${accentColor}66`,
          `0 0 8px ${accentColor}33`,
          `0 0 14px ${accentColor}66`,
        ],
        duration: 2000 * sm,
        ease: 'steps(8)',
        loop: true,
      });
      break;
    }

    case 'breathScale': {
      animInstance = animate(element, {
        scale: [1, 1 + 0.03 * im],
        duration: 2200 * sm,
        direction: 'alternate',
        ease: 'inOutSine',
        loop: true,
      });
      break;
    }

    case 'glitchShift': {
      const shiftX = 3 * im;
      animInstance = animate(element, {
        keyframes: [
          { translateX: 0, skewX: 0, duration: 0 },
          { translateX: -shiftX, skewX: -2, duration: 50 * sm },
          { translateX: shiftX, skewX: 2, duration: 50 * sm },
          { translateX: 0, skewX: 0, duration: 50 * sm },
          { translateX: -shiftX * 0.5, duration: 50 * sm },
          { translateX: 0, duration: 50 * sm },
          { translateX: 0, duration: 1800 * sm }, // rest
        ],
        loop: true,
      });
      break;
    }

    case 'radarPing': {
      const pulseSpread = 22 * im;
      animInstance = animate(element, {
        boxShadow: [
          `0 0 0 0px ${accentColor}88`,
          `0 0 0 ${pulseSpread}px ${accentColor}00`,
        ],
        duration: 1600 * sm,
        ease: 'outExpo',
        loop: true,
      });
      break;
    }

    case 'colorCycle': {
      const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#6366f1'];
      animInstance = animate(element, {
        borderColor: colors,
        duration: 4000 * sm,
        ease: 'linear',
        loop: true,
      });
      break;
    }

    case 'orbitGlow': {
      animInstance = animate(element, {
        boxShadow: [
          `3px 0 16px ${accentColor}66`,
          `0 3px 16px ${accentColor}66`,
          `-3px 0 16px ${accentColor}66`,
          `0 -3px 16px ${accentColor}66`,
          `3px 0 16px ${accentColor}66`,
        ],
        duration: 2800 * sm,
        ease: 'linear',
        loop: true,
      });
      break;
    }

    case 'pendulumSwing': {
      const maxAngle = 3.5 * im;
      animInstance = animate(element, {
        rotate: [-maxAngle, maxAngle],
        duration: 1600 * sm,
        direction: 'alternate',
        ease: 'inOutSine',
        loop: true,
      });
      break;
    }

    default:
      break;
  }

  if (animInstance) {
    activeAnimationsMap.set(element, {
      stop: () => {
        try {
          if (animInstance.pause) animInstance.pause();
          if (animInstance.cancel) animInstance.cancel();
        } catch (e) {
          // ignore
        }
        // Reset transforms
        element.style.transform = '';
        element.style.boxShadow = '';
      }
    });
  }

  return animInstance;
}

/* ==========================================================================
   BLOCK ENTRANCE & REVEAL ENGINE
   ========================================================================== */

export function triggerBlockEntranceAnimation(
  element: HTMLElement | null,
  effect: AnimeBlockEffect,
  options?: {
    duration?: number;
    delay?: number;
    onComplete?: () => void;
  }
) {
  if (!element || effect === 'none') return null;

  const duration = options?.duration;
  const delay = options?.delay ?? 0;
  const onComplete = options?.onComplete;

  const createEntrance = (params: Record<string, unknown>) => {
    const finalParams: Record<string, unknown> = {
      ...params,
      duration: duration || params.duration,
      delay,
    };
    if (onComplete) {
      finalParams.onComplete = onComplete;
    }
    return animate(element, finalParams as AnimationParams);
  };

  switch (effect) {
    case 'springPop':
      return createEntrance({
        opacity: [0, 1],
        scale: [0.88, 1],
        translateY: [20, 0],
        duration: 750,
        ease: 'outElastic(1.2, .5)',
      });

    case 'elasticWave':
      return createEntrance({
        opacity: [0, 1],
        translateY: [28, 0],
        scaleX: [0.95, 1],
        duration: 850,
        ease: 'outElastic(1, .45)',
      });

    case 'backZoom':
      return createEntrance({
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 650,
        ease: 'outBack(1.8)',
      });

    case 'kineticDrop':
      return createEntrance({
        opacity: [0, 1],
        translateY: [-35, 0],
        duration: 900,
        ease: 'outBounce',
      });

    case 'cinematicGlide':
      return createEntrance({
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        ease: 'outExpo',
      });

    case 'flip3dX':
      element.style.perspective = '1000px';
      return createEntrance({
        opacity: [0, 1],
        rotateX: [90, 0],
        translateY: [15, 0],
        duration: 800,
        ease: 'outExpo',
      });

    case 'flip3dY':
      element.style.perspective = '1000px';
      return createEntrance({
        opacity: [0, 1],
        rotateY: [90, 0],
        scale: [0.9, 1],
        duration: 850,
        ease: 'outExpo',
      });

    case 'spiralUnfold':
      return createEntrance({
        opacity: [0, 1],
        rotate: [-180, 0],
        scale: [0.2, 1],
        duration: 850,
        ease: 'outElastic(1.1, .55)',
      });

    case 'blurFocus':
      return createEntrance({
        opacity: [0, 1],
        filter: ['blur(14px)', 'blur(0px)'],
        scale: [1.04, 1],
        duration: 750,
        ease: 'outExpo',
      });

    case 'slideSkew':
      return createEntrance({
        opacity: [0, 1],
        translateX: [-45, 0],
        skewX: [-16, 0],
        duration: 700,
        ease: 'outExpo',
      });

    case 'zoomRotate':
      return createEntrance({
        opacity: [0, 1],
        rotate: [-45, 0],
        scale: [0.6, 1],
        duration: 800,
        ease: 'outCubic',
      });

    case 'cascadeStagger':
      return createEntrance({
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 750,
        ease: 'outQuart',
      });

    case 'swingDrop':
      return createEntrance({
        opacity: [0, 1],
        rotate: [-15, 0],
        translateY: [-35, 0],
        duration: 900,
        ease: 'outElastic(1.1, .4)',
      });

    case 'rubberSnap':
      return createEntrance({
        opacity: [0, 1],
        scaleX: [1.2, 1],
        scaleY: [0.8, 1],
        translateY: [20, 0],
        duration: 800,
        ease: 'outElastic(1.2, .5)',
      });

    case 'pulseExpand':
      return createEntrance({
        opacity: [0, 1],
        scale: [0.7, 1],
        duration: 750,
        ease: 'outBack(1.6)',
      });

    case 'curtainOpen':
      element.style.perspective = '800px';
      return createEntrance({
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 800,
        ease: 'outExpo',
      });

    case 'glitchFlicker':
      return createEntrance({
        opacity: [0, 1],
        translateX: [-8, 0],
        duration: 650,
        ease: 'steps(5)',
      });

    case 'floatAscend':
      return createEntrance({
        opacity: [0, 1],
        translateY: [35, 0],
        scale: [0.96, 1],
        duration: 950,
        ease: 'outCubic',
      });

    case 'snapScale':
      return createEntrance({
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: 550,
        ease: 'outBack(1.5)',
      });

    case 'smoothFade':
      return createEntrance({
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 600,
        ease: 'outQuad',
      });

    default:
      return null;
  }
}

/* ==========================================================================
   BLOCK TEXT SCRAMBLE & TYPOGRAPHY ENGINE
   ========================================================================== */

export function triggerBlockTextAnimation(
  element: HTMLElement | null,
  text: string,
  effect: AnimeBlockEffect
) {
  if (!element || !text) return null;

  if (effect === 'scrambleDecode') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>[]{}';
    const totalFrames = 20;
    let currentFrame = 0;
    const originalText = text;

    const interval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const revealedLength = Math.floor(progress * originalText.length);

      let scrambled = originalText.slice(0, revealedLength);
      for (let i = revealedLength; i < originalText.length; i++) {
        if (originalText[i] === ' ') {
          scrambled += ' ';
        } else {
          scrambled += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      element.textContent = scrambled;

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        element.textContent = originalText;
      }
    }, 40);

    return () => clearInterval(interval);
  }

  if (effect === 'typewriterStagger') {
    element.innerHTML = '';
    const spanList: HTMLSpanElement[] = [];
    for (const char of text) {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      element.appendChild(span);
      spanList.push(span);
    }

    return animate(spanList, {
      opacity: [0, 1],
      translateY: [4, 0],
      delay: stagger(30),
      duration: 300,
      ease: 'outExpo',
    });
  }

  if (effect === 'waveLetters') {
    element.innerHTML = '';
    const spanList: HTMLSpanElement[] = [];
    for (const char of text) {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      element.appendChild(span);
      spanList.push(span);
    }

    return animate(spanList, {
      translateY: [0, -6, 0],
      delay: stagger(45),
      duration: 600,
      ease: 'outElastic(1.2, .5)',
    });
  }

  if (effect === 'blurToClearText') {
    const words = text.split(' ');
    element.innerHTML = '';
    const spanList: HTMLSpanElement[] = [];
    words.forEach((word, idx) => {
      const span = document.createElement('span');
      span.textContent = word + (idx < words.length - 1 ? ' ' : '');
      span.style.display = 'inline-block';
      element.appendChild(span);
      spanList.push(span);
    });

    return animate(spanList, {
      opacity: [0, 1],
      filter: ['blur(10px)', 'blur(0px)'],
      translateY: [6, 0],
      delay: stagger(60),
      duration: 500,
      ease: 'outExpo',
    });
  }

  if (effect === 'fadeSlideWords') {
    const words = text.split(' ');
    element.innerHTML = '';
    const spanList: HTMLSpanElement[] = [];
    words.forEach((word, idx) => {
      const span = document.createElement('span');
      span.textContent = word + (idx < words.length - 1 ? ' ' : '');
      span.style.display = 'inline-block';
      element.appendChild(span);
      spanList.push(span);
    });

    return animate(spanList, {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(50),
      duration: 450,
      ease: 'outBack(1.4)',
    });
  }

  if (effect === 'neonTextFlicker') {
    return animate(element, {
      opacity: [0.3, 1, 0.6, 1, 0.4, 1],
      textShadow: [
        '0 0 4px #6366f1',
        '0 0 16px #6366f1, 0 0 30px #818cf8',
        '0 0 4px #6366f1',
        '0 0 20px #6366f1, 0 0 35px #818cf8',
      ],
      duration: 700,
      ease: 'steps(6)',
    });
  }

  return null;
}

/* ==========================================================================
   BLOCK HOVER & MICRO-INTERACTION ENGINE
   ========================================================================== */

export function triggerBlockHoverEnter(
  element: HTMLElement | null,
  hoverEffect: AnimeHoverEffect = 'magneticLift',
  accentColor: string = '#6366f1'
) {
  if (!element || hoverEffect === 'none') return null;

  switch (hoverEffect) {
    case 'magneticLift':
      return animate(element, {
        translateY: -4,
        scale: 1.02,
        duration: 350,
        ease: 'outElastic(1.1, .5)',
      });

    case 'tilt3d':
      element.style.perspective = '800px';
      return animate(element, {
        rotateX: -4,
        rotateY: 4,
        scale: 1.025,
        duration: 300,
        ease: 'outExpo',
      });

    case 'glowSurge':
      return animate(element, {
        boxShadow: `0 0 20px 2px ${accentColor}55`,
        translateY: -2,
        duration: 320,
        ease: 'outExpo',
      });

    case 'springPress':
      return animate(element, {
        scale: 0.98,
        duration: 150,
        ease: 'outQuad',
      });

    case 'rotatePlayful':
      return animate(element, {
        rotate: 3,
        scale: 1.02,
        duration: 300,
        ease: 'outBack(1.5)',
      });

    case 'harmonicPulse':
      return animate(element, {
        scale: [1, 1.03],
        direction: 'alternate',
        duration: 700,
        ease: 'inOutSine',
        loop: true,
      });

    case 'glitchMicro':
      return animate(element, {
        keyframes: [
          { translateX: -2, duration: 40 },
          { translateX: 2, duration: 40 },
          { translateX: -1, duration: 40 },
          { translateX: 0, duration: 40 },
        ],
      });

    case 'scalePop':
      return animate(element, {
        scale: 1.05,
        duration: 220,
        ease: 'outBack(1.8)',
      });

    case 'skewFloat':
      return animate(element, {
        translateY: -4,
        skewX: -3,
        duration: 280,
        ease: 'outExpo',
      });

    default:
      return null;
  }
}

export function triggerBlockHoverLeave(
  element: HTMLElement | null,
  hoverEffect: AnimeHoverEffect = 'magneticLift'
) {
  if (!element || hoverEffect === 'none') return null;

  return animate(element, {
    translateY: 0,
    rotateX: 0,
    rotateY: 0,
    rotate: 0,
    skewX: 0,
    scale: 1,
    boxShadow: 'none',
    duration: 400,
    ease: 'outElastic(1, .5)',
  });
}

/* ==========================================================================
   BLOCK CLICK TRIGGER & PHYSICS FX
   ========================================================================== */

export function triggerBlockClickFx(
  event: React.MouseEvent<HTMLElement> | MouseEvent | null,
  container: HTMLElement,
  clickEffect: AnimeClickEffect = 'rippleWave',
  accentColor: string = '#6366f1'
) {
  if (!container || clickEffect === 'none') return;

  switch (clickEffect) {
    case 'rippleWave': {
      const rect = container.getBoundingClientRect();
      const x = event ? event.clientX - rect.left : rect.width / 2;
      const y = event ? event.clientY - rect.top : rect.height / 2;

      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = '24px';
      ripple.style.height = '24px';
      ripple.style.marginLeft = '-12px';
      ripple.style.marginTop = '-12px';
      ripple.style.borderRadius = '50%';
      ripple.style.pointerEvents = 'none';
      ripple.style.backgroundColor = accentColor ? `${accentColor}44` : 'rgba(255, 255, 255, 0.3)';
      ripple.style.zIndex = '10';

      container.style.position = container.style.position || 'relative';
      container.style.overflow = 'hidden';
      container.appendChild(ripple);

      animate(ripple, {
        scale: [0, 18],
        opacity: [0.8, 0],
        duration: 650,
        ease: 'outExpo',
        onComplete: () => {
          if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        },
      });
      break;
    }

    case 'confettiBurst': {
      triggerSuccessBurst(container);
      break;
    }

    case 'shockwave': {
      const wave = document.createElement('div');
      wave.style.position = 'absolute';
      wave.style.inset = '0';
      wave.style.borderRadius = getComputedStyle(container).borderRadius || '12px';
      wave.style.border = `2px solid ${accentColor}`;
      wave.style.pointerEvents = 'none';
      wave.style.zIndex = '12';
      container.appendChild(wave);

      animate(wave, {
        scale: [1, 1.15],
        opacity: [0.9, 0],
        duration: 500,
        ease: 'outExpo',
        onComplete: () => {
          if (wave.parentNode) wave.parentNode.removeChild(wave);
        },
      });
      break;
    }

    case 'squashPop': {
      animate(container, {
        keyframes: [
          { scale: 0.94, duration: 90, ease: 'outQuad' },
          { scale: 1.04, duration: 180, ease: 'outElastic(1.2, .4)' },
          { scale: 1, duration: 150, ease: 'outQuad' },
        ],
      });
      break;
    }

    case 'flashBurst': {
      const flash = document.createElement('div');
      flash.style.position = 'absolute';
      flash.style.inset = '0';
      // A white flash disappears on light surfaces, so invert with the appearance.
      flash.style.backgroundColor = document.documentElement.dataset.theme === 'light'
        ? 'rgba(24, 24, 27, 0.16)'
        : 'rgba(255, 255, 255, 0.45)';
      flash.style.borderRadius = getComputedStyle(container).borderRadius || '12px';
      flash.style.pointerEvents = 'none';
      flash.style.zIndex = '15';
      container.appendChild(flash);
      animate(flash, {
        opacity: [1, 0],
        duration: 350,
        ease: 'outExpo',
        onComplete: () => {
          if (flash.parentNode) flash.parentNode.removeChild(flash);
        },
      });
      break;
    }

    case 'elasticBounce': {
      animate(container, {
        keyframes: [
          { scale: 0.88, duration: 100, ease: 'outQuad' },
          { scale: 1.08, duration: 220, ease: 'outElastic(1.3, .4)' },
          { scale: 1, duration: 160, ease: 'outQuad' },
        ],
      });
      break;
    }

    case 'stampPress': {
      animate(container, {
        keyframes: [
          { scale: 0.95, translateY: 3, duration: 80, ease: 'outQuad' },
          { scale: 1, translateY: 0, duration: 200, ease: 'outBack(1.6)' },
        ],
      });
      break;
    }

    case 'particleSparks': {
      triggerSuccessBurst(container);
      break;
    }

    case 'hapticVibrate': {
      animate(container, {
        keyframes: [
          { translateX: -3, duration: 30 },
          { translateX: 3, duration: 30 },
          { translateX: -2, duration: 30 },
          { translateX: 2, duration: 30 },
          { translateX: 0, duration: 30 },
        ],
      });
      break;
    }

    default:
      break;
  }
}

/* ==========================================================================
   EXISTING CORE ENGINE HELPERS (STAGGER, COUNTER, HERO, ACCORDION)
   ========================================================================== */

export function runStaggeredEntrance(
  elements: HTMLElement[] | NodeListOf<HTMLElement>,
  preset: AnimeEntrancePreset = 'springPop'
) {
  if (prefersReducedMotion() || !elements || elements.length === 0) return null;

  const config = ANIME_ENTRANCE_PRESETS[preset] || ANIME_ENTRANCE_PRESETS.springPop;
  const targetArray = Array.from(elements);

  const animParams: AnimationParams = {
    opacity: [0, 1],
    delay: stagger(config.staggerDelay, { start: 50 }),
    duration: config.duration,
    ease: config.ease,
  };

  switch (preset) {
    case 'springPop':
      animParams.translateY = [24, 0];
      animParams.scale = [0.92, 1];
      break;
    case 'elasticWave':
      animParams.translateY = [28, 0];
      break;
    case 'cinematicGlide':
      animParams.translateY = [32, 0];
      break;
    case 'backZoom':
      animParams.scale = [0.86, 1];
      animParams.translateY = [16, 0];
      break;
    case 'kineticDrop':
      animParams.translateY = [-36, 0];
      break;
    case 'flip3dX':
      targetArray.forEach(el => (el.style.perspective = '1000px'));
      animParams.rotateX = [85, 0];
      animParams.translateY = [16, 0];
      break;
    case 'flip3dY':
      targetArray.forEach(el => (el.style.perspective = '1000px'));
      animParams.rotateY = [85, 0];
      animParams.scale = [0.92, 1];
      break;
    case 'spiralUnfold':
      animParams.rotate = [-160, 0];
      animParams.scale = [0.4, 1];
      break;
    case 'blurFocus':
      animParams.filter = ['blur(14px)', 'blur(0px)'];
      animParams.scale = [1.03, 1];
      break;
    case 'slideSkew':
      animParams.translateX = [-40, 0];
      animParams.skewX = [-14, 0];
      break;
    case 'zoomRotate':
      animParams.rotate = [-40, 0];
      animParams.scale = [0.7, 1];
      break;
    case 'cascadeStagger':
      animParams.translateY = [36, 0];
      break;
    case 'swingDrop':
      animParams.rotate = [-14, 0];
      animParams.translateY = [-30, 0];
      break;
    case 'rubberSnap':
      animParams.scaleX = [1.18, 1];
      animParams.scaleY = [0.82, 1];
      animParams.translateY = [20, 0];
      break;
    case 'pulseExpand':
      animParams.scale = [0.75, 1];
      break;
    case 'curtainOpen':
      targetArray.forEach(el => (el.style.perspective = '800px'));
      animParams.scaleX = [0.1, 1];
      break;
    case 'glitchFlicker':
      animParams.translateX = [-6, 0];
      break;
    case 'floatAscend':
      animParams.translateY = [32, 0];
      animParams.scale = [0.97, 1];
      break;
    case 'snapScale':
      animParams.scale = [0.55, 1];
      break;
    case 'smoothFade':
      animParams.translateY = [10, 0];
      break;
    default:
      animParams.translateY = [20, 0];
      break;
  }

  return animate(targetArray, animParams);
}

export function animateCounter(
  element: HTMLElement | null,
  startVal: number,
  endVal: number,
  options?: {
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    ease?: string;
  }
) {
  if (prefersReducedMotion() || !element) return null;

  const duration = options?.duration ?? 1100;
  const decimals = options?.decimals ?? 0;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  const ease = options?.ease ?? 'outExpo';

  const counterObj = { value: startVal };

  return animate(counterObj, {
    value: endVal,
    duration,
    ease,
    onUpdate: () => {
      if (element) {
        const formatted = decimals > 0 
          ? counterObj.value.toFixed(decimals) 
          : Math.round(counterObj.value).toLocaleString();
        element.textContent = `${prefix}${formatted}${suffix}`;
      }
    },
  });
}

export function triggerAnimeRipple(
  event: React.MouseEvent<HTMLElement> | MouseEvent,
  container: HTMLElement,
  color: string = 'rgba(255, 255, 255, 0.25)'
) {
  if (prefersReducedMotion()) return;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.width = '24px';
  ripple.style.height = '24px';
  ripple.style.marginLeft = '-12px';
  ripple.style.marginTop = '-12px';
  ripple.style.borderRadius = '50%';
  ripple.style.pointerEvents = 'none';
  ripple.style.backgroundColor = color;
  ripple.style.zIndex = '10';

  container.style.position = container.style.position || 'relative';
  container.style.overflow = 'hidden';
  container.appendChild(ripple);

  animate(ripple, {
    scale: [0, 16],
    opacity: [0.7, 0],
    duration: 650,
    ease: 'outExpo',
    onComplete: () => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    },
  });
}

export function animateHoverEnter(element: HTMLElement | null) {
  if (prefersReducedMotion() || !element) return null;
  return animate(element, {
    scale: 1.02,
    translateY: -3,
    duration: 350,
    ease: 'outElastic(1, .5)',
  });
}

export function animateHoverLeave(element: HTMLElement | null) {
  if (prefersReducedMotion() || !element) return null;
  return animate(element, {
    scale: 1,
    translateY: 0,
    duration: 400,
    ease: 'outElastic(1, .5)',
  });
}

export function triggerSuccessBurst(container: HTMLElement) {
  if (prefersReducedMotion()) return;
  const count = 18;
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
  const particles: HTMLElement[] = [];

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.style.position = 'absolute';
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.width = `${Math.floor(Math.random() * 6 + 4)}px`;
    p.style.height = `${Math.floor(Math.random() * 6 + 4)}px`;
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.backgroundColor = colors[i % colors.length];
    p.style.pointerEvents = 'none';
    p.style.zIndex = '20';
    container.appendChild(p);
    particles.push(p);
  }

  animate(particles, {
    translateX: () => (Math.random() - 0.5) * 180,
    translateY: () => (Math.random() - 0.5) * 180 - 20,
    scale: [1, 0],
    opacity: [1, 0],
    rotate: () => Math.random() * 360,
    duration: 800,
    ease: 'outExpo',
    onComplete: () => {
      particles.forEach(p => {
        if (p.parentNode) p.parentNode.removeChild(p);
      });
    },
  });
}

export function animateBarFill(bars: HTMLElement[] | NodeListOf<HTMLElement>) {
  if (prefersReducedMotion() || !bars || bars.length === 0) return null;
  const targetArray = Array.from(bars);

  return animate(targetArray, {
    scaleX: [0, 1],
    transformOrigin: ['0% 50%', '0% 50%'],
    delay: stagger(60),
    duration: 800,
    ease: 'outExpo',
  });
}

export function animateIconBounce(element: HTMLElement | null) {
  if (prefersReducedMotion() || !element) return null;
  return animate(element, {
    scale: [1, 1.28, 0.95, 1.05, 1],
    rotate: [0, -12, 10, -5, 0],
    duration: 600,
    ease: 'outElastic(1.2, .45)',
  });
}

export function animateTableRowCascade(rows: HTMLElement[] | NodeListOf<HTMLElement>) {
  if (prefersReducedMotion() || !rows || rows.length === 0) return null;
  const targetArray = Array.from(rows);

  return animate(targetArray, {
    opacity: [0, 1],
    translateX: [-18, 0],
    delay: stagger(70, { start: 100 }),
    duration: 650,
    ease: 'outExpo',
  });
}

export function animateAccordionExpand(
  contentEl: HTMLElement | null, 
  onComplete?: () => void
) {
  if (prefersReducedMotion() || !contentEl) return null;
  contentEl.style.overflow = 'hidden';
  const targetHeight = contentEl.scrollHeight;

  return animate(contentEl, {
    height: [0, targetHeight],
    opacity: [0, 1],
    duration: 420,
    ease: 'outExpo',
    onComplete: () => {
      contentEl.style.height = 'auto';
      if (onComplete) onComplete();
    }
  });
}

export function animateHeroEntrance(container: HTMLElement | null) {
  if (prefersReducedMotion() || !container) return null;
  const elements = container.querySelectorAll<HTMLElement>('.anime-hero-item');
  if (elements.length === 0) return null;

  return animate(Array.from(elements), {
    translateY: [28, 0],
    scale: [0.96, 1],
    delay: stagger(80, { start: 100 }),
    duration: 850,
    ease: 'outElastic(1, .65)',
  });
}
