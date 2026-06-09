import {
  FACTION_IDS,
  FACTION_INITIAL_OVERRIDES,
  FACTION_META,
  DEFAULT_RULE_CONFIG,
} from "./config";
import { createDeck, drawCards } from "./cardEngine";
import { applyTurnIncome, createLog } from "./economyEngine";
import type { FactionState, GameLogEntry, GameState, RuleConfig } from "./types";

export function initGame(
  factionCount: number,
  ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG,
): GameState {
  const baseFactions: FactionState[] = FACTION_IDS.slice(0, factionCount).map((id) => ({
    ...ruleConfig.initialFactionStats,
    ...FACTION_INITIAL_OVERRIDES[id],
    id,
    name: FACTION_META[id].name,
    color: FACTION_META[id].accent,
    maxHp: FACTION_INITIAL_OVERRIDES[id].hp,
    weaponAttack: id === 1 || id === 3 ? 2 : 3,
    weaponFamily: id === 1 || id === 3 ? "13" : "24",
    hasDualWeapon: false,
    alive: true,
    awakened: false,
    restActive: false,
    incomeMultiplier: 1,
    reinforcementPending: true,
    attacksThisTurn: 0,
    weaponUpgradedThisTurn: false,
    defeatedBy: null,
    attackPenaltyAgainst: null,
    attackPenaltyPercent: 0,
    revivalTributeTo: null,
    revivalTributeRoundsRemaining: 0,
    hand: [],
  }));
  let deck = createDeck();
  let discardPile: GameState["discardPile"] = [];
  const openingFaction = baseFactions[0];
  const openingDraw = drawCards(deck, discardPile, 4, 1, openingFaction.id);
  deck = openingDraw.deck;
  discardPile = openingDraw.discardPile;
  const openingWithHand = {
    ...openingFaction,
    hand: openingDraw.drawn,
  };
  const openingIncome = applyTurnIncome(openingWithHand, 1, ruleConfig);
  const factions = [openingIncome.faction, ...baseFactions.slice(1)];
  const openingLogs: GameLogEntry[] = [
    createLog(1, null, "王国棋局开启。各阵营进入第 1 轮。"),
    createLog(1, openingIncome.faction.id, `${openingIncome.faction.name} 开始行动。`),
    createLog(1, openingIncome.faction.id, `${openingIncome.faction.name} 摸 4 张牌。`),
    ...openingDraw.logs,
    ...openingIncome.logs,
  ];

  return {
    factionCount,
    round: 1,
    turnIndex: 0,
    currentFactionId: factions[0].id,
    phase: "action",
    started: true,
    winnerId: null,
    ruleConfig,
    factions,
    deck,
    discardPile,
    logs: openingLogs,
  };
}
