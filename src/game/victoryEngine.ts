import { createLog } from "./economyEngine";
import type { FactionState, GameLogEntry } from "./types";

export function absorbDefeatedFaction(
  winner: FactionState,
  loser: FactionState,
  round: number,
): { winner: FactionState; loser: FactionState; logs: GameLogEntry[] } {
  const inheritedGold = loser.gold;
  const inheritedCivilians = loser.civilians;
  const inheritedSoldiers = loser.soldiers;

  return {
    winner: {
      ...winner,
      gold: winner.gold + inheritedGold,
      civilians: winner.civilians + inheritedCivilians,
      soldiers: winner.soldiers + inheritedSoldiers,
    },
    loser: {
      ...loser,
      gold: 0,
      civilians: 0,
      soldiers: 0,
      alive: false,
    },
    logs: [
      createLog(
        round,
        winner.id,
        `${winner.name} 吞并 ${loser.name} 遗产：金币 ${inheritedGold}、民 ${inheritedCivilians}、兵 ${inheritedSoldiers}。`,
      ),
    ],
  };
}

export function determineWinner(factions: FactionState[]): FactionState | null {
  const aliveFactions = factions.filter((faction) => faction.alive);
  return aliveFactions.length === 1 ? aliveFactions[0] : null;
}
