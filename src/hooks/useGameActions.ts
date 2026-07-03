import { useEffect, useState } from "react";
import {
  applyAwakenings,
  consumeAvoidWar,
  discardCardsFromFaction,
  mustDiscardCount,
  playCard,
} from "../game/cardEngine";
import {
  applyReinforcement,
  createLog,
  exchangeRulerHpForCivilians,
} from "../game/economyEngine";
import { initGame } from "../game/initGame";
import { nextTurn, replaceFaction } from "../game/roundEngine";
import { getDeploymentLimit, resolveBattle } from "../game/battleEngine";
import {
  determineWinner,
  absorbDefeatedFaction,
  getReviveRestriction,
  reviveFaction,
} from "../game/victoryEngine";
import type { FactionId, FactionState, GameLogEntry, GameState, RuleConfig } from "../game/types";

export function useGameActions(
  gameState: GameState | null,
  activeFaction: FactionState | null,
  setGameState: (state: GameState | null | ((prev: GameState | null) => GameState | null)) => void,
  setScreen: (screen: "home" | "setup" | "game") => void,
  factionCount: number,
  ruleConfig: RuleConfig,
  setFactionCount: (count: number) => void,
  setRuleConfig: (config: RuleConfig) => void,
) {
  const [reinforcementCivilians, setReinforcementCivilians] = useState(3);
  const [battleTargetId, setBattleTargetId] = useState<FactionId>(2);
  const [battleSoldiers, setBattleSoldiers] = useState(5);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [lastActionLogs, setLastActionLogs] = useState<GameLogEntry[]>([]);

  const showActionLogs = (logs: GameLogEntry[]) => setLastActionLogs(logs);

  // Reset battle params when active faction changes
  useEffect(() => {
    if (!gameState || !activeFaction) return;
    const firstTarget =
      gameState.factions.find((f) => f.alive && f.subFactionJoined && f.id !== activeFaction.id)?.id ?? activeFaction.id;
    const depLimit = getDeploymentLimit(gameState.round, gameState.ruleConfig);
    const battleLimit = Math.max(
      1,
      Math.min(depLimit, Math.max(1, activeFaction.soldiers - gameState.ruleConfig.battle.actionUnitCost)),
    );
    setBattleTargetId(firstTarget);
    setBattleSoldiers((cur) => Math.max(1, Math.min(cur, battleLimit)));
  }, [gameState, activeFaction]);

  const startGame = (includeSubFactions = true, includeNeutral = true, nextFactionCount = factionCount, nextRuleConfig = ruleConfig) => {
    const state = initGame(nextFactionCount, nextRuleConfig, includeSubFactions, includeNeutral);
    setFactionCount(nextFactionCount);
    setRuleConfig(nextRuleConfig);
    setGameState(state);
    setScreen("game");
    setBattleTargetId(
      nextFactionCount > 1 ? (state.factions[1].id as FactionId) : state.factions[0].id,
    );
    setBattleSoldiers(5);
  };

  const continueGame = () => {
    if (gameState) setScreen("game");
  };

  const resetToHome = () => setScreen("home");
  const restartGame = () => startGame(true, true, factionCount, ruleConfig);

  const updateActiveFaction = (
    updater: (faction: FactionState) => { faction: FactionState; logs: GameState["logs"] },
  ) => {
    if (!gameState || !activeFaction || gameState.winnerId) return;
    const result = updater(activeFaction);
    const updatedFactions = replaceFaction(gameState.factions, result.faction);
    const winner = determineWinner(updatedFactions);
    showActionLogs(result.logs);
    setGameState({
      ...gameState,
      factions: updatedFactions,
      winnerId: winner?.id ?? null,
      logs: [...gameState.logs, ...result.logs],
    });
  };

  const resolveBattleForState = (
    state: GameState,
    attackerId: FactionId,
    defenderId: FactionId,
    committedSoldiers: number,
  ): { state: GameState; logs: GameLogEntry[] } => {
    const attacker = state.factions.find((f) => f.id === attackerId);
    const defender = state.factions.find((f) => f.id === defenderId);
    if (!attacker || !defender || !attacker.alive || !defender.alive || attacker.id === defender.id) {
      const log = createLog(state.round, attackerId, "请选择有效的敌对阵营。");
      return { state: { ...state, logs: [...state.logs, log] }, logs: [log] };
    }
    if (defender.restActive) {
      const log = createLog(state.round, attackerId, `${defender.name} 正在休整，不能被攻击。`);
      return { state: { ...state, logs: [...state.logs, log] }, logs: [log] };
    }

    const avoid = consumeAvoidWar(state, defender.id, "攻击");
    if (avoid.prevented) return { state: avoid.state, logs: avoid.logs };

    const battle = resolveBattle(attacker, defender, committedSoldiers, state.round, state.ruleConfig);
    let updatedFactions = replaceFaction(avoid.state.factions, battle.attacker);
    updatedFactions = replaceFaction(updatedFactions, battle.defender);
    const extraLogs = [...battle.logs];

    if (battle.result.defenderDefeated) {
      const absorbResult = absorbDefeatedFaction(battle.attacker, battle.defender, state.round);
      updatedFactions = replaceFaction(updatedFactions, absorbResult.winner);
      updatedFactions = replaceFaction(updatedFactions, absorbResult.loser);
      extraLogs.push(
        createLog(state.round, defender.id, `${defender.name} 王城崩溃，阵营覆灭。`),
        ...absorbResult.logs,
      );
    } else if (battle.attacker.id === 4 && battle.attacker.awakened && battle.defender.weaponAttack > 0) {
      const nextAttacker = {
        ...battle.attacker,
        weaponAttack: Math.max(battle.attacker.weaponAttack, battle.defender.weaponAttack),
      };
      const nextDefender = {
        ...battle.defender,
        weaponAttack: battle.defender.weaponFamily === "24" ? 3 : 2,
      };
      updatedFactions = replaceFaction(updatedFactions, nextAttacker);
      updatedFactions = replaceFaction(updatedFactions, nextDefender);
      extraLogs.push(
        createLog(state.round, attacker.id, `${attacker.name} 发动朔野王，夺取 ${defender.name} 一副武器。`),
      );
    }

    const awakenedState = applyAwakenings({
      ...avoid.state,
      factions: updatedFactions,
      winnerId: determineWinner(updatedFactions)?.id ?? null,
      logs: [...avoid.state.logs, ...extraLogs],
    });
    return { state: awakenedState, logs: extraLogs };
  };

  const handleBattle = () => {
    if (!gameState || !activeFaction || gameState.winnerId) return;
    const aliveTargets = gameState.factions.filter((f) => f.alive && f.subFactionJoined && f.id !== activeFaction.id);
    if (!aliveTargets.length) {
      const log = createLog(gameState.round, activeFaction.id, "当前没有可进攻的敌对阵营。");
      showActionLogs([log]);
      setGameState({ ...gameState, logs: [...gameState.logs, log] });
      return;
    }
    const result = resolveBattleForState(gameState, activeFaction.id, battleTargetId, battleSoldiers);
    showActionLogs(result.logs);
    setGameState(result.state);
  };

  const handleReinforcement = () => {
    if (!gameState || !activeFaction || gameState.winnerId) return;
    if (!activeFaction.reinforcementPending) {
      const log = createLog(gameState.round, activeFaction.id, `${activeFaction.name} 本回合已经完成增员。`);
      showActionLogs([log]);
      setGameState({ ...gameState, logs: [...gameState.logs, log] });
      return;
    }
    updateActiveFaction((faction) =>
      applyReinforcement(faction, gameState.round, reinforcementCivilians, gameState.ruleConfig),
    );
  };

  const handleEndTurn = () => {
    if (!gameState) return;
    if (activeFaction?.reinforcementPending) {
      const log = createLog(
        gameState.round,
        activeFaction.id,
        `请先分配本轮新增的 ${gameState.ruleConfig.economy.reinforcementPerTurn} 个单位。`,
      );
      showActionLogs([log]);
      setGameState({ ...gameState, logs: [...gameState.logs, log] });
      return;
    }
    if (activeFaction && mustDiscardCount(activeFaction) > 0) {
      const log = createLog(
        gameState.round,
        activeFaction.id,
        `手牌超过当前血量上限，请先弃置 ${mustDiscardCount(activeFaction)} 张牌。`,
      );
      showActionLogs([log]);
      setGameState({ ...gameState, logs: [...gameState.logs, log] });
      return;
    }
    const nextState = nextTurn(gameState);
    const newLogs = nextState.logs.slice(gameState.logs.length);
    showActionLogs(newLogs);
    setGameState(nextState);
  };

  const handleFactionSkill = () => {
    if (!gameState || !activeFaction || gameState.winnerId) return;
    if (activeFaction.id === 3) {
      updateActiveFaction((faction) => {
        if (faction.civilians <= 0) {
          return {
            faction,
            logs: [createLog(gameState.round, faction.id, `${faction.name} 没有可典民的平民。`)],
          };
        }
        return {
          faction: { ...faction, civilians: faction.civilians - 1, gold: faction.gold + 60 },
          logs: [createLog(gameState.round, faction.id, `${faction.name} 发动典民：1 民换 60 金。`)],
        };
      });
      return;
    }
    updateActiveFaction((faction) => exchangeRulerHpForCivilians(faction, gameState.round));
  };

  const handleDiscardSelected = () => {
    if (!gameState || !activeFaction || !selectedCardId) return;
    const result = discardCardsFromFaction(gameState, activeFaction.id, [selectedCardId]);
    setSelectedCardId(null);
    showActionLogs(result.logs);
    setGameState(result.state);
  };

  const handlePlaySelectedCard = () => {
    if (!gameState || !activeFaction || !selectedCardId || gameState.winnerId) return;
    const cardResult = playCard(gameState, activeFaction.id, selectedCardId, { targetId: battleTargetId });
    let nextState = cardResult.state;
    let logs = cardResult.logs;
    if (cardResult.requiresBattle) {
      const battleResult = resolveBattleForState(nextState, activeFaction.id, battleTargetId, battleSoldiers);
      nextState = battleResult.state;
      logs = [...logs, ...battleResult.logs];
    }
    setSelectedCardId(null);
    showActionLogs(logs);
    setGameState(nextState);
  };

  const handleRevive = (targetId: FactionId) => {
    if (!gameState || !activeFaction || gameState.winnerId) return;
    const target = gameState.factions.find((f) => f.id === targetId);
    if (!target) return;
    const result = reviveFaction(activeFaction, target, gameState.round, gameState.ruleConfig);
    let updatedFactions = replaceFaction(gameState.factions, result.reviver);
    updatedFactions = replaceFaction(updatedFactions, result.revived);
    const winner = determineWinner(updatedFactions);
    showActionLogs(result.logs);
    setGameState(
      applyAwakenings({
        ...gameState,
        factions: updatedFactions,
        winnerId: winner?.id ?? null,
        logs: [...gameState.logs, ...result.logs],
      }),
    );
  };

  // Derived state
  const aliveTargets = gameState?.factions.filter((f) => f.alive && f.subFactionJoined && f.id !== activeFaction?.id) ?? [];
  const winnerFaction = gameState?.winnerId
    ? gameState.factions.find((f) => f.id === gameState.winnerId) ?? null
    : null;
  const latestLogs = gameState ? [...gameState.logs].reverse() : [];
  const deploymentLimit = gameState ? getDeploymentLimit(gameState.round, gameState.ruleConfig) : 1;
  const activeBattleLimit =
    activeFaction && gameState
      ? Math.max(1, Math.min(deploymentLimit, Math.max(1, activeFaction.soldiers - gameState.ruleConfig.battle.actionUnitCost)))
      : 1;
  const activeAttacksUsed = activeFaction?.attacksThisTurn ?? 0;
  const defeatedFactions = gameState?.factions.filter((f) => !f.alive) ?? [];
  const discardNeeded = activeFaction ? mustDiscardCount(activeFaction) : 0;

  return {
    // State
    reinforcementCivilians,
    setReinforcementCivilians,
    battleTargetId,
    setBattleTargetId,
    battleSoldiers,
    setBattleSoldiers,
    selectedCardId,
    setSelectedCardId,
    lastActionLogs,
    setLastActionLogs,
    // Derived
    aliveTargets,
    winnerFaction,
    latestLogs,
    deploymentLimit,
    activeBattleLimit,
    activeAttacksUsed,
    defeatedFactions,
    discardNeeded,
    // Actions
    showActionLogs,
    startGame,
    continueGame,
    resetToHome,
    restartGame,
    updateActiveFaction,
    handleBattle,
    handleReinforcement,
    handleEndTurn,
    handleFactionSkill,
    handleDiscardSelected,
    handlePlaySelectedCard,
    handleRevive,
    getReviveRestriction,
  };
}
