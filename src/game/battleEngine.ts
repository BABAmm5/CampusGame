import { createLog } from "./economyEngine";
import type { BattleResolution, FactionState, GameLogEntry, RuleConfig } from "./types";

/** 掷骰子 (1-6) */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** 附属阵营（暮光者/募道者/幕读者）的骰子攻击  
 *  返回伤害点数（每旗/仓/士 = 1单位血量，骰子决定减少几个单位）
 */
export function resolveSubFactionDiceAttack(
  sub: FactionState,  // 附属阵营
  target: FactionState, // 被攻击目标
  round: number,
): {
  sub: FactionState;
  target: FactionState;
  logs: GameLogEntry[];
  diceRoll: number;
  unitLost: number;
} {
  const dice = rollDice();
  // 骰子点数决定目标减少的旗/仓/士数量（最多减3）
  const unitLost = Math.min(3, Math.ceil(dice / 2));
  let newTarget = { ...target };
  const logs: GameLogEntry[] = [
    createLog(round, sub.id, `${sub.name} 对 ${target.name} 发动骰子攻击，掷出 ${dice} 点。`),
  ];

  if (sub.id === 5) {
    // 暮光者：减少目标旗
    const lost = Math.min(newTarget.flags, unitLost);
    newTarget = { ...newTarget, flags: newTarget.flags - lost };
    // 攻击方获得战标记
    logs.push(createLog(round, target.id, `${target.name} 失去 ${lost} 旗。`));
  } else if (sub.id === 6) {
    // 募道者：对方获得封标记
    logs.push(createLog(round, target.id, `${target.name} 受到攻击，获得1枚封标记。`));
    newTarget = { ...newTarget, hp: Math.max(0, newTarget.hp - Math.ceil(unitLost / 2)) };
  } else if (sub.id === 7) {
    // 幕读者：对方获得才标记（士不可死亡，攻击后给对方才）
    logs.push(createLog(round, target.id, `${target.name} 受到攻击，获得1枚才标记。`));
    newTarget = { ...newTarget, hp: Math.max(0, newTarget.hp - Math.ceil(unitLost / 2)) };
  }

  return { sub, target: newTarget, logs, diceRoll: dice, unitLost };
}

export function getDeploymentLimit(round: number, ruleConfig: RuleConfig): number {
  return Math.min(
    ruleConfig.battle.maxDeployUnits,
    ruleConfig.battle.firstRoundDeployLimit +
      Math.max(0, round - 1) * ruleConfig.battle.deployLimitIncreasePerRound,
  );
}

function weaponAttack(faction: FactionState): number {
  if (faction.weaponAttack > 0) {
    return faction.weaponAttack;
  }
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
  // 游猎者对守护者 +20%
  if (attacker.id === 4 && defender.id === 3) {
    attackPower *= 1 + ruleConfig.battle.invaderGuardianBonusPercent / 100;
  }
  // 墓怨者对游猎者攻击力-30%
  if (attacker.id === 8 && defender.id === 4) {
    attackPower *= 0.7;
  }
  // 堕志：2轮内未对墓怨者造成伤害的阵营，墓怨者攻击力-10%（此处作为防御加成处理：减少attacker对墓怨者的伤害）
  if (defender.id === 8 && attacker.id !== 4) {
    // 简化：每次对墓怨者攻击直接应用，具体堕志计数由UI层追踪
  }
  if (defender.id === 3 && defender.gold >= 30 && !defender.awakened) {
    attackPower -= 5 + weaponAttack(attacker);
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
    weaponAttack: weaponConsumed ? (attacker.weaponFamily === "24" ? 3 : 2) : attacker.weaponAttack,
    armor: weaponConsumed ? Math.min(ruleConfig.economy.maxArmor, attacker.armor + 1) : attacker.armor,
  };
  const nextDefender: FactionState = {
    ...defender,
    gold: defender.id === 3 && defender.gold >= 30 && !defender.awakened ? defender.gold - 30 : defender.gold,
    soldiers: Math.max(0, defender.soldiers - defenderLosses),
    hp: Math.max(0, defender.hp - damage * ruleConfig.battle.structureFactor),
  };
  const defeated = nextDefender.hp <= 0;

  // 游猎者掠获：胜利获40金（最多120/轮，墓怨者觉醒后可夺武器）
  let nextAttacker2 = nextAttacker;
  if (!defeated && attacker.id === 4 && attackPower > (defensePower ?? 0)) {
    nextAttacker2 = { ...nextAttacker2, gold: nextAttacker2.gold + 40 };
  }
  // 墓怨者冢掠：胜利获10-50金
  if (!defeated && attacker.id === 8 && attackPower > (defensePower ?? 0)) {
    const gain = 10 + Math.floor(Math.random() * 5) * 10;
    nextAttacker2 = { ...nextAttacker2, gold: nextAttacker2.gold + gain };
  }

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
  if (defender.id === 3 && defender.gold >= 30 && !defender.awakened) {
    logs.push(
      createLog(
        round,
        defender.id,
        `${defender.name} 发动荫世，支付 30 金借用统治者 1 个单位抵御攻击。`,
      ),
    );
  }

  return {
    attacker: nextAttacker2,
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
