export type FactionId = 1 | 2 | 3 | 4;
export type TurnPhase = "draw" | "action" | "discard";
export type CardType = "scheme" | "equipment" | "battle" | "weapon";
export type CardId =
  | "hero_order"
  | "recruit_order"
  | "cease_war"
  | "trade_post"
  | "avoid_war"
  | "gain_civilians"
  | "gain_soldiers"
  | "heal"
  | "armor"
  | "dual_weapon"
  | "weapon_upgrade"
  | "attack"
  | "gold"
  | "civilian_production"
  | "rest"
  | "weapon_13_2"
  | "weapon_13_4"
  | "weapon_13_6"
  | "weapon_13_8"
  | "weapon_13_10"
  | "weapon_24_3"
  | "weapon_24_5"
  | "weapon_24_7"
  | "weapon_24_8"
  | "weapon_24_10";

export interface CardDefinition {
  id: CardId;
  name: string;
  type: CardType;
  description: string;
  count: number;
  weaponAttack?: number;
  weaponFamily?: "13" | "24";
}

export interface CardInstance {
  instanceId: string;
  cardId: CardId;
  exemptFromHandLimit?: boolean;
}

export interface InitialFactionStats {
  hp: number;
  gold: number;
  civilians: number;
  soldiers: number;
  weaponLevel: number;
  armor: number;
}

export interface RuleConfig {
  initialFactionStats: InitialFactionStats;
  economy: {
    reinforcementPerTurn: number;
    civilianGoldOutput: number;
    soldierUpkeep: number;
    convertAmount: number;
    weaponUpgradeCost: number;
    maxWeaponLevel: number;
    armorUpgradeCost: number;
    maxArmor: number;
    rulerDraftCostPerCivilian: number;
    guardianDraftCostPerCivilian: number;
    guardianSoldierToCivilianGold: number;
    guardianTributeCivilians: number;
    guardianTributeGold: number;
  };
  battle: {
    baseAttack: number;
    weaponBonus: number;
    armorReduction: number;
    structureFactor: number;
    retaliationFactor: number;
    minimumDamage: number;
    attacksPerTurn: number;
    firstRoundDeployLimit: number;
    deployLimitIncreasePerRound: number;
    maxDeployUnits: number;
    actionUnitCost: number;
    armorReductionPercent: number;
    invaderGuardianBonusPercent: number;
  };
}

export interface FactionState {
  id: FactionId;
  name: string;
  color: string;
  hp: number;
  maxHp: number;
  gold: number;
  civilians: number;
  soldiers: number;
  weaponLevel: number;
  weaponAttack: number;
  weaponFamily: "13" | "24";
  hasDualWeapon: boolean;
  armor: number;
  alive: boolean;
  awakened: boolean;
  restActive: boolean;
  incomeMultiplier: number;
  reinforcementPending: boolean;
  attacksThisTurn: number;
  weaponUpgradedThisTurn: boolean;
  defeatedBy: FactionId | null;
  attackPenaltyAgainst: FactionId | null;
  attackPenaltyPercent: number;
  revivalTributeTo: FactionId | null;
  revivalTributeRoundsRemaining: number;
  hand: CardInstance[];
}

export interface BattleResolution {
  attackerId: FactionId;
  defenderId: FactionId;
  committedSoldiers: number;
  attackerLosses: number;
  defenderLosses: number;
  structureDamage: number;
  defenderDefeated: boolean;
  prevented: boolean;
}

export interface GameLogEntry {
  id: string;
  round: number;
  factionId: FactionId | null;
  message: string;
}

export interface GameState {
  factionCount: number;
  round: number;
  turnIndex: number;
  currentFactionId: FactionId;
  phase: TurnPhase;
  started: boolean;
  winnerId: FactionId | null;
  ruleConfig: RuleConfig;
  factions: FactionState[];
  deck: CardInstance[];
  discardPile: CardInstance[];
  logs: GameLogEntry[];
}
