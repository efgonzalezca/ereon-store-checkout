import { useEffect, useRef } from 'react';
import './confirm-dialog.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClose={onCancel}
    >
      <h3 id="confirm-title" className="confirm-dialog__title">
        {title}
      </h3>
      <p id="confirm-message" className="confirm-dialog__message">
        {message}
      </p>
      <div className="confirm-dialog__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className="button button--primary"
          autoFocus
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}
