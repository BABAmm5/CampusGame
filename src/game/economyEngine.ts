import type { FactionState, GameLogEntry, RuleConfig } from "./types";

export function createLog(
  round: number,
  factionId: FactionState["id"] | null,
  message: string,
): GameLogEntry {
  return {
    id: crypto.randomUUID(),
    round,
    factionId,
    message,
  };
}

export function applyTurnIncome(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  const income = faction.civilians * ruleConfig.economy.civilianGoldOutput;
  const upkeep = faction.soldiers * ruleConfig.economy.soldierUpkeep;
  const net = income - upkeep;
  const nextGold = Math.max(0, faction.gold + net);
  const nextFaction = {
    ...faction,
    gold: nextGold,
    reinforcementPending: true,
  };

  return {
    faction: nextFaction,
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 征收 ${income} 金，维持军费 ${upkeep} 金，净变动 ${net >= 0 ? "+" : ""}${net}。`,
      ),
    ],
  };
}

export function applyReinforcement(
  faction: FactionState,
  round: number,
  civilianCount: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  const safeCivilianCount = Math.max(
    0,
    Math.min(civilianCount, ruleConfig.economy.reinforcementPerTurn),
  );
  const soldierCount = ruleConfig.economy.reinforcementPerTurn - safeCivilianCount;
  const nextFaction = {
    ...faction,
    civilians: faction.civilians + safeCivilianCount,
    soldiers: faction.soldiers + soldierCount,
    reinforcementPending: false,
  };

  return {
    faction: nextFaction,
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 本轮增员 ${ruleConfig.economy.reinforcementPerTurn}：民 ${safeCivilianCount}，兵 ${soldierCount}。`,
      ),
    ],
  };
}

export function convertCiviliansToSoldiers(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.civilians < ruleConfig.economy.convertAmount) {
    return {
      faction,
      logs: [
        createLog(round, faction.id, `${faction.name} 民众不足，无法征召 ${ruleConfig.economy.convertAmount} 人入伍。`),
      ],
    };
  }

  return {
    faction: {
      ...faction,
      civilians: faction.civilians - ruleConfig.economy.convertAmount,
      soldiers: faction.soldiers + ruleConfig.economy.convertAmount,
    },
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 征召 ${ruleConfig.economy.convertAmount} 民为兵。`,
      ),
    ],
  };
}

export function convertSoldiersToCivilians(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.soldiers < ruleConfig.economy.convertAmount) {
    return {
      faction,
      logs: [
        createLog(round, faction.id, `${faction.name} 士兵不足，无法遣返 ${ruleConfig.economy.convertAmount} 人。`),
      ],
    };
  }

  return {
    faction: {
      ...faction,
      civilians: faction.civilians + ruleConfig.economy.convertAmount,
      soldiers: faction.soldiers - ruleConfig.economy.convertAmount,
    },
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 遣返 ${ruleConfig.economy.convertAmount} 兵为民，稳固内政。`,
      ),
    ],
  };
}

export function upgradeWeapon(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.weaponLevel >= ruleConfig.economy.maxWeaponLevel) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 武器等级已达上限。`)],
    };
  }

  if (faction.gold < ruleConfig.economy.weaponUpgradeCost) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 金币不足，无法升级武器。`)],
    };
  }

  return {
    faction: {
      ...faction,
      gold: faction.gold - ruleConfig.economy.weaponUpgradeCost,
      weaponLevel: faction.weaponLevel + 1,
    },
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 投入 ${ruleConfig.economy.weaponUpgradeCost} 金，武器提升至 ${faction.weaponLevel + 1} 级。`,
      ),
    ],
  };
}

export function upgradeArmor(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.armor >= ruleConfig.economy.maxArmor) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 盔甲已强化到上限。`)],
    };
  }

  if (faction.gold < ruleConfig.economy.armorUpgradeCost) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 金币不足，无法强化盔甲。`)],
    };
  }

  return {
    faction: {
      ...faction,
      gold: faction.gold - ruleConfig.economy.armorUpgradeCost,
      armor: faction.armor + 1,
    },
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 投入 ${ruleConfig.economy.armorUpgradeCost} 金，盔甲提升至 ${faction.armor + 1} 级。`,
      ),
    ],
  };
}
