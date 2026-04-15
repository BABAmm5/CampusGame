import type { FactionId, InitialFactionStats, RuleConfig } from "./types";

export const FACTION_IDS: FactionId[] = [1, 2, 3, 4];

export const FACTION_META: Record<
  FactionId,
  { name: string; color: string; accent: string }
> = {
  1: { name: "统治者", color: "bg-red-100", accent: "#c2410c" },
  2: { name: "反抗者", color: "bg-sky-100", accent: "#0369a1" },
  3: { name: "守护者", color: "bg-amber-100", accent: "#b45309" },
  4: { name: "入侵者", color: "bg-emerald-100", accent: "#166534" },
};

export const DEFAULT_INITIAL_FACTION_STATS: InitialFactionStats = {
  hp: 8,
  gold: 200,
  civilians: 5,
  soldiers: 5,
  weaponLevel: 1,
  armor: 0,
};

export const FACTION_INITIAL_OVERRIDES: Record<FactionId, InitialFactionStats> = {
  1: {
    hp: 10,
    gold: 300,
    civilians: 10,
    soldiers: 5,
    weaponLevel: 1,
    armor: 0,
  },
  2: {
    hp: 8,
    gold: 200,
    civilians: 5,
    soldiers: 8,
    weaponLevel: 1,
    armor: 0,
  },
  3: {
    hp: 6,
    gold: 300,
    civilians: 10,
    soldiers: 0,
    weaponLevel: 1,
    armor: 0,
  },
  4: {
    hp: 8,
    gold: 200,
    civilians: 0,
    soldiers: 10,
    weaponLevel: 1,
    armor: 0,
  },
};

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  initialFactionStats: DEFAULT_INITIAL_FACTION_STATS,
  economy: {
    reinforcementPerTurn: 5,
    civilianGoldOutput: 2,
    soldierUpkeep: 1,
    convertAmount: 5,
    weaponUpgradeCost: 25,
    maxWeaponLevel: 5,
    armorUpgradeCost: 20,
    maxArmor: 5,
  },
  battle: {
    baseAttack: 4,
    weaponBonus: 2,
    armorReduction: 2,
    structureFactor: 1,
    retaliationFactor: 0.35,
    minimumDamage: 1,
  },
};
