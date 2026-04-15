import { createLog } from "./economyEngine";
import type { BattleResolution, FactionState, GameLogEntry, RuleConfig } from "./types";

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
  const safeCommitted = Math.max(1, Math.min(committedSoldiers, attacker.soldiers));
  const attackPower =
    safeCommitted * (ruleConfig.battle.baseAttack + attacker.weaponLevel * ruleConfig.battle.weaponBonus);
  const damage = Math.max(
    ruleConfig.battle.minimumDamage,
    Math.floor(attackPower / 10) - defender.armor * ruleConfig.battle.armorReduction,
  );
  const retaliation = Math.max(
    0,
    Math.floor(defender.soldiers * ruleConfig.battle.retaliationFactor) - attacker.armor,
  );
  const defenderLosses = Math.min(defender.soldiers, Math.ceil(safeCommitted * 0.5));
  const attackerLosses = Math.min(attacker.soldiers, Math.ceil(retaliation));
  const nextAttacker: FactionState = {
    ...attacker,
    soldiers: Math.max(0, attacker.soldiers - attackerLosses),
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
  };

  return {
    attacker: nextAttacker,
    defender: defeated ? { ...nextDefender, alive: false } : nextDefender,
    result,
    logs: [
      createLog(
        round,
        attacker.id,
        `${attacker.name} 出兵 ${safeCommitted} 攻击 ${defender.name}，造成 ${damage} 点城防伤害。`,
      ),
      createLog(
        round,
        defender.id,
        `${defender.name} 损失 ${defenderLosses} 兵，反击使 ${attacker.name} 损失 ${attackerLosses} 兵。`,
      ),
    ],
  };
}
