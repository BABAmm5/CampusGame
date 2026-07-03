// 1-4: 主阵营; 5: 暮光者; 6: 募道者; 7: 幕读者; 8: 墓怨者
export type FactionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type MainFactionId = 1 | 2 | 3 | 4;
export type SubFactionId = 5 | 6 | 7;
export type NeutralFactionId = 8;
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
  // 附属阵营特殊单位
  flags: number;       // 暮光者：旗
  stockpile: number;  // 募道者：仓
  scholars: number;   // 幕读者：士
  retainers: number;  // 墓怨者：侍 (count)
  retainerLevel: number; // 墓怨者：侍等级
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
  // 归属主阵营（附属阵营专用）
  ownerFactionId: MainFactionId | null;
  // 标记系统
  marksWar: number;    // 战（暮光者归属标记）
  marksSeal: number;   // 封（募道者归属标记）
  marksTalent: number; // 才（幕读者归属标记）
  marksPatience: number; // 忍（守护者金免触发）
  // 附属阵营特殊状态
  subFactionJoined: boolean; // 是否已加入游戏
  tributeRoundsActive: number; // 万邦朝剩余轮数
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
  // 全局标记持有情况（factionId -> count）
  warMarks: Record<number, number>;
  sealMarks: Record<number, number>;
  talentMarks: Record<number, number>;
  patienceMarks: Record<number, number>;
}
