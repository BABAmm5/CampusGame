export type FactionId = 1 | 2 | 3 | 4;

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
  };
  battle: {
    baseAttack: number;
    weaponBonus: number;
    armorReduction: number;
    structureFactor: number;
    retaliationFactor: number;
    minimumDamage: number;
  };
}

export interface FactionState {
  id: FactionId;
  name: string;
  color: string;
  hp: number;
  gold: number;
  civilians: number;
  soldiers: number;
  weaponLevel: number;
  armor: number;
  alive: boolean;
  reinforcementPending: boolean;
}

export interface BattleResolution {
  attackerId: FactionId;
  defenderId: FactionId;
  committedSoldiers: number;
  attackerLosses: number;
  defenderLosses: number;
  structureDamage: number;
  defenderDefeated: boolean;
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
  started: boolean;
  winnerId: FactionId | null;
  ruleConfig: RuleConfig;
  factions: FactionState[];
  logs: GameLogEntry[];
}
