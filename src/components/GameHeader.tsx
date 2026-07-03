import { OrnateButton } from "./ui/OrnateButton";
import { FACTION_EMBLEM } from "../constants/factionMeta";
import type { FactionState } from "../game/types";

interface GameHeaderProps {
  round: number;
  activeFaction: FactionState;
  winnerName: string | null;
  onRestart: () => void;
  onHome: () => void;
  onRules: () => void;
}

export function GameHeader({
  round,
  activeFaction,
  winnerName,
  onRestart,
  onHome,
  onRules,
}: GameHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-gold-frame/20 bg-gradient-to-r from-black/50 via-card-dark/80 to-black/50 px-3 py-2 shadow-panel backdrop-blur">
      <div className="min-w-0">
        <p className="text-[0.55rem] uppercase tracking-[0.22em] text-gold-frame/60">King Game</p>
        <div className="mt-0.5 flex items-center gap-2">
          <h2 className="whitespace-nowrap font-display text-xl leading-none text-amber-50">
            第 {round} 轮
          </h2>
          <span className="flex items-center gap-1 truncate rounded-full border border-amber-200/15 bg-black/30 px-2 py-0.5 text-xs font-semibold text-amber-100">
            <img src={FACTION_EMBLEM[activeFaction.id]} alt="" className="h-4 w-4 rounded-full object-cover" />
            {activeFaction.name}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {winnerName && (
          <span className="rounded-full bg-gradient-to-br from-gold-frame to-yellow-600 px-2.5 py-1 text-[0.65rem] font-bold text-stone-950 animate-glow-pulse">
            👑 {winnerName}
          </span>
        )}
        <OrnateButton size="sm" variant="ghost" onClick={onRestart}>重开</OrnateButton>
        <OrnateButton size="sm" variant="ghost" onClick={onHome}>首页</OrnateButton>
        <OrnateButton size="sm" variant="ghost" onClick={onRules}>规则</OrnateButton>
      </div>
    </header>
  );
}
