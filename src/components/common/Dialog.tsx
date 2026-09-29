import React, { useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  labelledBy: string;
  describedBy?: string;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** Shared accessible dialog behavior for modal surfaces across the product. */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  labelledBy,
  describedBy,
  children,
  className = '',
  overlayClassName = ''
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first || dialogRef.current)?.focus();
    };
    const frame = window.requestAnimationFrame(focusFirst);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in duration-150 ${overlayClassName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        data-dialog-managed="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={className}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Compatibility boundary for older feature overlays that already expose
 * role="dialog" but have not yet been migrated to <Dialog />.
 */
export const DialogFocusManager: React.FC = () => {
  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let previousActiveElement: HTMLElement | null = null;
    let previousOverflow = '';

    const getDialog = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]:not([data-dialog-managed="true"])'));
      return dialogs[dialogs.length - 1] || null;
    };

    const sync = () => {
      const nextDialog = getDialog();
      if (nextDialog === activeDialog) return;

      if (activeDialog) {
        document.body.style.overflow = previousOverflow;
        previousActiveElement?.focus();
      }

      activeDialog = nextDialog;
      if (!activeDialog) return;

      previousOverflow = document.body.style.overflow;
      previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.style.overflow = 'hidden';

      const first = activeDialog.querySelector<HTMLElement>(FOCUSABLE);
      window.requestAnimationFrame(() => (first || activeDialog)?.focus());
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeDialog) return;
      if (event.key === 'Escape') {
        const closeButton = activeDialog.querySelector<HTMLButtonElement>('[aria-label*="close" i]');
        if (closeButton) {
          event.preventDefault();
          closeButton.click();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role'] });
    document.addEventListener('keydown', handleKeyDown);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
      if (activeDialog) document.body.style.overflow = previousOverflow;
    };
  }, []);

  return null;
};
