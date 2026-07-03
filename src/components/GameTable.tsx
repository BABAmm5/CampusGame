import type { FactionState } from "../game/types";
import { FACTION_EMBLEM } from "../constants/factionMeta";
import { StatCard } from "./StatCard";

interface GameTableProps {
  factions: FactionState[];
  activeFactionId: number;
  activeFaction: FactionState;
  deckCount: number;
  discardCount: number;
  attacksUsed: number;
  attacksMax: number;
  deploymentLimit: number;
}

export function GameTable({
  factions,
  activeFactionId,
  activeFaction,
  deckCount,
  discardCount,
  attacksUsed,
  attacksMax,
  deploymentLimit,
}: GameTableProps) {
  // 4x4 Grid layout for 8 factions:
  // [F1统治者]  [F5暮光者]  [F7幕读者]  [F2反抗者]
  // [F8墓怨者]  [  center  ]  [ center ]  [F6募道者]
  // [  empty  ]  [ center  ]  [ center ]  [  empty ]
  // [F3守护者]  [  empty  ]  [  empty  ]  [F4游猎者]
  // 实际用 4x4 = 16格, 中心占2x2共4格
  const positions: Array<{ id: number | null; isCenter?: boolean; label?: string }> = [
    { id: 1 },          // 0: TL — 统治者
    { id: 5 },          // 1: T2 — 暮光者
    { id: 7 },          // 2: T3 — 幕读者
    { id: 2 },          // 3: TR — 反抗者
    { id: 8 },          // 4: ML — 墓怨者
    { id: 0, isCenter: true }, // 5: Center
    { id: -1 },         // 6: Center (merged, skip)
    { id: 6 },          // 7: MR — 募道者
    { id: null },       // 8: BL2
    { id: -1 },         // 9: Center (merged, skip)
    { id: -1 },         // 10: Center (merged, skip)
    { id: null },       // 11: BR2
    { id: 3 },          // 12: BL — 守护者
    { id: null },       // 13: B2
    { id: null },       // 14: B3
    { id: 4 },          // 15: BR — 游猎者
  ];

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-gold-frame/15 bg-[radial-gradient(circle_at_center,rgba(73,125,79,0.4),rgba(29,60,44,0.6)_48%,rgba(23,18,16,0.9)_100%)] p-3 shadow-panel">
      {/* Background decorative rings */}
      <div className="pointer-events-none absolute inset-4 rounded-2xl border border-amber-200/10" />
      <div className="pointer-events-none absolute inset-10 rounded-full border border-amber-200/5" />

      {/* Animated background orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-emerald-600/10 blur-3xl animate-bg-orb-1" />
      <div className="pointer-events-none absolute right-1/3 bottom-1/3 h-24 w-24 rounded-full bg-amber-600/8 blur-2xl animate-bg-orb-2" />

      {/* 4x4 Grid */}
      <div className="relative grid h-full grid-cols-4 grid-rows-4 gap-1.5">
        {positions.map((pos, index) => {
          // Skip merged center cells
          if (pos.id === -1) return null;

          // Center cell (spans 2x2)
          if (pos.id === 0) {
            return (
              <div
                key="center"
                className="col-span-2 row-span-2 flex items-center justify-center"
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-gold-frame/25 bg-[radial-gradient(circle,#4a2f1a_0%,#2c1b10_60%,#140f0c_100%)] p-3 text-center shadow-lg">
                  <img
                    src={FACTION_EMBLEM[activeFaction.id]}
                    alt={activeFaction.name}
                    className="mb-1 h-12 w-12 rounded-full object-cover ring-2 ring-gold-frame/30"
                    style={{ filter: `drop-shadow(0 0 8px rgba(201,168,76,0.4))` }}
                  />
                  <h3 className="font-display text-lg leading-none text-amber-50">{activeFaction.name}</h3>
                  <p className="mt-1.5 text-[0.6rem] leading-4 text-amber-100/60">
                    {activeFaction.reinforcementPending ? "等待增员" : "可结束回合"}
                  </p>
                  <p className="mt-1 text-[0.55rem] text-amber-100/40">
                    兵 {activeFaction.soldiers} / 民 {activeFaction.civilians}
                  </p>
                  <p className="mt-0.5 text-[0.5rem] text-amber-100/35">
                    攻击 {attacksUsed}/{attacksMax} · 上场 {deploymentLimit}
                  </p>
                  <p className="mt-0.5 text-[0.5rem] text-amber-100/35">
                    牌堆 {deckCount} · 弃牌 {discardCount}
                  </p>
                </div>
              </div>
            );
          }

          // Faction cells
          if (pos.id !== null && pos.id > 0) {
            const faction = factions.find((f) => f.id === pos.id);
            if (!faction) {
              // 附属阵营未加入时显示占位
              return (
                <div key={`placeholder-${pos.id}`} className="flex items-center justify-center">
                  <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-amber-200/10 bg-black/10">
                    <span className="text-[0.45rem] text-amber-100/20">未加入</span>
                  </div>
                </div>
              );
            }
            if (!faction.subFactionJoined) {
              return (
                <div key={`waiting-${pos.id}`} className="flex items-center justify-center">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-violet-400/20 bg-violet-900/10">
                    <img
                      src={FACTION_EMBLEM[faction.id]}
                      alt={faction.name}
                      className="h-6 w-6 rounded-full object-cover opacity-40"
                    />
                    <span className="mt-0.5 text-[0.45rem] text-violet-300/50">{faction.name}</span>
                    <span className="text-[0.4rem] text-violet-200/30">即将加入</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={pos.id} className="flex items-center justify-center animate-card-enter" style={{ animationDelay: `${index * 40}ms` }}>
                <div className="w-full">
                  <StatCard faction={faction} isActive={faction.id === activeFactionId} compact />
                </div>
              </div>
            );
          }

          // Empty cells
          return (
            <div
              key={`empty-${index}`}
              className="flex items-center justify-center"
            >
              <div className="flex h-8 w-full items-center justify-center rounded-lg border border-dashed border-amber-200/5 bg-black/5">
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
