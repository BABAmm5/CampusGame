import { CARD_DEFINITIONS } from "../game/cards";
import type { CardInstance, CardType } from "../game/types";

interface HandCardProps {
  card: CardInstance;
  selected: boolean;
  onSelect: () => void;
}

const typeConfig: Record<CardType, { label: string; border: string; bg: string; icon: string }> = {
  scheme: { label: "锦囊", border: "border-purple-500", bg: "from-purple-900/30 to-purple-950/50", icon: "📜" },
  equipment: { label: "装备", border: "border-blue-500", bg: "from-blue-900/30 to-blue-950/50", icon: "⚙" },
  battle: { label: "战斗", border: "border-red-500", bg: "from-red-900/30 to-red-950/50", icon: "⚔" },
  weapon: { label: "武器", border: "border-orange-500", bg: "from-orange-900/30 to-orange-950/50", icon: "🗡" },
};

export function HandCard({ card, selected, onSelect }: HandCardProps) {
  const definition = CARD_DEFINITIONS[card.cardId];
  const config = typeConfig[definition.type];

  return (
    <button
      onClick={onSelect}
      className={`relative min-w-[5.5rem] max-w-[7rem] flex-shrink-0 snap-center overflow-hidden rounded-xl border-2 transition-all duration-200 ${config.border} ${
        selected
          ? "-translate-y-4 scale-105 shadow-card-hover"
          : "hover:-translate-y-1 hover:shadow-md"
      }`}
      style={{
        background: selected
          ? `linear-gradient(145deg, rgba(201,168,76,0.3), rgba(60,40,20,0.95))`
          : `linear-gradient(145deg, rgba(50,35,20,0.95), rgba(25,18,12,0.98))`,
        boxShadow: selected
          ? "0 0 20px rgba(201,168,76,0.5), 0 8px 25px rgba(0,0,0,0.4)"
          : undefined,
      }}
    >
      {/* Type accent */}
      <div className={`h-6 bg-gradient-to-br ${config.bg} flex items-center justify-center gap-1 px-1.5`}>
        <span className="text-xs">{config.icon}</span>
        <span className="text-[0.5rem] font-bold uppercase tracking-wider text-white/60">
          {config.label}
        </span>
      </div>

      {/* Card body */}
      <div className="px-1.5 py-1.5">
        <h4 className="truncate text-[0.68rem] font-bold text-amber-50">{definition.name}</h4>
        <p className="mt-0.5 line-clamp-2 text-[0.5rem] leading-tight text-amber-100/50">
          {definition.description}
        </p>
      </div>

      {/* Exempt badge */}
      {card.exemptFromHandLimit && (
        <div className="absolute right-1 top-1 rounded-full bg-gold-frame/80 px-1 py-0.5 text-[0.45rem] font-bold text-stone-950">
          免上限
        </div>
      )}
    </button>
  );
}
