import { useEffect, useMemo, useState } from "react";
import { DEFAULT_RULE_CONFIG } from "../game/config";
import type { FactionState, GameState, RuleConfig } from "../game/types";

type Screen = "home" | "setup" | "game";

interface PersistedData {
  v: 2;
  gameState: GameState | null;
  factionCount: number;
  ruleConfig: RuleConfig;
}

const STORAGE_KEY = "king-game-save-v2";
const INITIAL_FACTION_COUNT = 4;

function normalizeRuleConfig(ruleConfig: RuleConfig | undefined): RuleConfig {
  return {
    initialFactionStats: {
      ...DEFAULT_RULE_CONFIG.initialFactionStats,
      ...ruleConfig?.initialFactionStats,
    },
    economy: { ...DEFAULT_RULE_CONFIG.economy, ...ruleConfig?.economy },
    battle: { ...DEFAULT_RULE_CONFIG.battle, ...ruleConfig?.battle },
  };
}

function normalizeFaction(faction: FactionState): FactionState {
  const maxHp = faction.maxHp ?? (faction.id === 1 ? 10 : faction.id === 3 ? 6 : 8);
  return {
    ...faction,
    maxHp,
    hp: Math.min(faction.hp, maxHp),
    civilians: faction.id === 4 ? 0 : faction.civilians,
    weaponAttack: faction.weaponAttack ?? (faction.id === 1 || faction.id === 3 ? 2 : 3),
    weaponFamily: faction.weaponFamily ?? (faction.id === 1 || faction.id === 3 ? "13" : "24"),
    hasDualWeapon: faction.hasDualWeapon ?? false,
    awakened: faction.awakened ?? false,
    restActive: faction.restActive ?? false,
    incomeMultiplier: faction.incomeMultiplier ?? 1,
    attacksThisTurn: faction.attacksThisTurn ?? 0,
    weaponUpgradedThisTurn: faction.weaponUpgradedThisTurn ?? false,
    defeatedBy: faction.defeatedBy ?? null,
    attackPenaltyAgainst: faction.attackPenaltyAgainst ?? null,
    attackPenaltyPercent: faction.attackPenaltyPercent ?? 0,
    revivalTributeTo: faction.revivalTributeTo ?? null,
    revivalTributeRoundsRemaining: faction.revivalTributeRoundsRemaining ?? 0,
    ownerFactionId: faction.ownerFactionId ?? null,
    subFactionJoined: faction.subFactionJoined ?? faction.id <= 4,
    tributeRoundsActive: faction.tributeRoundsActive ?? 0,
    flags: faction.flags ?? 0,
    stockpile: faction.stockpile ?? 0,
    scholars: faction.scholars ?? 0,
    retainers: faction.retainers ?? 0,
    retainerLevel: faction.retainerLevel ?? 0,
    marksWar: faction.marksWar ?? 0,
    marksSeal: faction.marksSeal ?? 0,
    marksTalent: faction.marksTalent ?? 0,
    marksPatience: faction.marksPatience ?? 0,
    hand: faction.hand ?? [],
  };
}

function normalizeGameState(state: GameState | null | undefined): GameState | null {
  if (!state) return null;
  const ruleConfig = normalizeRuleConfig(state.ruleConfig);
  return {
    ...state,
    phase: state.phase ?? "action",
    deck: state.deck ?? [],
    discardPile: state.discardPile ?? [],
    ruleConfig,
    factions: state.factions.map(normalizeFaction),
    warMarks: state.warMarks ?? {},
    sealMarks: state.sealMarks ?? {},
    talentMarks: state.talentMarks ?? {},
    patienceMarks: state.patienceMarks ?? {},
  };
}

function readSave(): PersistedData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedData;
    if (parsed.v !== 2) return null;
    return {
      v: 2,
      gameState: normalizeGameState(parsed.gameState),
      factionCount: [2, 3, 4].includes(parsed.factionCount) ? parsed.factionCount : INITIAL_FACTION_COUNT,
      ruleConfig: normalizeRuleConfig(parsed.ruleConfig),
    };
  } catch {
    return null;
  }
}

export function useGameState() {
  const savedData = useMemo(() => readSave(), []);
  const [screen, setScreen] = useState<Screen>("home");
  const [factionCount, setFactionCount] = useState(savedData?.factionCount ?? INITIAL_FACTION_COUNT);
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(savedData?.ruleConfig ?? DEFAULT_RULE_CONFIG);
  const [gameState, setGameState] = useState<GameState | null>(savedData?.gameState ?? null);
  const [includeSubFactions, setIncludeSubFactions] = useState(true);
  const [includeNeutral, setIncludeNeutral] = useState(true);

  const activeFaction =
    gameState?.factions.find((f) => f.id === gameState.currentFactionId) ?? null;

  useEffect(() => {
    const data: PersistedData = { v: 2, gameState, factionCount, ruleConfig };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [factionCount, gameState, ruleConfig]);

  return {
    screen, setScreen,
    factionCount, setFactionCount,
    ruleConfig, setRuleConfig,
    gameState, setGameState,
    activeFaction,
    hasSavedGame: !!savedData?.gameState,
    includeSubFactions, setIncludeSubFactions,
    includeNeutral, setIncludeNeutral,
  };
}
