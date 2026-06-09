import { createLog } from "./economyEngine";
import { FACTION_INITIAL_OVERRIDES, FACTION_META } from "./config";
import type { FactionId, FactionState, GameLogEntry } from "./types";

export function absorbDefeatedFaction(
  winner: FactionState,
  loser: FactionState,
  round: number,
): { winner: FactionState; loser: FactionState; logs: GameLogEntry[] } {
  const inheritedGold = Math.floor(loser.gold * 0.5);
  const inheritedCivilians = loser.civilians;

  return {
    winner: {
      ...winner,
      gold: winner.gold + inheritedGold,
      civilians: winner.civilians + inheritedCivilians,
    },
    loser: {
      ...loser,
      gold: loser.gold - inheritedGold,
      civilians: 0,
      defeatedBy: winner.id,
      alive: false,
    },
    logs: [
      createLog(
        round,
        winner.id,
        `${winner.name} 获得 ${loser.name} 战后资产：金币 ${inheritedGold}、平民 ${inheritedCivilians}；武器、盔甲和士兵不继承。`,
      ),
    ],
  };
}

export function determineWinner(factions: FactionState[]): FactionState | null {
  const aliveFactions = factions.filter((faction) => faction.alive);
  const aliveIds = aliveFactions.map((faction) => faction.id).sort().join(",");
  if (aliveIds === "1,3") {
    return aliveFactions.find((faction) => faction.id === 1) ?? null;
  }
  if (aliveIds === "2,3") {
    return aliveFactions.find((faction) => faction.id === 2) ?? null;
  }
  return aliveFactions.length === 1 ? aliveFactions[0] : null;
}

export function getReviveRestriction(
  reviver: FactionState,
  target: FactionState,
): string | null {
  if (!reviver.alive) {
    return "复活者已覆灭，不能复活其他阵营。";
  }
  if (target.alive) {
    return `${target.name} 尚未覆灭，不需要复活。`;
  }
  if (target.id === 1) {
    return "统治者不可被复活。";
  }
  if (reviver.id === 1 && (target.id === 2 || target.id === 4)) {
    return "统治者不可复活反抗者或入侵者。";
  }
  if (reviver.id === 3 && target.id === 4) {
    return "守护者不可复活入侵者。";
  }
  return null;
}

function revivedFaction(targetId: FactionId, reviverId: FactionId): FactionState {
  return {
    id: targetId,
    name: FACTION_META[targetId].name,
    color: FACTION_META[targetId].accent,
    ...FACTION_INITIAL_OVERRIDES[targetId],
    alive: true,
    reinforcementPending: true,
    attacksThisTurn: 0,
    weaponUpgradedThisTurn: false,
    defeatedBy: null,
    attackPenaltyAgainst: reviverId,
    attackPenaltyPercent: 20,
    revivalTributeTo: reviverId,
    revivalTributeRoundsRemaining: 3,
  };
}

export function reviveFaction(
  reviver: FactionState,
  target: FactionState,
  round: number,
): { reviver: FactionState; revived: FactionState; logs: GameLogEntry[]; prevented: boolean } {
  const restriction = getReviveRestriction(reviver, target);
  if (restriction) {
    return {
      reviver,
      revived: target,
      logs: [createLog(round, reviver.id, restriction)],
      prevented: true,
    };
  }

  const costGold = Math.floor(reviver.gold * 0.3);
  const costCivilians = Math.floor(reviver.civilians * 0.3);
  const costSoldiers = Math.floor(reviver.soldiers * 0.3);
  const nextReviver = {
    ...reviver,
    gold: reviver.gold - costGold,
    civilians: reviver.civilians - costCivilians,
    soldiers: reviver.soldiers - costSoldiers,
  };
  const revived = revivedFaction(target.id, reviver.id);

  return {
    reviver: nextReviver,
    revived,
    prevented: false,
    logs: [
      createLog(
        round,
        reviver.id,
        `${reviver.name} 消耗 30% 资产复活 ${target.name}：金币 ${costGold}、平民 ${costCivilians}、士兵 ${costSoldiers}。`,
      ),
      createLog(
        round,
        target.id,
        `${target.name} 与 ${reviver.name} 签订复活契约：向复活者上交 30% 金币 3 轮，攻击复活者时攻击力减少 20%。`,
      ),
    ],
  };
}
