import type { FactionId, InitialFactionStats, MainFactionId, RuleConfig } from "./types";

export const FACTION_IDS: FactionId[] = [1, 2, 3, 4];
export const MAIN_FACTION_IDS: MainFactionId[] = [1, 2, 3, 4];
// 附属阵营固定参与（不受 factionCount 影响，加入时机由 roundEngine 控制）
export const SUB_FACTION_IDS = [5, 6, 7] as const;
export const NEUTRAL_FACTION_ID = 8 as const;

export const FACTION_META: Record<FactionId, { name: string; color: string; accent: string; isMain: boolean; joinRound?: number; initialOwner?: MainFactionId }> = {
  1: { name: "统治者", color: "bg-red-100", accent: "#c2410c", isMain: true },
  2: { name: "反抗者", color: "bg-sky-100", accent: "#0369a1", isMain: true },
  3: { name: "守护者", color: "bg-amber-100", accent: "#b45309", isMain: true },
  4: { name: "游猎者", color: "bg-emerald-100", accent: "#166534", isMain: true },
  5: { name: "暮光者", color: "bg-violet-100", accent: "#7c3aed", isMain: false, joinRound: 2, initialOwner: 1 },
  6: { name: "募道者", color: "bg-teal-100", accent: "#0d9488", isMain: false, joinRound: 3, initialOwner: 2 },
  7: { name: "幕读者", color: "bg-indigo-100", accent: "#4338ca", isMain: false, joinRound: 2, initialOwner: 3 },
  8: { name: "墓怨者", color: "bg-gray-100", accent: "#374151", isMain: false },
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
  1: { hp: 10, gold: 300, civilians: 10, soldiers: 5, weaponLevel: 1, armor: 0 },
  2: { hp: 8,  gold: 200, civilians: 5,  soldiers: 8, weaponLevel: 1, armor: 0 },
  3: { hp: 6,  gold: 300, civilians: 10, soldiers: 0, weaponLevel: 1, armor: 0 },
  4: { hp: 8,  gold: 200, civilians: 0,  soldiers: 10, weaponLevel: 1, armor: 0 },
  // 附属阵营初始属性（特殊单位不在此，在 initGame 中单独处理）
  5: { hp: 12, gold: 200, civilians: 0, soldiers: 0, weaponLevel: 0, armor: 0 }, // 暮光者：hp=3x4旗=12
  6: { hp: 7,  gold: 300, civilians: 0, soldiers: 0, weaponLevel: 0, armor: 0 }, // 募道者：10仓
  7: { hp: 8,  gold: 300, civilians: 0, soldiers: 0, weaponLevel: 0, armor: 0 }, // 幕读者：10士
  8: { hp: 15, gold: 0,   civilians: 0, soldiers: 0, weaponLevel: 0, armor: 0 }, // 墓怨者：3侍
};

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  initialFactionStats: DEFAULT_INITIAL_FACTION_STATS,
  economy: {
    reinforcementPerTurn: 5,
    civilianGoldOutput: 10,
    soldierUpkeep: 10,
    convertAmount: 1,
    weaponUpgradeCost: 20,
    maxWeaponLevel: 5,
    armorUpgradeCost: 20,
    maxArmor: 6,
    rulerDraftCostPerCivilian: 10,
    guardianDraftCostPerCivilian: 15,
    guardianSoldierToCivilianGold: 10,
    guardianTributeCivilians: 2,
    guardianTributeGold: 30,
  },
  battle: {
    baseAttack: 4,
    weaponBonus: 2,
    armorReduction: 2,
    structureFactor: 1,
    retaliationFactor: 0.35,
    minimumDamage: 1,
    attacksPerTurn: 1,
    firstRoundDeployLimit: 3,
    deployLimitIncreasePerRound: 2,
    maxDeployUnits: 10,
    actionUnitCost: 1,
    armorReductionPercent: 5,
    invaderGuardianBonusPercent: 20,
  },
};
