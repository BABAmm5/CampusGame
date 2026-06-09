import type { FactionState } from "../game/types";

interface StatCardProps {
  faction: FactionState;
  isActive: boolean;
}

export function StatCard({ faction, isActive }: StatCardProps) {
  const stats = [
    { label: "血量", value: `${faction.hp}/${faction.maxHp}` },
    { label: "金币", value: faction.gold },
    { label: "平民", value: faction.civilians },
    { label: "士兵", value: faction.soldiers },
    { label: "武器", value: faction.weaponAttack },
    { label: "盔甲", value: faction.armor },
    { label: "手牌", value: faction.hand.length },
  ];

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-[linear-gradient(145deg,#fff8e9,#d9b777)] px-2.5 py-2 text-ink shadow-panel transition ${
        isActive ? "border-amber-200 ring-2 ring-amber-300" : "border-amber-950/25"
      } ${!faction.alive ? "opacity-50 grayscale" : ""}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: faction.color }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_42%),linear-gradient(135deg,rgba(74,35,14,0.08),transparent_40%)]" />
      <div className="relative mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.55rem] uppercase tracking-[0.16em] text-stone-700">Faction {faction.id}</p>
          <h3 className="mt-0.5 truncate font-display text-[0.95rem] leading-none">{faction.name}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-amber-950/20 bg-white/55 px-1.5 py-0.5 text-[0.55rem] font-semibold text-stone-800">
          {faction.awakened ? "觉醒" : isActive ? "行动中" : faction.alive ? "待命" : "覆灭"}
        </span>
      </div>
      <dl className="relative flex flex-wrap gap-1 text-[0.62rem]">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1 rounded-full bg-amber-950/10 px-1.5 py-0.5">
            <dt className="text-stone-700">{stat.label}</dt>
            <dd className="font-display text-xs font-semibold leading-none">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
