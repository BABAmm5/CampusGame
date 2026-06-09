import { applyAwakenings, drawCards } from "./cardEngine";
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
  const drawResult = drawCards(state.deck, state.discardPile, 4, nextRound, activeFaction.id);
  const activeWithDrawn = {
    ...activeFaction,
    hand: [...activeFaction.hand, ...drawResult.drawn],
  };
  const incomeResult = applyTurnIncome(activeWithDrawn, nextRound, state.ruleConfig);
  let updatedFactions = replaceFaction(state.factions, incomeResult.faction);
  const tributeLogs: GameLogEntry[] = [];

  if (incomeResult.faction.id === 3 && !incomeResult.faction.awakened) {
    const ruler = updatedFactions.find((faction) => faction.id === 1 && faction.alive);
    const guardian = updatedFactions.find((faction) => faction.id === 3);
    if (ruler && guardian) {
      const tributeCivilians = Math.min(
        guardian.civilians,
        state.ruleConfig.economy.guardianTributeCivilians,
      );
      const tributeGold = Math.min(
        guardian.gold,
        state.ruleConfig.economy.guardianTributeGold,
      );
      updatedFactions = replaceFaction(updatedFactions, {
        ...guardian,
        civilians: guardian.civilians - tributeCivilians,
        gold: guardian.gold - tributeGold,
      });
      updatedFactions = replaceFaction(updatedFactions, {
        ...ruler,
        civilians: ruler.civilians + tributeCivilians,
        gold: ruler.gold + tributeGold,
      });
      tributeLogs.push(
        createLog(
          nextRound,
          guardian.id,
          `${guardian.name} 向 ${ruler.name} 上交 ${tributeCivilians} 名平民和 ${tributeGold} 金币。`,
        ),
      );
    }
  }

  const tributeFaction = updatedFactions.find(
    (faction) =>
      faction.id === incomeResult.faction.id &&
      faction.revivalTributeTo &&
      faction.revivalTributeRoundsRemaining > 0,
  );
  if (tributeFaction?.revivalTributeTo) {
    const receiver = updatedFactions.find(
      (faction) => faction.id === tributeFaction.revivalTributeTo && faction.alive,
    );
    if (receiver) {
      const tributeGold = Math.floor(tributeFaction.gold * 0.3);
      updatedFactions = replaceFaction(updatedFactions, {
        ...tributeFaction,
        gold: tributeFaction.gold - tributeGold,
        revivalTributeRoundsRemaining: tributeFaction.revivalTributeRoundsRemaining - 1,
      });
      updatedFactions = replaceFaction(updatedFactions, {
        ...receiver,
        gold: receiver.gold + tributeGold,
      });
      tributeLogs.push(
        createLog(
          nextRound,
          tributeFaction.id,
          `${tributeFaction.name} 按复活契约向 ${receiver.name} 上交 ${tributeGold} 金币，剩余 ${
            tributeFaction.revivalTributeRoundsRemaining - 1
          } 轮。`,
        ),
      );
    }
  }

  const winner = determineWinner(updatedFactions);

  const systemLogs: GameLogEntry[] = [
    createLog(
      nextRound,
      incomeResult.faction.id,
      `${incomeResult.faction.name} 开始行动。`,
    ),
    createLog(
      nextRound,
      incomeResult.faction.id,
      `${incomeResult.faction.name} 摸 ${drawResult.drawn.length} 张牌。`,
    ),
  ];

  if (wrapped) {
    systemLogs.unshift(createLog(nextRound, null, `第 ${nextRound} 轮开始。`));
  }

  return applyAwakenings({
    ...state,
    round: nextRound,
    turnIndex: candidateIndex,
    currentFactionId: incomeResult.faction.id,
    phase: "action",
    factions: updatedFactions,
    deck: drawResult.deck,
    discardPile: drawResult.discardPile,
    winnerId: winner?.id ?? null,
    logs: [...state.logs, ...systemLogs, ...drawResult.logs, ...incomeResult.logs, ...tributeLogs],
  });
}
