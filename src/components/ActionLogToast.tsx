import { OrnateButton } from "./ui/OrnateButton";
import type { GameLogEntry } from "../game/types";

interface ActionLogToastProps {
  logs: GameLogEntry[];
  onDismiss: () => void;
}

export function ActionLogToast({ logs, onDismiss }: ActionLogToastProps) {
  if (logs.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center animate-fade-in">
      <div className="mx-auto flex max-h-[70dvh] w-full max-w-lg flex-col rounded-2xl border-2 border-gold-frame/25 bg-gradient-to-br from-[rgba(44,29,18,0.98)] to-[rgba(16,13,12,0.98)] p-4 shadow-panel animate-slide-up">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-gold-frame/50">Action</p>
            <h2 className="mt-0.5 font-display text-lg text-amber-50">本次操作</h2>
          </div>
          <OrnateButton variant="primary" size="sm" onClick={onDismiss}>
            知道了
          </OrnateButton>
        </div>
        <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
          {logs.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-gold-frame/10 bg-black/20 p-2.5 text-sm leading-6 text-amber-50">
              <div className="mb-1 flex items-center justify-between gap-3 text-[0.55rem] uppercase tracking-[0.18em] text-amber-100/40">
                <span>Round {entry.round}</span>
                <span>{entry.factionId ? `Faction ${entry.factionId}` : "System"}</span>
              </div>
              <p className="text-[0.75rem]">{entry.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
