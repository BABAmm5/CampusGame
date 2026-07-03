import { ModalShell } from "./ModalShell";
import { StatCard } from "./StatCard";
import { FACTION_SKILL_DESCRIPTIONS } from "../constants/skillDescriptions";
import { FACTION_EMBLEM } from "../constants/factionMeta";
import type { FactionState } from "../game/types";

interface FactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  factions: FactionState[];
  activeFactionId: number;
}

export function FactionDetailModal({ open, onClose, factions, activeFactionId }: FactionDetailModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="阵营详情" subtitle="Factions" variant="dark">
      <div className="grid gap-3 sm:grid-cols-2">
        {factions.map((faction) => {
          const penaltyTarget = faction.attackPenaltyAgainst
            ? factions.find((f) => f.id === faction.attackPenaltyAgainst)
            : null;
          const tributeTarget = faction.revivalTributeTo
            ? factions.find((f) => f.id === faction.revivalTributeTo)
            : null;

          return (
            <div key={faction.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src={FACTION_EMBLEM[faction.id]}
                  alt={faction.name}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-gold-frame/30"
                  style={{ filter: `drop-shadow(0 0 8px rgba(201,168,76,0.3))` }}
                />
                <h3 className="font-display text-lg font-bold text-amber-50">{faction.name}</h3>
              </div>
              <StatCard faction={faction} isActive={faction.id === activeFactionId} />
              <div className="rounded-lg border border-gold-frame/10 bg-black/20 p-2.5 text-[0.65rem] leading-5 text-amber-100/60">
                <p>{FACTION_SKILL_DESCRIPTIONS[faction.id]}</p>
                {penaltyTarget && faction.attackPenaltyPercent > 0 && (
                  <p className="mt-1 font-semibold text-red-400">
                    攻击 {penaltyTarget.name} 时攻击力减少 {faction.attackPenaltyPercent}%。
                  </p>
                )}
                {tributeTarget && (
                  <p className="mt-1 font-semibold text-amber-200">
                    复活契约：向 {tributeTarget.name} 上交 30% 金币，剩余 {faction.revivalTributeRoundsRemaining} 轮。
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
