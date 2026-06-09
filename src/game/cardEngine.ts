import { CARD_DEFINITIONS, MAIN_DECK_CARD_IDS, WEAPON_CARD_IDS } from "./cards";
import { FACTION_INITIAL_OVERRIDES } from "./config";
import { createLog } from "./economyEngine";
import type { CardId, CardInstance, FactionId, FactionState, GameLogEntry, GameState } from "./types";

interface DrawResult {
  deck: CardInstance[];
  discardPile: CardInstance[];
  drawn: CardInstance[];
  logs: GameLogEntry[];
}

export interface PlayCardOptions {
  targetId?: FactionId;
}

export interface PlayCardResult {
  state: GameState;
  logs: GameLogEntry[];
  prevented: boolean;
  requiresBattle: boolean;
}

let nextCardSerial = 1;

function replaceFaction(factions: FactionState[], nextFaction: FactionState): FactionState[] {
  return factions.map((faction) => (faction.id === nextFaction.id ? nextFaction : faction));
}

function makeInstance(cardId: CardId, exemptFromHandLimit = false): CardInstance {
  nextCardSerial += 1;
  return {
    instanceId: `${cardId}-${Date.now().toString(36)}-${nextCardSerial}`,
    cardId,
    exemptFromHandLimit,
  };
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function createDeck(): CardInstance[] {
  return shuffle([...MAIN_DECK_CARD_IDS, ...WEAPON_CARD_IDS].map((cardId) => makeInstance(cardId)));
}

export function drawCards(
  deck: CardInstance[],
  discardPile: CardInstance[],
  count: number,
  round: number,
  factionId: FactionId,
): DrawResult {
  let nextDeck = [...deck];
  let nextDiscard = [...discardPile];
  const drawn: CardInstance[] = [];
  const logs: GameLogEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (nextDeck.length === 0) {
      if (nextDiscard.length === 0) {
        logs.push(createLog(round, factionId, "牌堆和弃牌堆均为空，无法继续摸牌。"));
        break;
      }
      nextDeck = shuffle(nextDiscard);
      nextDiscard = [];
      logs.push(createLog(round, null, "牌堆耗尽，弃牌堆重新洗入牌堆。"));
    }

    const card = nextDeck[0];
    nextDeck = nextDeck.slice(1);
    drawn.push(card);
  }

  return { deck: nextDeck, discardPile: nextDiscard, drawn, logs };
}

export function drawToFaction(state: GameState, factionId: FactionId, count: number): GameState {
  const faction = state.factions.find((item) => item.id === factionId);
  if (!faction) {
    return state;
  }
  const draw = drawCards(state.deck, state.discardPile, count, state.round, factionId);
  const nextFaction = {
    ...faction,
    hand: [...faction.hand, ...draw.drawn],
  };
  const logs = [
    ...draw.logs,
    createLog(state.round, factionId, `${faction.name} 摸 ${draw.drawn.length} 张牌。`),
  ];
  return {
    ...state,
    deck: draw.deck,
    discardPile: draw.discardPile,
    factions: replaceFaction(state.factions, nextFaction),
    logs: [...state.logs, ...logs],
  };
}

function removeCardFromHand(
  faction: FactionState,
  instanceId: string,
): { faction: FactionState; card: CardInstance | null } {
  const card = faction.hand.find((item) => item.instanceId === instanceId) ?? null;
  if (!card) {
    return { faction, card: null };
  }
  return {
    faction: {
      ...faction,
      hand: faction.hand.filter((item) => item.instanceId !== instanceId),
    },
    card,
  };
}

export function consumeAvoidWar(
  state: GameState,
  targetId: FactionId,
  reason: string,
): { state: GameState; prevented: boolean; logs: GameLogEntry[] } {
  const target = state.factions.find((faction) => faction.id === targetId);
  const avoidCard = target?.hand.find((card) => card.cardId === "avoid_war");
  if (!target || !avoidCard) {
    return { state, prevented: false, logs: [] };
  }

  const nextTarget = {
    ...target,
    hand: target.hand.filter((card) => card.instanceId !== avoidCard.instanceId),
  };
  const log = createLog(state.round, targetId, `${target.name} 自动打出避战，抵消 ${reason}。`);
  return {
    state: {
      ...state,
      factions: replaceFaction(state.factions, nextTarget),
      discardPile: [...state.discardPile, avoidCard],
      logs: [...state.logs, log],
    },
    prevented: true,
    logs: [log],
  };
}

function discardPlayedCard(state: GameState, card: CardInstance): GameState {
  return {
    ...state,
    discardPile: [...state.discardPile, { ...card, exemptFromHandLimit: false }],
  };
}

function countDefeatedOrContracted(factions: FactionState[]): number {
  return factions.filter(
    (faction) => !faction.alive || faction.revivalTributeTo || faction.attackPenaltyAgainst,
  ).length;
}

export function applyAwakenings(state: GameState): GameState {
  let nextState = state;
  const logs: GameLogEntry[] = [];
  let factions = nextState.factions;

  factions = factions.map((faction) => {
    if (faction.awakened) {
      return faction;
    }
    if (
      faction.id === 1 &&
      factions.some((item) => item.defeatedBy === 1 || item.revivalTributeTo === 1)
    ) {
      logs.push(createLog(nextState.round, faction.id, `${faction.name} 觉醒：万邦朝，血量上限 +5 并恢复至满血。`));
      return { ...faction, awakened: true, maxHp: faction.maxHp + 5, hp: faction.maxHp + 5 };
    }
    if (faction.id === 2) {
      const ruler = factions.find((item) => item.id === 1);
      if (ruler && !ruler.alive && ruler.defeatedBy === 2) {
        const schemeCards = Object.values(CARD_DEFINITIONS)
          .filter((card) => card.type === "scheme")
          .flatMap((card) =>
            Array.from({ length: card.count }, () => makeInstance(card.id, true)),
          );
        logs.push(createLog(nextState.round, faction.id, `${faction.name} 觉醒：四海服，获得 12 张锦囊牌，不计入手牌上限。`));
        return { ...faction, awakened: true, hand: [...faction.hand, ...schemeCards] };
      }
    }
    if (faction.id === 3 && countDefeatedOrContracted(factions) >= 2) {
      logs.push(createLog(nextState.round, faction.id, `${faction.name} 觉醒：世长存，负面和扣金技能效果失效。`));
      return { ...faction, awakened: true };
    }
    if (faction.id === 4) {
      const guardian = factions.find((item) => item.id === 3);
      if (guardian && !guardian.alive) {
        logs.push(createLog(nextState.round, faction.id, `${faction.name} 觉醒：朔野王，战胜后可夺取武器。`));
        return { ...faction, awakened: true };
      }
    }
    return faction;
  });

  if (logs.length > 0) {
    nextState = {
      ...nextState,
      factions,
      logs: [...nextState.logs, ...logs],
    };
  }
  return nextState;
}

export function discardCardsFromFaction(
  state: GameState,
  factionId: FactionId,
  instanceIds: string[],
): { state: GameState; logs: GameLogEntry[] } {
  const faction = state.factions.find((item) => item.id === factionId);
  if (!faction) {
    return { state, logs: [] };
  }
  const discarded = faction.hand.filter((card) => instanceIds.includes(card.instanceId));
  const nextFaction = {
    ...faction,
    hand: faction.hand.filter((card) => !instanceIds.includes(card.instanceId)),
  };
  const log = createLog(state.round, factionId, `${faction.name} 弃置 ${discarded.length} 张牌。`);
  return {
    state: {
      ...state,
      factions: replaceFaction(state.factions, nextFaction),
      discardPile: [...state.discardPile, ...discarded],
      logs: [...state.logs, log],
    },
    logs: [log],
  };
}

function handLimit(faction: FactionState): number {
  return Math.max(0, Math.floor(faction.hp));
}

export function mustDiscardCount(faction: FactionState): number {
  const counted = faction.hand.filter((card) => !card.exemptFromHandLimit).length;
  return Math.max(0, counted - handLimit(faction));
}

function defaultWeaponAttack(factionId: FactionId): number {
  return FACTION_INITIAL_OVERRIDES[factionId].weaponLevel <= 1 && (factionId === 2 || factionId === 4)
    ? 3
    : 2;
}

export function playCard(
  state: GameState,
  factionId: FactionId,
  instanceId: string,
  options: PlayCardOptions = {},
): PlayCardResult {
  const actor = state.factions.find((faction) => faction.id === factionId);
  if (!actor || !actor.alive) {
    return { state, logs: [], prevented: true, requiresBattle: false };
  }

  const removed = removeCardFromHand(actor, instanceId);
  if (!removed.card) {
    const log = createLog(state.round, factionId, "未找到要使用的卡牌。");
    return {
      state: { ...state, logs: [...state.logs, log] },
      logs: [log],
      prevented: true,
      requiresBattle: false,
    };
  }

  const card = removed.card;
  const definition = CARD_DEFINITIONS[card.cardId];
  let nextState: GameState = {
    ...state,
    factions: replaceFaction(state.factions, removed.faction),
  };
  const logs: GameLogEntry[] = [
    createLog(state.round, factionId, `${actor.name} 使用 ${definition.name}。`),
  ];

  function updateFaction(nextFaction: FactionState) {
    nextState = {
      ...nextState,
      factions: replaceFaction(nextState.factions, nextFaction),
    };
  }

  function currentActor(): FactionState {
    return nextState.factions.find((faction) => faction.id === factionId) ?? removed.faction;
  }

  if (card.cardId === "attack") {
    nextState = discardPlayedCard(nextState, card);
    logs.forEach((log) => {
      nextState = { ...nextState, logs: [...nextState.logs, log] };
    });
    return { state: nextState, logs, prevented: false, requiresBattle: true };
  }

  if (card.cardId === "hero_order") {
    const targets = nextState.factions.filter((faction) => faction.alive && faction.id !== factionId && faction.id !== 1);
    let collector = currentActor();
    targets.forEach((target) => {
      const avoid = consumeAvoidWar(nextState, target.id, definition.name);
      nextState = avoid.state;
      logs.push(...avoid.logs);
      if (!avoid.prevented) {
        const actualTarget = nextState.factions.find((item) => item.id === target.id) ?? target;
        const amount = Math.min(80, actualTarget.gold);
        updateFaction({ ...actualTarget, gold: actualTarget.gold - amount });
        collector = { ...collector, gold: collector.gold + amount };
        logs.push(createLog(state.round, target.id, `${actualTarget.name} 向 ${actor.name} 交出 ${amount} 金。`));
      }
    });
    updateFaction(collector);
  } else if (card.cardId === "recruit_order") {
    const targets = nextState.factions.filter((faction) => faction.alive && faction.id !== factionId && faction.id !== 1);
    let collector = currentActor();
    targets.forEach((target) => {
      const avoid = consumeAvoidWar(nextState, target.id, definition.name);
      nextState = avoid.state;
      logs.push(...avoid.logs);
      if (!avoid.prevented) {
        const actualTarget = nextState.factions.find((item) => item.id === target.id) ?? target;
        const amount = Math.min(2, actualTarget.civilians);
        updateFaction({ ...actualTarget, civilians: actualTarget.civilians - amount });
        collector = { ...collector, soldiers: collector.soldiers + amount };
        logs.push(createLog(state.round, target.id, `${actor.name} 从 ${actualTarget.name} 招募 ${amount} 民为兵。`));
      }
    });
    updateFaction(collector);
  } else if (card.cardId === "cease_war") {
    const target = nextState.factions.find((faction) => faction.id === options.targetId);
    if (!target || target.id === 4) {
      logs.push(createLog(state.round, factionId, "止戈令需要选择非游猎者阵营作为目标。"));
    } else {
      const avoid = consumeAvoidWar(nextState, target.id, definition.name);
      nextState = avoid.state;
      logs.push(...avoid.logs);
      if (!avoid.prevented) {
        const amount = Math.min(3, target.soldiers);
        updateFaction({ ...target, soldiers: target.soldiers - amount, civilians: target.civilians + amount });
        logs.push(createLog(state.round, target.id, `${target.name} ${amount} 兵转为民。`));
      }
    }
  } else if (card.cardId === "trade_post") {
    const actorNow = currentActor();
    const target = nextState.factions.find((faction) => faction.id === options.targetId);
    if (!target || target.id === factionId || actorNow.gold < 100) {
      logs.push(createLog(state.round, factionId, "交易台需要选择其他阵营，且自己至少有 100 金。"));
    } else {
      const avoid = consumeAvoidWar(nextState, target.id, definition.name);
      nextState = avoid.state;
      logs.push(...avoid.logs);
      if (!avoid.prevented) {
        updateFaction({
          ...actorNow,
          gold: actorNow.gold - 100,
          weaponAttack: Math.max(actorNow.weaponAttack, target.weaponAttack),
        });
        updateFaction({ ...target, gold: target.gold + 100, weaponAttack: defaultWeaponAttack(target.id) });
        logs.push(createLog(state.round, factionId, `${actor.name} 支付 100 金，收取 ${target.name} 的一副武器。`));
      }
    }
  } else if (card.cardId === "avoid_war") {
    logs.push(createLog(state.round, factionId, "避战会在成为目标时自动打出，主动使用仅作为弃牌。"));
  } else if (card.cardId === "gain_civilians") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, civilians: actorNow.id === 4 ? 0 : actorNow.civilians + 2 });
    logs.push(createLog(state.round, factionId, actorNow.id === 4 ? "游猎者乏农，不能获得民。" : `${actor.name} 获得 2 民。`));
  } else if (card.cardId === "gain_soldiers") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, soldiers: actorNow.soldiers + 2 });
    logs.push(createLog(state.round, factionId, `${actor.name} 获得 2 兵。`));
  } else if (card.cardId === "heal") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, hp: Math.min(actorNow.maxHp, actorNow.hp + 1) });
    logs.push(createLog(state.round, factionId, `${actor.name} 恢复 1 血。`));
  } else if (card.cardId === "armor") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, armor: Math.min(state.ruleConfig.economy.maxArmor, actorNow.armor + 1) });
    logs.push(createLog(state.round, factionId, `${actor.name} 获得 1 层盔甲。`));
  } else if (card.cardId === "dual_weapon") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, hasDualWeapon: true });
    logs.push(createLog(state.round, factionId, `${actor.name} 装备双武器。`));
  } else if (card.cardId === "weapon_upgrade") {
    const actorNow = currentActor();
    if (actorNow.gold < 20) {
      logs.push(createLog(state.round, factionId, "金币不足，武器升级需要 20 金。"));
    } else {
      updateFaction({
        ...actorNow,
        gold: actorNow.gold - 20,
        weaponLevel: Math.min(state.ruleConfig.economy.maxWeaponLevel, actorNow.weaponLevel + 1),
        weaponAttack: Math.min(10, actorNow.weaponAttack + 2),
      });
      logs.push(createLog(state.round, factionId, `${actor.name} 花费 20 金升级武器。`));
    }
  } else if (card.cardId === "gold") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, gold: actorNow.gold + 50 });
    logs.push(createLog(state.round, factionId, `${actor.name} 获得 50 金。`));
  } else if (card.cardId === "civilian_production") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, incomeMultiplier: Math.max(actorNow.incomeMultiplier, 2) });
    logs.push(createLog(state.round, factionId, `${actor.name} 下次资源结算民产金翻倍。`));
  } else if (card.cardId === "rest") {
    const actorNow = currentActor();
    updateFaction({ ...actorNow, restActive: true });
    logs.push(createLog(state.round, factionId, `${actor.name} 进入休整：免维护费且不能被攻击。`));
  } else if (definition.type === "weapon") {
    const actorNow = currentActor();
    if (definition.weaponFamily && actorNow.weaponFamily !== definition.weaponFamily) {
      logs.push(createLog(state.round, factionId, `${definition.name} 与 ${actor.name} 阵营不匹配，无法装备。`));
    } else {
      updateFaction({
        ...actorNow,
        weaponAttack: Math.max(actorNow.weaponAttack, definition.weaponAttack ?? actorNow.weaponAttack),
        weaponLevel: Math.max(actorNow.weaponLevel, Math.ceil((definition.weaponAttack ?? 2) / 2)),
      });
      logs.push(createLog(state.round, factionId, `${actor.name} 装备 ${definition.name}。`));
    }
  }

  nextState = discardPlayedCard(nextState, card);
  nextState = applyAwakenings({
    ...nextState,
    logs: [...nextState.logs, ...logs],
  });
  return { state: nextState, logs, prevented: false, requiresBattle: false };
}
