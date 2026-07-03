import { ModalShell } from "./ModalShell";
import { OrnateButton } from "./ui/OrnateButton";
import type { FactionId, FactionState } from "../game/types";

interface ReviveModalProps {
  open: boolean;
  onClose: () => void;
  activeFaction: FactionState;
  defeatedFactions: FactionState[];
  getRestriction: (active: FactionState, target: FactionState) => string | null;
  onRevive: (targetId: FactionId) => void;
  hasWinner: boolean;
}

export function ReviveModal({
  open,
  onClose,
  activeFaction,
  defeatedFactions,
  getRestriction,
  onRevive,
  hasWinner,
}: ReviveModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="契约/复活" subtitle="Contract" variant="dark">
      <div className="space-y-2">
        {defeatedFactions.length === 0 && (
          <div className="rounded-lg border border-gold-frame/10 bg-black/20 p-4 text-xs leading-6 text-amber-100/40">
            暂无可复活阵营。阵营覆灭后会出现在这里。
          </div>
        )}
        {defeatedFactions.map((faction) => {
          const restriction = getRestriction(activeFaction, faction);
          return (
            <div key={faction.id} className="rounded-lg border border-gold-frame/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-amber-50">{faction.name}</h3>
                  <p className={`mt-1 text-[0.65rem] leading-5 ${restriction ? "text-red-400" : "text-amber-100/60"}`}>
                    {restriction ?? "可复活：复活者支付 30% 资产，对方签订 3 轮金币契约。"}
                  </p>
                </div>
                <OrnateButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onRevive(faction.id);
                    onClose();
                  }}
                  disabled={!!restriction || hasWinner}
                >
                  复活
                </OrnateButton>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
