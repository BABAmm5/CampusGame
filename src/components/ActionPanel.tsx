import { useState } from "react";
import { TabBar } from "./ui/TabBar";
import { OrnateButton } from "./ui/OrnateButton";
import { HandCardArea } from "./HandCardArea";
import type { CardInstance, FactionId, FactionState } from "../game/types";

interface ActionPanelProps {
  activeFaction: FactionState;
  hand: CardInstance[];
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  discardNeeded: number;
  aliveTargets: FactionState[];
  battleTargetId: FactionId;
  onBattleTargetChange: (id: FactionId) => void;
  battleSoldiers: number;
  onBattleSoldiersChange: (n: number) => void;
  activeBattleLimit: number;
  attacksUsed: number;
  attacksMax: number;
  hasWinner: boolean;
  reinforcementPending: boolean;
  reinforcementCivilians: number;
  reinforcementPerTurn: number;
  onReinforcementCiviliansChange: (n: number) => void;
  onPlayCard: () => void;
  onDiscard: () => void;
  onBattle: () => void;
  onEndTurn: () => void;
  onReinforcement: () => void;
  onConvertCivToSoldier: () => void;
  onConvertSoldierToCiv: () => void;
  onUpgradeWeapon: () => void;
  onUpgradeArmor: () => void;
  onFactionSkill: () => void;
  onShowRevive: () => void;
  onShowFactions: () => void;
  onShowLogs: () => void;
}

export function ActionPanel(props: ActionPanelProps) {
  const [activeTab, setActiveTab] = useState("cards");
  const hasSelectedCard = !!props.selectedCardId;

  const tabs = [
    { id: "cards", label: "手牌", badge: props.hand.length },
    { id: "battle", label: "战斗" },
    { id: "economy", label: "经济" },
    { id: "skills", label: "技能" },
  ];

  return (
    <section className="shrink-0 rounded-xl border border-gold-frame/20 bg-gradient-to-br from-black/60 to-card-dark/80 shadow-panel backdrop-blur-sm">
      {/* Top row: tabs + end turn button */}
      <div className="flex items-center gap-2 border-b border-gold-frame/10 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="dark" />
        </div>
        <OrnateButton
          size="sm"
          variant="primary"
          onClick={props.onEndTurn}
          disabled={props.hasWinner}
          glow="rgba(201,168,76,0.25)"
        >
          结束回合
        </OrnateButton>
      </div>

      {/* Tab content */}
      <div className="p-2">
        {/* Cards Tab */}
        {activeTab === "cards" && (
          <div className="space-y-1.5">
            <HandCardArea
              hand={props.hand}
              selectedCardId={props.selectedCardId}
              onSelectCard={props.onSelectCard}
              discardNeeded={props.discardNeeded}
            />
            <div className="flex gap-1.5">
              <OrnateButton
                size="sm"
                variant="primary"
                onClick={props.onPlayCard}
                disabled={!hasSelectedCard || props.hasWinner}
                className="flex-1"
              >
                出牌
              </OrnateButton>
              <OrnateButton
                size="sm"
                variant="danger"
                onClick={props.onDiscard}
                disabled={!hasSelectedCard}
              >
                弃牌
              </OrnateButton>
            </div>
          </div>
        )}

        {/* Battle Tab */}
        {activeTab === "battle" && (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <select
                className="min-w-0 flex-1 rounded-lg border border-gold-frame/20 bg-black/30 px-2 py-1.5 text-xs text-amber-50"
                value={props.battleTargetId}
                onChange={(e) => props.onBattleTargetChange(Number(e.target.value) as FactionId)}
              >
                {props.aliveTargets.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <input
                className="w-14 rounded-lg border border-gold-frame/20 bg-black/30 px-2 py-1.5 text-center text-xs text-amber-50"
                type="number"
                min={1}
                max={props.activeBattleLimit}
                value={props.battleSoldiers}
                onChange={(e) => props.onBattleSoldiersChange(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between px-1 text-[0.55rem] text-amber-100/40">
              <span>攻击 {props.attacksUsed}/{props.attacksMax}</span>
              <span>上场限制 {props.activeBattleLimit}</span>
            </div>
            <OrnateButton
              size="md"
              variant="danger"
              onClick={props.onBattle}
              disabled={props.hasWinner}
              className="w-full"
              glow="rgba(220,38,38,0.25)"
            >
              ⚔ 进攻
            </OrnateButton>
          </div>
        )}

        {/* Economy Tab */}
        {activeTab === "economy" && (
          <div className="space-y-1.5">
            {/* Reinforcement */}
            <div className="rounded-lg border border-gold-frame/15 bg-black/20 p-1.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[0.6rem] font-semibold text-amber-100/70">增员分配</span>
                <span className="text-[0.55rem] text-amber-200/50">
                  民 {props.reinforcementCivilians} / 兵 {props.reinforcementPerTurn - props.reinforcementCivilians}
                </span>
              </div>
              <input
                className="block w-full accent-gold-frame"
                type="range"
                min={0}
                max={props.reinforcementPerTurn}
                value={props.reinforcementCivilians}
                onChange={(e) => props.onReinforcementCiviliansChange(Number(e.target.value))}
                disabled={!props.reinforcementPending}
              />
              <OrnateButton
                size="sm"
                variant="primary"
                onClick={props.onReinforcement}
                disabled={!props.reinforcementPending || props.hasWinner}
                className="mt-1 w-full"
              >
                确认增员
              </OrnateButton>
            </div>

            {/* Convert + Upgrade */}
            <div className="grid grid-cols-2 gap-1">
              <OrnateButton size="sm" variant="secondary" onClick={props.onConvertCivToSoldier}>
                民→兵
              </OrnateButton>
              <OrnateButton size="sm" variant="secondary" onClick={props.onConvertSoldierToCiv}>
                兵→民
              </OrnateButton>
              <OrnateButton size="sm" variant="secondary" onClick={props.onUpgradeWeapon}>
                升级武器
              </OrnateButton>
              <OrnateButton size="sm" variant="secondary" onClick={props.onUpgradeArmor}>
                强化盔甲
              </OrnateButton>
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <div className="grid grid-cols-2 gap-1">
            <OrnateButton size="sm" variant="secondary" onClick={props.onFactionSkill}>
              阵营技能
            </OrnateButton>
            <OrnateButton size="sm" variant="secondary" onClick={props.onShowRevive}>
              契约/复活
            </OrnateButton>
            <OrnateButton size="sm" variant="ghost" onClick={props.onShowFactions}>
              阵营详情
            </OrnateButton>
            <OrnateButton size="sm" variant="ghost" onClick={props.onShowLogs}>
              战报
            </OrnateButton>
          </div>
        )}
      </div>
    </section>
  );
}
