import { X } from 'lucide-react';

// Shared modal shell: responsive backdrop padding + card padding (tighter on
// phones, roomier from sm: up) and a properly-sized, accessible close button —
// the pattern several client pages (Journal, PartsStudio, MicroLearning,
// PartsMapping, LearningModuleEnhanced) previously hand-rolled with fixed
// desktop-sized padding and a bare, unsized "×" close glyph.
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  cardClassName = '',
  labelledBy,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl p-4 shadow-xl sm:p-6 ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
            {title && <h3 id={labelledBy} className="text-lg font-semibold sm:text-xl">{title}</h3>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2.5 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
