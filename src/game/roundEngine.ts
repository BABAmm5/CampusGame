import { applyTurnIncome, createLog } from "./economyEngine";
import { determineWinner } from "./victoryEngine";
import type { FactionState, GameState, GameLogEntry } from "./types";

function findNextAliveIndex(factions: FactionState[], startIndex: number): number {
  for (let offset = 1; offset <= factions.length; offset += 1) {
    const nextIndex = (startIndex + offset) % factions.length;
    if (factions[nextIndex].alive) {
      return nextIndex;
    }
  }

  return startIndex;
}

export function replaceFaction(factions: FactionState[], nextFaction: FactionState): FactionState[] {
  return factions.map((faction) => (faction.id === nextFaction.id ? nextFaction : faction));
}

export function nextTurn(state: GameState): GameState {
  if (state.winnerId) {
    return state;
  }

  const candidateIndex = findNextAliveIndex(state.factions, state.turnIndex);
  const wrapped = candidateIndex <= state.turnIndex;
  const nextRound = wrapped ? state.round + 1 : state.round;
  const activeFaction = state.factions[candidateIndex];
  const incomeResult = applyTurnIncome(activeFaction, nextRound, state.ruleConfig);
  const updatedFactions = replaceFaction(state.factions, incomeResult.faction);
  const winner = determineWinner(updatedFactions);

  const systemLogs: GameLogEntry[] = [
    createLog(
      nextRound,
      incomeResult.faction.id,
      `${incomeResult.faction.name} 开始行动。`,
    ),
  ];

  if (wrapped) {
    systemLogs.unshift(createLog(nextRound, null, `第 ${nextRound} 轮开始。`));
  }

  return {
    ...state,
    round: nextRound,
    turnIndex: candidateIndex,
    currentFactionId: incomeResult.faction.id,
    factions: updatedFactions,
    winnerId: winner?.id ?? null,
    logs: [...state.logs, ...systemLogs, ...incomeResult.logs],
  };
}
