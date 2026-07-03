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
  // 附属阵营未加入时不产出收入
  if (!faction.subFactionJoined) {
    return { faction, logs: [] };
  }
  // 墓怨者无金币来源（靠战斗获得）
  if (faction.id === 8) {
    const nextFaction = {
      ...faction, restActive: false, incomeMultiplier: 1,
      reinforcementPending: true, attacksThisTurn: 0, weaponUpgradedThisTurn: false,
    };
    return { faction: nextFaction, logs: [createLog(round, faction.id, `${faction.name} 进入行动阶段。`)] };
  }
  // 幕读者：所属阵营民产金+25%
  const civilianBonus = faction.id === 7 ? 1.25 : 1;
  const income =
    faction.civilians * ruleConfig.economy.civilianGoldOutput * Math.max(1, faction.incomeMultiplier || 1) * civilianBonus;
  // 游猎者和墓怨者自给不扣军费；附属阵营无兵（游猎者属附属时或自己有兵时另计）
  const upkeep =
    faction.id === 4 || (faction.id as number) === 8 || faction.restActive ? 0 : faction.soldiers * ruleConfig.economy.soldierUpkeep;
  const net = income - upkeep;
  const nextGold = Math.max(0, faction.gold + net);
  const nextFaction = {
    ...faction,
    gold: nextGold,
    restActive: false,
    incomeMultiplier: 1,
    reinforcementPending: true,
    attacksThisTurn: 0,
    weaponUpgradedThisTurn: false,
  };

  return {
    faction: nextFaction,
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 征收 ${Math.floor(income)} 金，维持军费 ${upkeep} 金，净变动 ${net >= 0 ? "+" : ""}${Math.floor(net)}。`,
      ),
    ],
  };
}

export function exchangeRulerHpForCivilians(
  faction: FactionState,
  round: number,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.id !== 1) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 没有可主动发动的阵营技能。`)],
    };
  }

  if (faction.hp <= 5) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 血量低于5，无法发动恤民。`)],
    };
  }

  return {
    faction: {
      ...faction,
      hp: faction.hp - 1,
      civilians: Math.min(100, faction.civilians + 2),
    },
    logs: [createLog(round, faction.id, `${faction.name} 发动恤民：消耗 1 血，获得 2 名平民。`)],
  };
}

export function applyReinforcement(
  faction: FactionState,
  round: number,
  civilianCount: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  // 附属阵营不可增员（特殊单位由所属阵营承担）
  if (faction.id >= 5) {
    return { faction, logs: [createLog(round, faction.id, `${faction.name} 为附属阵营，不可自行增员。`)] };
  }
  const safeCivilianCount = Math.max(
    0,
    Math.min(civilianCount, ruleConfig.economy.reinforcementPerTurn),
  );
  const soldierCount = ruleConfig.economy.reinforcementPerTurn - safeCivilianCount;
  const nextCivilianGain = faction.id === 4 ? 0 : safeCivilianCount;
  const nextSoldierGain = faction.id === 4 ? ruleConfig.economy.reinforcementPerTurn : soldierCount;
  const nextFaction = {
    ...faction,
    civilians: Math.min(100, faction.civilians + nextCivilianGain),
    soldiers: Math.min(60, faction.soldiers + nextSoldierGain),
    reinforcementPending: false,
  };

  return {
    faction: nextFaction,
    logs: [
      createLog(
        round,
        faction.id,
        faction.id === 4
          ? `${faction.name} 本轮增员 ${ruleConfig.economy.reinforcementPerTurn}：入侵者不可拥有平民，全部转为士兵。`
          : `${faction.name} 本轮增员 ${ruleConfig.economy.reinforcementPerTurn}：平民 ${nextCivilianGain}，士兵 ${nextSoldierGain}。`,
      ),
    ],
  };
}

function draftCostForFaction(faction: FactionState, ruleConfig: RuleConfig): number {
  if (faction.id === 3 && faction.awakened) {
    return 0;
  }
  if (faction.id === 1) {
    return ruleConfig.economy.rulerDraftCostPerCivilian;
  }
  if (faction.id === 3) {
    return ruleConfig.economy.rulerDraftCostPerCivilian;
  }
  return 0;
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
  if (faction.id === 4) {
    return {
      faction: { ...faction, civilians: 0 },
      logs: [createLog(round, faction.id, `${faction.name} 不可拥有平民，无法执行民转兵。`)],
    };
  }

  const cost = draftCostForFaction(faction, ruleConfig) * ruleConfig.economy.convertAmount;
  if (faction.gold < cost) {
    return {
      faction,
      logs: [
        createLog(round, faction.id, `${faction.name} 金币不足，民转兵需要 ${cost} 金币。`),
      ],
    };
  }

  return {
    faction: {
      ...faction,
      gold: faction.gold - cost,
      civilians: faction.civilians - ruleConfig.economy.convertAmount,
      soldiers: Math.min(60, faction.soldiers + ruleConfig.economy.convertAmount),
    },
    logs: [
      createLog(
        round,
        faction.id,
        `${faction.name} 征召 ${ruleConfig.economy.convertAmount} 平民为士兵${cost > 0 ? `，花费 ${cost} 金币` : ""}。`,
      ),
    ],
  };
}

export function convertSoldiersToCivilians(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.id === 4) {
    return {
      faction: { ...faction, civilians: 0 },
      logs: [createLog(round, faction.id, `${faction.name} 不可拥有平民，无法执行兵转民。`)],
    };
  }

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
      civilians: Math.min(100, faction.civilians + ruleConfig.economy.convertAmount),
      soldiers: faction.soldiers - ruleConfig.economy.convertAmount,
      gold:
        faction.id === 3
          ? faction.gold + ruleConfig.economy.guardianSoldierToCivilianGold * ruleConfig.economy.convertAmount
          : faction.gold,
    },
    logs: [
      createLog(
        round,
        faction.id,
        faction.id === 3
          ? `${faction.name} 遣返 ${ruleConfig.economy.convertAmount} 士兵为平民，获得 ${
              ruleConfig.economy.guardianSoldierToCivilianGold * ruleConfig.economy.convertAmount
            } 金币。`
          : `${faction.name} 遣返 ${ruleConfig.economy.convertAmount} 士兵为平民，稳固内政。`,
      ),
    ],
  };
}

export function upgradeWeapon(
  faction: FactionState,
  round: number,
  ruleConfig: RuleConfig,
): { faction: FactionState; logs: GameLogEntry[] } {
  if (faction.weaponUpgradedThisTurn) {
    return {
      faction,
      logs: [createLog(round, faction.id, `${faction.name} 本回合已经升级过武器。`)],
    };
  }

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
      weaponUpgradedThisTurn: true,
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
