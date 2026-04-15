import type { FactionState } from "../game/types";

interface StatCardProps {
  faction: FactionState;
  isActive: boolean;
}

export function StatCard({ faction, isActive }: StatCardProps) {
  return (
    <article
      className={`rounded-3xl border border-white/70 bg-white/85 p-4 shadow-panel transition ${
        isActive ? "ring-2 ring-accent" : ""
      } ${!faction.alive ? "opacity-50 grayscale" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-steel">Faction {faction.id}</p>
          <h3 className="font-display text-xl">{faction.name}</h3>
        </div>
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: faction.color }}
          aria-hidden
        />
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-steel">血量</dt>
          <dd className="font-semibold">{faction.hp}</dd>
        </div>
        <div>
          <dt className="text-steel">金币</dt>
          <dd className="font-semibold">{faction.gold}</dd>
        </div>
        <div>
          <dt className="text-steel">民</dt>
          <dd className="font-semibold">{faction.civilians}</dd>
        </div>
        <div>
          <dt className="text-steel">兵</dt>
          <dd className="font-semibold">{faction.soldiers}</dd>
        </div>
        <div>
          <dt className="text-steel">武器</dt>
          <dd className="font-semibold">{faction.weaponLevel}</dd>
        </div>
        <div>
          <dt className="text-steel">盔甲</dt>
          <dd className="font-semibold">{faction.armor}</dd>
        </div>
      </dl>
    </article>
  );
}
