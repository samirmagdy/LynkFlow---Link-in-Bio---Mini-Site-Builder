import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-6 right-6 z-50 max-w-[min(24rem,calc(100vw-2rem))] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-200 pointer-events-none">
      <div className="bg-surface/95 text-ink text-xs font-medium px-4 py-2.5 rounded-lg border border-line shadow-xl flex items-center gap-2.5 backdrop-blur-md">
        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
};
