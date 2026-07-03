import type { CardInstance } from "../game/types";
import { CARD_DEFINITIONS } from "../game/cards";
import { HandCard } from "./HandCard";

interface HandCardAreaProps {
  hand: CardInstance[];
  selectedCardId: string | null;
  onSelectCard: (instanceId: string | null) => void;
  discardNeeded: number;
}

export function HandCardArea({ hand, selectedCardId, onSelectCard, discardNeeded }: HandCardAreaProps) {
  const selectedCard = hand.find((c) => c.instanceId === selectedCardId);
  const selectedDef = selectedCard ? CARD_DEFINITIONS[selectedCard.cardId] : null;

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-100/80">手牌</span>
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-[0.6rem] font-bold text-amber-200/70">
            {hand.length} 张
          </span>
          {discardNeeded > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[0.6rem] font-bold text-red-300 animate-pulse">
              需弃 {discardNeeded}
            </span>
          )}
        </div>
        {selectedDef && (
          <span className="max-w-[55%] truncate text-[0.6rem] text-amber-100/50">
            {selectedDef.description}
          </span>
        )}
      </div>

      {/* Card row */}
      <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory px-1 pb-2 pt-1">
        {hand.length === 0 && (
          <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-amber-200/15 bg-black/20 px-4 py-6 text-xs text-amber-100/30">
            暂无手牌
          </div>
        )}
        {hand.map((card) => (
          <HandCard
            key={card.instanceId}
            card={card}
            selected={card.instanceId === selectedCardId}
            onSelect={() =>
              onSelectCard(card.instanceId === selectedCardId ? null : card.instanceId)
            }
          />
        ))}
      </div>
    </div>
  );
}
