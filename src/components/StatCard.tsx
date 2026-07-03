import { useRef, type MouseEvent } from "react";
import type { FactionState } from "../game/types";
import { FACTION_COLOR_MAP, FACTION_EMBLEM } from "../constants/factionMeta";

interface StatCardProps {
  faction: FactionState;
  isActive: boolean;
  compact?: boolean;
}

export function StatCard({ faction, isActive, compact = false }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const colors = FACTION_COLOR_MAP[faction.id];

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg)";
  };

  const stats = [
    { label: "\u2764", value: `${faction.hp}/${faction.maxHp}`, color: "text-red-300" },
    { label: "\uD83D\uDCB0", value: faction.gold, color: "text-yellow-300" },
    // 附属阵营显示特殊单位，主阵营显示民/兵
    ...(faction.id === 5
      ? [{ label: "🚩", value: faction.flags, color: "text-violet-300" }]
      : faction.id === 6
        ? [{ label: "🏚", value: faction.stockpile, color: "text-teal-300" }]
        : faction.id === 7
          ? [{ label: "📖", value: faction.scholars, color: "text-indigo-300" }]
          : faction.id === 8
            ? [{ label: "👻", value: faction.retainers, color: "text-gray-300" }]
            : [
                { label: "\uD83D\uDC65", value: faction.civilians, color: "text-blue-300" },
                { label: "\u2694", value: faction.soldiers, color: "text-orange-300" },
              ]
    ),
    { label: "\uD83D\uDDE1", value: faction.weaponAttack, color: "text-purple-300" },
    { label: "\uD83D\uDEE1", value: faction.armor, color: "text-cyan-300" },
    { label: "\uD83C\uDCCF", value: faction.hand.length, color: "text-amber-200" },
  ];

  // 附属阵营所属主阵营标识
  const ownerLabel = faction.id >= 5 && faction.ownerFactionId
    ? `归属: 阵营${faction.ownerFactionId}`
    : null;

  const statusLabel = faction.awakened
    ? "\u89C9\u9192"
    : isActive
      ? "\u884C\u52A8\u4E2D"
      : faction.alive
        ? "\u5F85\u547D"
        : "\u8986\u706D";

  const statusColor = faction.awakened
    ? "from-gold-frame to-yellow-600 text-stone-950"
    : isActive
      ? "from-green-500 to-emerald-700 text-white"
      : faction.alive
        ? "from-gray-400/50 to-gray-600/50 text-gray-200"
        : "from-red-900/60 to-red-950/60 text-red-300";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
        compact ? "p-1.5" : "p-2"
      } ${
        !faction.alive
          ? "border-red-900/30 opacity-50 grayscale"
          : isActive
            ? "animate-float"
            : "border-gold-frame/25"
      }`}
      style={{
        background: `linear-gradient(145deg, rgba(60,40,20,0.95), rgba(25,18,12,0.98))`,
        borderColor: isActive ? colors.accent : undefined,
        boxShadow: isActive
          ? `0 0 22px ${colors.glow}, 0 8px 25px rgba(0,0,0,0.4)`
          : faction.awakened
            ? "0 0 16px rgba(201,168,76,0.4)"
            : "0 4px 15px rgba(0,0,0,0.3)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)` }}
      />

      {/* Faction header */}
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <img
            src={FACTION_EMBLEM[faction.id]}
            alt={faction.name}
            className="h-7 w-7 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 1px ${colors.accent}, 0 0 6px ${colors.glow}` }}
          />
          <div className="min-w-0">
            <p className="text-[0.5rem] uppercase tracking-[0.18em] text-amber-300/50">
              {ownerLabel ?? `Faction ${faction.id}`}
            </p>
            <h3 className="truncate font-display text-sm font-bold leading-tight text-amber-50">
              {faction.name}
            </h3>
          </div>
        </div>
        <span className={`shrink-0 rounded-full bg-gradient-to-br px-1.5 py-0.5 text-[0.5rem] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Portrait area */}
      {!compact && (
        <div
          className="mb-1.5 flex h-16 items-center justify-center overflow-hidden rounded-lg"
          style={{
            background: `radial-gradient(ellipse at center, ${colors.accent}40, ${colors.accent}15)`,
          }}
        >
          <img
            src={FACTION_EMBLEM[faction.id]}
            alt={faction.name}
            className="h-14 w-14 rounded-lg object-contain drop-shadow-lg"
            style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
          />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-0.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-0.5 rounded-md bg-black/30 px-1 py-0.5">
            <span className="text-[0.55rem] leading-none">{stat.label}</span>
            <span className={`text-[0.6rem] font-bold leading-none ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* HP bar */}
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(0, (faction.hp / faction.maxHp) * 100)}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}cc)`,
          }}
        />
      </div>
    </div>
  );
}
