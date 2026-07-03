import { type ReactNode } from "react";
import { CardFrame } from "./CardFrame";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  variant?: "light" | "dark";
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
  variant = "dark",
}: ModalShellProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70 p-3 backdrop-blur-sm animate-fade-in sm:items-center sm:justify-center">
      <CardFrame
        variant={variant}
        size="lg"
        className={`mx-auto flex w-full ${maxWidth} flex-col animate-slide-up shadow-panel`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            {subtitle && (
              <p className={`text-[0.65rem] uppercase tracking-[0.24em] ${
                variant === "dark" ? "text-amber-300/60" : "text-stone-500"
              }`}>
                {subtitle}
              </p>
            )}
            <h2 className={`mt-0.5 font-display text-xl ${
              variant === "dark" ? "text-amber-50" : "text-stone-900"
            }`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-800 text-xs font-bold text-white shadow-gem transition-transform hover:scale-110 active:scale-95"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </CardFrame>
    </div>
  );
}
