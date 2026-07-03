import type { FactionState, GameState } from "../game/types";
import {
  convertCiviliansToSoldiers,
  convertSoldiersToCivilians,
  upgradeWeapon,
  upgradeArmor,
} from "../game/economyEngine";
import { GameHeader } from "./GameHeader";
import { GameTable } from "./GameTable";
import { ActionPanel } from "./ActionPanel";
import type { useGameActions } from "../hooks/useGameActions";

interface GameBoardProps {
  gameState: GameState;
  activeFaction: FactionState;
  actions: ReturnType<typeof useGameActions>;
  onShowRules: () => void;
  onShowRevive: () => void;
  onShowFactions: () => void;
  onShowLogs: () => void;
}

export function GameBoard({
  gameState,
  activeFaction,
  actions,
  onShowRules,
  onShowRevive,
  onShowFactions,
  onShowLogs,
}: GameBoardProps) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <GameHeader
        round={gameState.round}
        activeFaction={activeFaction}
        winnerName={actions.winnerFaction?.name ?? null}
        onRestart={actions.restartGame}
        onHome={actions.resetToHome}
        onRules={onShowRules}
      />

      <GameTable
        factions={gameState.factions}
        activeFactionId={activeFaction.id}
        activeFaction={activeFaction}
        deckCount={gameState.deck.length}
        discardCount={gameState.discardPile.length}
        attacksUsed={actions.activeAttacksUsed}
        attacksMax={gameState.ruleConfig.battle.attacksPerTurn}
        deploymentLimit={actions.deploymentLimit}
      />

      <ActionPanel
        activeFaction={activeFaction}
        hand={activeFaction.hand}
        selectedCardId={actions.selectedCardId}
        onSelectCard={actions.setSelectedCardId}
        discardNeeded={actions.discardNeeded}
        aliveTargets={actions.aliveTargets}
        battleTargetId={actions.battleTargetId}
        onBattleTargetChange={actions.setBattleTargetId}
        battleSoldiers={actions.battleSoldiers}
        onBattleSoldiersChange={actions.setBattleSoldiers}
        activeBattleLimit={actions.activeBattleLimit}
        attacksUsed={actions.activeAttacksUsed}
        attacksMax={gameState.ruleConfig.battle.attacksPerTurn}
        hasWinner={!!gameState.winnerId}
        reinforcementPending={activeFaction.reinforcementPending}
        reinforcementCivilians={actions.reinforcementCivilians}
        reinforcementPerTurn={gameState.ruleConfig.economy.reinforcementPerTurn}
        onReinforcementCiviliansChange={actions.setReinforcementCivilians}
        onPlayCard={actions.handlePlaySelectedCard}
        onDiscard={actions.handleDiscardSelected}
        onBattle={actions.handleBattle}
        onEndTurn={actions.handleEndTurn}
        onReinforcement={actions.handleReinforcement}
        onConvertCivToSoldier={() =>
          actions.updateActiveFaction((f) =>
            convertCiviliansToSoldiers(f, gameState.round, gameState.ruleConfig),
          )
        }
        onConvertSoldierToCiv={() =>
          actions.updateActiveFaction((f) =>
            convertSoldiersToCivilians(f, gameState.round, gameState.ruleConfig),
          )
        }
        onUpgradeWeapon={() =>
          actions.updateActiveFaction((f) =>
            upgradeWeapon(f, gameState.round, gameState.ruleConfig),
          )
        }
        onUpgradeArmor={() =>
          actions.updateActiveFaction((f) =>
            upgradeArmor(f, gameState.round, gameState.ruleConfig),
          )
        }
        onFactionSkill={actions.handleFactionSkill}
        onShowRevive={onShowRevive}
        onShowFactions={onShowFactions}
        onShowLogs={onShowLogs}
      />
    </section>
  );
}
