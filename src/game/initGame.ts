import {
  FACTION_IDS,
  FACTION_INITIAL_OVERRIDES,
  FACTION_META,
  DEFAULT_RULE_CONFIG,
  SUB_FACTION_IDS,
  NEUTRAL_FACTION_ID,
} from "./config";
import { createDeck, drawCards } from "./cardEngine";
import { applyTurnIncome, createLog } from "./economyEngine";
import type { FactionId, FactionState, GameLogEntry, GameState, MainFactionId, RuleConfig } from "./types";

/** 构造一个阵营初始状态 */
export function makeFactionState(id: FactionId, ruleConfig: RuleConfig): FactionState {
  const override = FACTION_INITIAL_OVERRIDES[id];
  const meta = FACTION_META[id];
  const isMain = meta.isMain;
  // 主阵营使用武器，附属/中立阵营无武器
  const weaponAttack = isMain ? (id === 1 || id === 3 ? 2 : 3) : 0;
  const weaponFamily = (id === 1 || id === 3) ? "13" : "24";

  return {
    ...ruleConfig.initialFactionStats,
    ...override,
    id,
    name: meta.name,
    color: meta.accent,
    maxHp: override.hp,
    weaponAttack,
    weaponFamily,
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
    ownerFactionId: (meta.initialOwner ?? null) as MainFactionId | null,
    subFactionJoined: isMain, // 主阵营直接参与，附属阵营等待加入
    tributeRoundsActive: 0,
    // 特殊单位
    flags: id === 5 ? 4 : 0,         // 暮光者初始4旗
    stockpile: id === 6 ? 10 : 0,    // 募道者初始10仓
    scholars: id === 7 ? 10 : 0,     // 幕读者初始10士
    retainers: id === 8 ? 3 : 0,     // 墓怨者初始3侍
    retainerLevel: id === 8 ? 1 : 0, // 墓怨者侍初始1级
    // 标记
    marksWar: 0,
    marksSeal: 0,
    marksTalent: 0,
    marksPatience: 0,
    hand: [],
  };
}

export function initGame(
  factionCount: number,
  ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG,
  includeSubFactions = true,
  includeNeutral = true,
): GameState {
  const mainIds = FACTION_IDS.slice(0, factionCount) as FactionId[];

  // 主阵营
  const baseFactions: FactionState[] = mainIds.map((id) => makeFactionState(id, ruleConfig));

  // 附属阵营（预创建但 subFactionJoined=false，在 roundEngine 中按时机加入）
  const subFactions: FactionState[] = includeSubFactions
    ? SUB_FACTION_IDS.map((id) => makeFactionState(id as FactionId, ruleConfig))
    : [];

  // 中立阵营
  const neutralFaction: FactionState[] = includeNeutral
    ? [makeFactionState(NEUTRAL_FACTION_ID as FactionId, ruleConfig)]
    : [];

  let allFactions = [...baseFactions, ...subFactions, ...neutralFaction];

  let deck = createDeck();
  let discardPile: GameState["discardPile"] = [];
  const openingFaction = allFactions[0];
  const openingDraw = drawCards(deck, discardPile, 4, 1, openingFaction.id);
  deck = openingDraw.deck;
  discardPile = openingDraw.discardPile;
  const openingWithHand = { ...openingFaction, hand: openingDraw.drawn };
  const openingIncome = applyTurnIncome(openingWithHand, 1, ruleConfig);

  allFactions = [openingIncome.faction, ...allFactions.slice(1)];

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
    currentFactionId: allFactions[0].id,
    phase: "action",
    started: true,
    winnerId: null,
    ruleConfig,
    factions: allFactions,
    deck,
    discardPile,
    logs: openingLogs,
    warMarks: {},
    sealMarks: {},
    talentMarks: {},
    patienceMarks: {},
  };
}
