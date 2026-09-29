import React, { useEffect, useRef, useState } from 'react';
import './landingMotionBackground.css';

/** Low-cost CSS ambience for the landing page; no extra render loop. */
export const LandingMotionBackground: React.FC = () => {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsPaused(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);

    // Deterministic screenshot support: /?bgT=13 freezes the mesh at 13 seconds.
    const requestedTime = new URLSearchParams(window.location.search).get('bgT');
    if (requestedTime !== null && Number.isFinite(Number(requestedTime))) {
      const node = backgroundRef.current;
      if (node) {
        node.style.animationDelay = `-${Number(requestedTime)}s`;
        node.style.animationPlayState = 'paused';
      }
    }

    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return (
    <div ref={backgroundRef} className={`landing-motion-background${isPaused ? ' is-paused' : ''}`} aria-hidden="true">
      <div className="landing-motion-background__scrim" />
      <div className="landing-motion-background__grain" />
    </div>
  );
};

