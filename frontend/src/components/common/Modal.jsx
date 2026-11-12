import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Global accessible Modal component for Vyapar Sangam.
 * Features:
 * - Clean rectangular card with 20px rounded corners.
 * - Responsive sizing (Mobile: calc(100% - 32px), Tablet/Desktop: 480px–640px).
 * - Max height 85vh with internal scrolling.
 * - Closes on backdrop click and Escape key.
 * - Prevents background page scrolling while open.
 * - Natural text wrapping and container-safe inputs/buttons.
 */
export default function Modal({
  isOpen = true,
  onClose,
  title,
  eyebrow,
  subtitle,
  children,
  maxWidth = "max-w-lg", // max-w-md (480px), max-w-lg (540px), max-w-xl (640px)
  className = "",
  showCloseButton = true,
}) {
  const modalRef = useRef(null);

  // Close on Escape key & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidth} bg-background border border-border rounded-modal shadow-2xl relative my-auto overflow-hidden flex flex-col max-h-[85vh] transition-all ${className}`}
        style={{
          width: "min(100%, 640px)",
          maxWidth: "calc(100vw - 32px)",
          borderRadius: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header section (if title or eyebrow provided) */}
        {(title || eyebrow || subtitle) && (
          <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-4 shrink-0 border-b border-border/40 relative">
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}

            {eyebrow && (
              <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
                {eyebrow}
              </p>
            )}
            {title && (
              <h3
                id="modal-title"
                className="font-display text-2xl font-light text-foreground pr-8 leading-snug"
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-body text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* If no header, keep close button floating in top-right */}
        {!title && !eyebrow && !subtitle && showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        )}

        {/* Scrollable Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto overscroll-contain flex-1 text-foreground font-body text-sm space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
