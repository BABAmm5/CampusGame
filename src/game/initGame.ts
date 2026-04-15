import {
  FACTION_IDS,
  FACTION_INITIAL_OVERRIDES,
  FACTION_META,
  DEFAULT_RULE_CONFIG,
} from "./config";
import { applyTurnIncome, createLog } from "./economyEngine";
import type { FactionState, GameLogEntry, GameState, RuleConfig } from "./types";

export function initGame(
  factionCount: number,
  ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG,
): GameState {
  const baseFactions: FactionState[] = FACTION_IDS.slice(0, factionCount).map((id) => ({
    id,
    name: FACTION_META[id].name,
    color: FACTION_META[id].accent,
    ...ruleConfig.initialFactionStats,
    ...FACTION_INITIAL_OVERRIDES[id],
    alive: true,
    reinforcementPending: true,
  }));
  const openingFaction = baseFactions[0];
  const openingIncome = applyTurnIncome(openingFaction, 1, ruleConfig);
  const factions = [openingIncome.faction, ...baseFactions.slice(1)];
  const openingLogs: GameLogEntry[] = [
    createLog(1, null, "王国棋局开启。各阵营进入第 1 轮。"),
    createLog(1, openingIncome.faction.id, `${openingIncome.faction.name} 开始行动。`),
    ...openingIncome.logs,
  ];

  return {
    factionCount,
    round: 1,
    turnIndex: 0,
    currentFactionId: factions[0].id,
    started: true,
    winnerId: null,
    ruleConfig,
    factions,
    logs: openingLogs,
  };
}
