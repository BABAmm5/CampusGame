import { ModalShell } from "./ModalShell";
import type { GameLogEntry } from "../game/types";

interface BattleLogModalProps {
  open: boolean;
  onClose: () => void;
  logs: GameLogEntry[];
}

export function BattleLogModal({ open, onClose, logs }: BattleLogModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="战报" subtitle="Battle Log" variant="dark">
      <div className="space-y-2">
        {logs.length === 0 && (
          <p className="text-xs text-amber-100/30">暂无战报。</p>
        )}
        {logs.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-gold-frame/10 bg-black/20 p-2.5 text-sm leading-6 text-amber-50">
            <div className="mb-1 flex items-center justify-between gap-3 text-[0.6rem] uppercase tracking-[0.18em] text-amber-100/40">
              <span>Round {entry.round}</span>
              <span>{entry.factionId ? `Faction ${entry.factionId}` : "System"}</span>
            </div>
            <p className="text-[0.75rem]">{entry.message}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
