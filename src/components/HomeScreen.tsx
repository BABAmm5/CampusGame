import { OrnateButton } from "./ui/OrnateButton";
import { CardFrame } from "./CardFrame";
import { FACTION_EMBLEM } from "../constants/factionMeta";

interface HomeScreenProps {
  hasSavedGame: boolean;
  reinforcementPerTurn: number;
  civilianGoldOutput: number;
  soldierUpkeep: number;
  onContinue: () => void;
  onNewGame: () => void;
  onShowRules: () => void;
}

export function HomeScreen({
  hasSavedGame,
  reinforcementPerTurn,
  civilianGoldOutput,
  soldierUpkeep,
  onContinue,
  onNewGame,
  onShowRules,
}: HomeScreenProps) {
  return (
    <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-gold-frame/20 bg-gradient-to-br from-[rgba(44,29,18,0.96)] to-[rgba(16,13,12,0.98)] p-6 shadow-panel">
      {/* Background orbs */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-emerald-600/10 blur-3xl animate-bg-orb-1" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-600/10 blur-3xl animate-bg-orb-2" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 rounded-full bg-wine/10 blur-2xl animate-bg-orb-3" />

      {/* Title section */}
      <div className="relative space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-gold-frame/60">Tabletop Card Game</p>
        <div className="relative">
          <h1 className="font-display text-5xl font-bold leading-none text-transparent bg-clip-text bg-gradient-to-br from-gold-frame via-amber-200 to-gold-frame">
            King Game
          </h1>
          <p className="mt-1 font-display text-lg text-amber-100/40">王座棋局</p>
        </div>
        <p className="text-sm leading-7 text-amber-100/60">
          四阵营本地热座回合制策略卡牌。牌位围绕中庭桌台展开，支持自动存档、继续游戏、配置码导入导出。
        </p>

        {/* Faction emblems row */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {([1, 2, 3, 4] as const).map((id) => (
            <div key={id} className="group relative">
              <img
                src={FACTION_EMBLEM[id]}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-1 ring-gold-frame/20 opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:ring-gold-frame/60 group-hover:scale-110"
                style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.2))" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="relative mt-8 space-y-3">
        {hasSavedGame && (
          <div className="animate-card-enter" style={{ animationDelay: "0ms" }}>
            <OrnateButton variant="secondary" size="lg" className="w-full" onClick={onContinue} glow="rgba(201,168,76,0.2)">
              继续游戏
            </OrnateButton>
          </div>
        )}
        <div className="animate-card-enter" style={{ animationDelay: "100ms" }}>
          <OrnateButton variant="primary" size="lg" className="w-full" onClick={onNewGame} glow="rgba(201,168,76,0.4)">
            开始新棋局
          </OrnateButton>
        </div>
        <div className="animate-card-enter" style={{ animationDelay: "200ms" }}>
          <OrnateButton variant="ghost" size="lg" className="w-full" onClick={onShowRules}>
            查看规则
          </OrnateButton>
        </div>

        {/* Rule summary */}
        <div className="animate-card-enter" style={{ animationDelay: "300ms" }}>
          <CardFrame variant="dark" size="sm" className="mt-2">
            <p className="text-[0.68rem] leading-6 text-amber-100/50">
              当前默认规则：每轮增员 {reinforcementPerTurn}，民产金 {civilianGoldOutput}，兵耗金 {soldierUpkeep}。开局阵营：统治者、反抗者、守护者、游猎者。
            </p>
          </CardFrame>
        </div>
      </div>
    </section>
  );
}
