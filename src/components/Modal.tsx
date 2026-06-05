import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Max width class (e.g. max-w-md, max-w-2xl). Default max-w-lg. */
  maxWidth?: string;
  /** Close when clicking the dimmed area outside the panel. Default false. */
  closeOnBackdropClick?: boolean;
  /** Close when pressing Escape. Default true. */
  closeOnEscape?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  closeOnBackdropClick = false,
  closeOnEscape = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`bg-white border border-gray-200 rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 flex items-center justify-between flex-shrink-0 px-6 pt-5 pb-3 border-b border-gray-100 bg-white">
          {title ? (
            <h2 id="modal-title" className="m-0 text-lg font-semibold text-gray-800 pr-4">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 -mr-1.5 -mt-0.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} pointerEvents="none" />
          </button>
        </div>
        <div
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-5 ${title ? 'pt-4' : 'pt-3'}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
