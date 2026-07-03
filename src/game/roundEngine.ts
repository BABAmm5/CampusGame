import { applyAwakenings, drawCards } from "./cardEngine";
import { applyTurnIncome, createLog } from "./economyEngine";
import { determineWinner } from "./victoryEngine";
import { FACTION_META, SUB_FACTION_IDS } from "./config";
import type { FactionId, FactionState, GameState, GameLogEntry, MainFactionId } from "./types";

function findNextAliveIndex(factions: FactionState[], startIndex: number): number {
  for (let offset = 1; offset <= factions.length; offset += 1) {
    const nextIndex = (startIndex + offset) % factions.length;
    const f = factions[nextIndex];
    // 只轮转：主阵营存活 OR 附属/中立阵营已加入且存活
    if (f.alive && f.subFactionJoined) {
      return nextIndex;
    }
  }
  return startIndex;
}

export function replaceFaction(factions: FactionState[], nextFaction: FactionState): FactionState[] {
  return factions.map((faction) => (faction.id === nextFaction.id ? nextFaction : faction));
}

/** 处理附属阵营加入游戏 */
function processSubFactionJoins(state: GameState): { state: GameState; logs: GameLogEntry[] } {
  let nextState = state;
  const logs: GameLogEntry[] = [];

  for (const subId of SUB_FACTION_IDS) {
    const sub = nextState.factions.find((f) => f.id === subId);
    if (!sub || sub.subFactionJoined) continue;
    const meta = FACTION_META[subId as FactionId];
    if (meta.joinRound && nextState.round >= meta.joinRound) {
      const owner = nextState.factions.find((f) => f.id === sub.ownerFactionId && f.alive);
      const joinedSub = {
        ...sub,
        subFactionJoined: true,
        ownerFactionId: (owner?.id ?? meta.initialOwner ?? null) as MainFactionId | null,
      };
      nextState = { ...nextState, factions: replaceFaction(nextState.factions, joinedSub) };
      logs.push(
        createLog(nextState.round, subId as FactionId,
          `${sub.name} 在第 ${nextState.round} 轮加入棋局，初始归属 ${joinedSub.ownerFactionId ? FACTION_META[joinedSub.ownerFactionId].name : "无"}。`)
      );
    }
  }
  return { state: nextState, logs };
}

/** 检查附属阵营换主条件（战/封/才标记满足时） */
function processOwnershipChanges(state: GameState): { state: GameState; logs: GameLogEntry[] } {
  let nextState = state;
  const logs: GameLogEntry[] = [];

  // 暮光者：某阵营战标记达10时换主
  const twilight = nextState.factions.find((f) => f.id === 5 && f.subFactionJoined && f.alive);
  if (twilight) {
    for (const [factionIdStr, count] of Object.entries(nextState.warMarks)) {
      const factionId = Number(factionIdStr) as FactionId;
      if (count >= 10 && factionId !== twilight.ownerFactionId) {
        const newOwner = nextState.factions.find((f) => f.id === factionId && f.alive);
        if (newOwner) {
          // 清除该阵营战标记，暮光者重置并换主
          const resetTwilight: FactionState = {
            ...twilight,
            ownerFactionId: factionId as MainFactionId,
            hp: twilight.maxHp, flags: 4, gold: 200, // 恢复初始
          };
          nextState = {
            ...nextState,
            warMarks: { ...nextState.warMarks, [factionId]: 0 },
            factions: replaceFaction(nextState.factions, resetTwilight),
          };
          logs.push(createLog(nextState.round, 5 as FactionId,
            `${newOwner.name} 集齐10战，暮光者归属更换为 ${newOwner.name}，恢复初始状态。`));
        }
      }
    }
  }

  // 募道者：某阵营封标记达8时换主
  const recruited = nextState.factions.find((f) => f.id === 6 && f.subFactionJoined && f.alive);
  if (recruited) {
    for (const [factionIdStr, count] of Object.entries(nextState.sealMarks)) {
      const factionId = Number(factionIdStr) as FactionId;
      if (count >= 8 && factionId !== recruited.ownerFactionId) {
        const newOwner = nextState.factions.find((f) => f.id === factionId && f.alive);
        if (newOwner) {
          const resetRecruited: FactionState = { ...recruited, ownerFactionId: factionId as MainFactionId };
          nextState = {
            ...nextState,
            sealMarks: { ...nextState.sealMarks, [factionId]: 0 },
            factions: replaceFaction(nextState.factions, resetRecruited),
          };
          logs.push(createLog(nextState.round, 6 as FactionId,
            `${newOwner.name} 集齐8封，募道者归属更换为 ${newOwner.name}。`));
        }
      }
    }
  }

  // 幕读者：某阵营才标记达10时换主
  const curtain = nextState.factions.find((f) => f.id === 7 && f.subFactionJoined && f.alive);
  if (curtain) {
    for (const [factionIdStr, count] of Object.entries(nextState.talentMarks)) {
      const factionId = Number(factionIdStr) as FactionId;
      if (count >= 10 && factionId !== curtain.ownerFactionId) {
        const newOwner = nextState.factions.find((f) => f.id === factionId && f.alive);
        if (newOwner) {
          const resetCurtain: FactionState = {
            ...curtain,
            ownerFactionId: factionId as MainFactionId,
            gold: 0, // 换主后金币清零
          };
          nextState = {
            ...nextState,
            talentMarks: { ...nextState.talentMarks, [factionId]: 0 },
            factions: replaceFaction(nextState.factions, resetCurtain),
          };
          logs.push(createLog(nextState.round, 7 as FactionId,
            `${newOwner.name} 集齐10才，幕读者归属更换为 ${newOwner.name}，幕读者金币清零。`));
        }
      }
    }
  }

  return { state: nextState, logs };
}

export function nextTurn(state: GameState): GameState {
  if (state.winnerId) return state;

  const candidateIndex = findNextAliveIndex(state.factions, state.turnIndex);
  const wrapped = candidateIndex <= state.turnIndex;
  const nextRound = wrapped ? state.round + 1 : state.round;
  const activeFaction = state.factions[candidateIndex];
  const drawResult = drawCards(state.deck, state.discardPile, 4, nextRound, activeFaction.id);
  const activeWithDrawn = { ...activeFaction, hand: [...activeFaction.hand, ...drawResult.drawn] };
  const incomeResult = applyTurnIncome(activeWithDrawn, nextRound, state.ruleConfig);
  let updatedFactions = replaceFaction(state.factions, incomeResult.faction);
  const tributeLogs: GameLogEntry[] = [];

  // 守护者朝贡（未觉醒时）
  if (incomeResult.faction.id === 3 && !incomeResult.faction.awakened) {
    const ruler = updatedFactions.find((f) => f.id === 1 && f.alive);
    const guardian = updatedFactions.find((f) => f.id === 3);
    if (ruler && guardian) {
      const tributeCivilians = Math.min(guardian.civilians, state.ruleConfig.economy.guardianTributeCivilians);
      const tributeGold = Math.min(guardian.gold, state.ruleConfig.economy.guardianTributeGold);
      updatedFactions = replaceFaction(updatedFactions, {
        ...guardian, civilians: guardian.civilians - tributeCivilians, gold: guardian.gold - tributeGold,
      });
      updatedFactions = replaceFaction(updatedFactions, {
        ...ruler, civilians: ruler.civilians + tributeCivilians, gold: ruler.gold + tributeGold,
      });
      tributeLogs.push(createLog(nextRound, guardian.id,
        `${guardian.name} 向 ${ruler.name} 上交 ${tributeCivilians} 名平民和 ${tributeGold} 金币。`));
    }
  }

  // 复活契约朝贡
  const tributeFaction = updatedFactions.find(
    (f) => f.id === incomeResult.faction.id && f.revivalTributeTo && f.revivalTributeRoundsRemaining > 0,
  );
  if (tributeFaction?.revivalTributeTo) {
    const receiver = updatedFactions.find((f) => f.id === tributeFaction.revivalTributeTo && f.alive);
    if (receiver) {
      const tributeGold = Math.floor(tributeFaction.gold * 0.3);
      updatedFactions = replaceFaction(updatedFactions, {
        ...tributeFaction, gold: tributeFaction.gold - tributeGold,
        revivalTributeRoundsRemaining: tributeFaction.revivalTributeRoundsRemaining - 1,
      });
      updatedFactions = replaceFaction(updatedFactions, { ...receiver, gold: receiver.gold + tributeGold });
      tributeLogs.push(createLog(nextRound, tributeFaction.id,
        `${tributeFaction.name} 按复活契约向 ${receiver.name} 上交 ${tributeGold} 金币，剩余 ${tributeFaction.revivalTributeRoundsRemaining - 1} 轮。`));
    }
  }

  // 万邦朝贡（统治者觉醒后，tributeRoundsActive > 0 时各阵营交5金）
  const ruler = updatedFactions.find((f) => f.id === 1 && f.alive && f.awakened && f.tributeRoundsActive > 0);
  if (ruler) {
    let totalGold = 0;
    for (const f of updatedFactions) {
      if (f.id !== 1 && f.alive && f.gold >= 5) {
        updatedFactions = replaceFaction(updatedFactions, { ...f, gold: f.gold - 5 });
        totalGold += 5;
        tributeLogs.push(createLog(nextRound, f.id, `${f.name} 向统治者上交5金（万邦朝）。`));
      }
    }
    updatedFactions = replaceFaction(updatedFactions, {
      ...ruler, gold: ruler.gold + totalGold,
      tributeRoundsActive: ruler.tributeRoundsActive - 1,
    });
  }

  // 幕读者反哺（每5轮，向所属主阵营上交一半金币）
  const curtain = updatedFactions.find((f) => f.id === 7 && f.subFactionJoined && f.alive);
  if (curtain && curtain.ownerFactionId && nextRound % 5 === 0) {
    const owner = updatedFactions.find((f) => f.id === curtain.ownerFactionId && f.alive);
    if (owner) {
      const tribute = Math.floor(curtain.gold / 2);
      updatedFactions = replaceFaction(updatedFactions, { ...curtain, gold: curtain.gold - tribute });
      updatedFactions = replaceFaction(updatedFactions, { ...owner, gold: owner.gold + tribute });
      tributeLogs.push(createLog(nextRound, 7 as FactionId,
        `幕读者反哺 ${owner.name} ${tribute} 金。`));
    }
  }

  const winner = determineWinner(updatedFactions);
  const systemLogs: GameLogEntry[] = [
    createLog(nextRound, incomeResult.faction.id, `${incomeResult.faction.name} 开始行动。`),
    createLog(nextRound, incomeResult.faction.id, `${incomeResult.faction.name} 摸 ${drawResult.drawn.length} 张牌。`),
  ];
  if (wrapped) systemLogs.unshift(createLog(nextRound, null, `第 ${nextRound} 轮开始。`));

  let nextStateBase = applyAwakenings({
    ...state,
    round: nextRound,
    turnIndex: candidateIndex,
    currentFactionId: incomeResult.faction.id,
    phase: "action",
    factions: updatedFactions,
    deck: drawResult.deck,
    discardPile: drawResult.discardPile,
    winnerId: winner?.id ?? null,
    logs: [...state.logs, ...systemLogs, ...drawResult.logs, ...incomeResult.logs, ...tributeLogs],
  });

  // 附属阵营加入检测（在新轮开始时）
  if (wrapped) {
    const joinResult = processSubFactionJoins(nextStateBase);
    nextStateBase = { ...joinResult.state, logs: [...joinResult.state.logs, ...joinResult.logs] };
  }

  // 换主检测
  const ownerResult = processOwnershipChanges(nextStateBase);
  nextStateBase = { ...ownerResult.state, logs: [...ownerResult.state.logs, ...ownerResult.logs] };

  return nextStateBase;
}