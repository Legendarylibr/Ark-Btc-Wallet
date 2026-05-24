"use client";

import { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleFocusTrap } from "@/lib/focus-trap";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const prev = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const panel = panelRef.current;
      if (panel) handleFocusTrap(panel, e);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-cash-gray border-t border-white/5 shadow-2xl",
              "max-h-[92dvh] flex flex-col",
              className,
            )}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
              {title ? (
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-full bg-cash-gray-2 flex items-center justify-center text-cash-muted hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
