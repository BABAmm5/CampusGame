import { createLog } from "./economyEngine";
import type { BattleResolution, FactionState, GameLogEntry, RuleConfig } from "./types";

export function getDeploymentLimit(round: number, ruleConfig: RuleConfig): number {
  return Math.min(
    ruleConfig.battle.maxDeployUnits,
    ruleConfig.battle.firstRoundDeployLimit +
      Math.max(0, round - 1) * ruleConfig.battle.deployLimitIncreasePerRound,
  );
}

function weaponAttack(faction: FactionState): number {
  const rulerGuardian = [2, 4, 6, 8, 10];
  const rebelInvader = [3, 5, 7, 8, 10];
  const table = faction.id === 1 || faction.id === 3 ? rulerGuardian : rebelInvader;
  return table[Math.max(0, Math.min(table.length - 1, faction.weaponLevel - 1))] ?? table[0];
}

function preventedResult(
  attacker: FactionState,
  defender: FactionState,
  committedSoldiers: number,
  message: string,
  round: number,
): {
  attacker: FactionState;
  defender: FactionState;
  result: BattleResolution;
  logs: GameLogEntry[];
} {
  return {
    attacker,
    defender,
    result: {
      attackerId: attacker.id,
      defenderId: defender.id,
      committedSoldiers,
      attackerLosses: 0,
      defenderLosses: 0,
      structureDamage: 0,
      defenderDefeated: false,
      prevented: true,
    },
    logs: [createLog(round, attacker.id, message)],
  };
}

export function resolveBattle(
  attacker: FactionState,
  defender: FactionState,
  committedSoldiers: number,
  round: number,
  ruleConfig: RuleConfig,
): {
  attacker: FactionState;
  defender: FactionState;
  result: BattleResolution;
  logs: GameLogEntry[];
} {
  if ((attacker.attacksThisTurn ?? 0) >= ruleConfig.battle.attacksPerTurn) {
    return preventedResult(
      attacker,
      defender,
      committedSoldiers,
      `${attacker.name} 本回合已经发动过进攻。`,
      round,
    );
  }

  if (attacker.soldiers <= ruleConfig.battle.actionUnitCost) {
    return preventedResult(
      attacker,
      defender,
      committedSoldiers,
      `${attacker.name} 士兵不足，作战至少需要 ${ruleConfig.battle.actionUnitCost + 1} 名士兵。`,
      round,
    );
  }

  const deployLimit = getDeploymentLimit(round, ruleConfig);
  const safeCommitted = Math.max(
    1,
    Math.min(committedSoldiers, deployLimit, attacker.soldiers - ruleConfig.battle.actionUnitCost),
  );
  const attackerWeapon = weaponAttack(attacker);
  const defenderWeapon = weaponAttack(defender);
  const attackerUnitPower = 5 + attackerWeapon;
  const defenderUnitPower = 5 + defenderWeapon;
  let attackPower = safeCommitted * attackerUnitPower;

  if (attacker.attackPenaltyAgainst === defender.id) {
    attackPower *= 1 - attacker.attackPenaltyPercent / 100;
  }
  if (attacker.id === 4 && defender.id === 3) {
    attackPower *= 1 + ruleConfig.battle.invaderGuardianBonusPercent / 100;
  }

  const defensePower = defender.soldiers * defenderUnitPower * 0.25;
  const powerGap = Math.max(0, attackPower - defensePower);
  const rawDamage = Math.floor(powerGap / 10);
  const armorReduction = Math.min(
    30,
    defender.armor * ruleConfig.battle.armorReductionPercent,
  );
  let damage = Math.floor(rawDamage * (1 - armorReduction / 100));

  if (round === 1) {
    damage = Math.min(1, damage);
  }

  const defenderLosses = Math.min(
    defender.soldiers,
    Math.max(0, Math.ceil(powerGap / 8)),
  );
  const retaliation = Math.max(0, Math.floor(defensePower / 30) - attacker.armor);
  const attackerLosses = Math.min(
    attacker.soldiers,
    ruleConfig.battle.actionUnitCost + retaliation,
  );
  const weaponConsumed = attackerWeapon >= 10;
  const nextAttacker: FactionState = {
    ...attacker,
    soldiers: Math.max(0, attacker.soldiers - attackerLosses),
    attacksThisTurn: (attacker.attacksThisTurn ?? 0) + 1,
    weaponLevel: weaponConsumed ? 1 : attacker.weaponLevel,
    armor: weaponConsumed ? Math.min(ruleConfig.economy.maxArmor, attacker.armor + 1) : attacker.armor,
  };
  const nextDefender: FactionState = {
    ...defender,
    soldiers: Math.max(0, defender.soldiers - defenderLosses),
    hp: Math.max(0, defender.hp - damage * ruleConfig.battle.structureFactor),
  };
  const defeated = nextDefender.hp <= 0;

  const result: BattleResolution = {
    attackerId: attacker.id,
    defenderId: defender.id,
    committedSoldiers: safeCommitted,
    attackerLosses,
    defenderLosses,
    structureDamage: damage,
    defenderDefeated: defeated,
    prevented: false,
  };

  const logs: GameLogEntry[] = [
    createLog(
      round,
      attacker.id,
      `${attacker.name} 上场 ${safeCommitted}/${deployLimit} 名士兵攻击 ${defender.name}，造成 ${damage} 点血量伤害。`,
    ),
    createLog(
      round,
      defender.id,
      `${defender.name} 损失 ${defenderLosses} 名士兵，反击和作战消耗使 ${attacker.name} 损失 ${attackerLosses} 名士兵。`,
    ),
  ];

  if (weaponConsumed) {
    logs.push(
      createLog(
        round,
        attacker.id,
        `${attacker.name} 消耗攻击力 10 的武器，获得 1 套盔甲，武器重置。`,
      ),
    );
  }

  return {
    attacker: nextAttacker,
    defender: defeated
      ? {
          ...nextDefender,
          alive: false,
          defeatedBy: attacker.id,
          attackPenaltyAgainst: attacker.id,
          attackPenaltyPercent: defender.id === 3 ? 30 : 10,
        }
      : nextDefender,
    result,
    logs,
  };
}
