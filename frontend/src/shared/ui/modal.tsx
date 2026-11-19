import { ReactNode, useEffect, useRef } from 'react';
import './modal.css';

interface ModalProps {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ labelledBy, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<Element | null>(null);
  const scrollbarWidthRef = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.documentElement;
    openerRef.current ??= document.activeElement;
    scrollbarWidthRef.current ??= window.innerWidth - root.clientWidth;
    root.style.setProperty(
      '--scrollbar-offset',
      `${scrollbarWidthRef.current}px`,
    );
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      root.style.removeProperty('--scrollbar-offset');
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClose={onClose}
    >
      <div className="modal__content">
        <button
          type="button"
          className="modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
