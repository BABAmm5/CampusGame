import { useEffect, useMemo, useState } from "react";
import { StatCard } from "./components/StatCard";
import { CARD_DEFINITIONS } from "./game/cards";
import {
  applyAwakenings,
  consumeAvoidWar,
  discardCardsFromFaction,
  mustDiscardCount,
  playCard,
} from "./game/cardEngine";
import { DEFAULT_RULE_CONFIG } from "./game/config";
import { encodeConfigCode, parseConfigCode } from "./game/configCodec";
import {
  applyReinforcement,
  convertCiviliansToSoldiers,
  convertSoldiersToCivilians,
  createLog,
  exchangeRulerHpForCivilians,
  upgradeArmor,
  upgradeWeapon,
} from "./game/economyEngine";
import { initGame } from "./game/initGame";
import { nextTurn, replaceFaction } from "./game/roundEngine";
import { getDeploymentLimit, resolveBattle } from "./game/battleEngine";
import {
  determineWinner,
  absorbDefeatedFaction,
  getReviveRestriction,
  reviveFaction,
} from "./game/victoryEngine";
import type { CardInstance, FactionId, FactionState, GameLogEntry, GameState, RuleConfig } from "./game/types";

type Screen = "home" | "setup" | "game";

interface PersistedData {
  v: 2;
  gameState: GameState | null;
  factionCount: number;
  ruleConfig: RuleConfig;
}

const STORAGE_KEY = "king-game-save-v2";
const initialFactionCount = 4;
const defaultBattleTarget: FactionId = 2;

const ruleSections: Array<{
  title: string;
  key: keyof RuleConfig;
  fields: Array<{ key: string; label: string; step?: number; min?: number }>;
}> = [
  {
    title: "初始属性",
    key: "initialFactionStats",
    fields: [
      { key: "hp", label: "初始血量", min: 1 },
      { key: "gold", label: "初始金币", min: 0 },
      { key: "civilians", label: "初始民", min: 0 },
      { key: "soldiers", label: "初始兵", min: 0 },
      { key: "weaponLevel", label: "初始武器等级", min: 0 },
      { key: "armor", label: "初始盔甲", min: 0 },
    ],
  },
  {
    title: "经济规则",
    key: "economy",
    fields: [
      { key: "reinforcementPerTurn", label: "每轮增员", min: 1 },
      { key: "civilianGoldOutput", label: "每民产金", min: 0 },
      { key: "soldierUpkeep", label: "每兵耗金", min: 0 },
      { key: "convertAmount", label: "每次转换人数", min: 1 },
      { key: "weaponUpgradeCost", label: "武器升级费用", min: 0 },
      { key: "maxWeaponLevel", label: "武器等级上限", min: 1 },
      { key: "armorUpgradeCost", label: "盔甲升级费用", min: 0 },
      { key: "maxArmor", label: "盔甲上限", min: 0 },
      { key: "rulerDraftCostPerCivilian", label: "统治者民转兵每人费用", min: 0 },
      { key: "guardianDraftCostPerCivilian", label: "守护者民转兵每人费用", min: 0 },
      { key: "guardianSoldierToCivilianGold", label: "守护者兵转民每人收益", min: 0 },
      { key: "guardianTributeCivilians", label: "守护者每轮上交平民", min: 0 },
      { key: "guardianTributeGold", label: "守护者每轮上交金币", min: 0 },
    ],
  },
  {
    title: "战斗规则",
    key: "battle",
    fields: [
      { key: "baseAttack", label: "基础攻击", min: 1 },
      { key: "weaponBonus", label: "武器加成", min: 0 },
      { key: "armorReduction", label: "盔甲减伤", min: 0 },
      { key: "structureFactor", label: "城防伤害系数", min: 0, step: 0.1 },
      { key: "retaliationFactor", label: "反击系数", min: 0, step: 0.05 },
      { key: "minimumDamage", label: "最小伤害", min: 0 },
      { key: "attacksPerTurn", label: "每回合攻击次数", min: 1 },
      { key: "firstRoundDeployLimit", label: "第一轮上场上限", min: 1 },
      { key: "deployLimitIncreasePerRound", label: "每轮上场上限增加", min: 0 },
      { key: "maxDeployUnits", label: "最高上场单位", min: 1 },
      { key: "actionUnitCost", label: "每次作战消耗士兵", min: 0 },
      { key: "armorReductionPercent", label: "每套盔甲减伤百分比", min: 0 },
      { key: "invaderGuardianBonusPercent", label: "游猎者对守护者伤害加成百分比", min: 0 },
    ],
  },
];

const tableSeats: Array<{
  id: FactionId;
  label: string;
  className: string;
}> = [
  { id: 1, label: "北席", className: "left-1/2 top-2 w-[56%] -translate-x-1/2 sm:w-[32%]" },
  { id: 2, label: "东席", className: "right-2 top-1/2 w-[34%] -translate-y-1/2 sm:w-[24%]" },
  { id: 3, label: "南席", className: "bottom-2 left-1/2 w-[56%] -translate-x-1/2 sm:w-[32%]" },
  { id: 4, label: "西席", className: "left-2 top-1/2 w-[34%] -translate-y-1/2 sm:w-[24%]" },
];

const factionSkillDescriptions: Record<FactionId, string> = {
  1: "恤民：1 血换 5 民。君临：守护者在场时每五轮可扩展锦囊。厌武：民转兵每人 10 金。觉醒万邦朝：血量上限 +5 并回满。",
  2: "举戈：民兵转换免费。激昂：攻击牌触发战斗。觉醒四海服：击败统治者后获得 12 张锦囊，免手牌上限。",
  3: "典民：1 民换 60 金。荫世：被攻击时支付 30 金借统治者单位。朝贡：每轮给统治者 2 民 + 30 金。觉醒世长存：负面和扣金技能失效。",
  4: "自给：士兵不扣金。掠夺：对守护者伤害 +20%。乏农：不能拥有民。觉醒朔野王：守护者被击败后，战胜可夺武器。",
};

function normalizeRuleConfig(ruleConfig: RuleConfig | undefined): RuleConfig {
  return {
    initialFactionStats: {
      ...DEFAULT_RULE_CONFIG.initialFactionStats,
      ...ruleConfig?.initialFactionStats,
    },
    economy: {
      ...DEFAULT_RULE_CONFIG.economy,
      ...ruleConfig?.economy,
    },
    battle: {
      ...DEFAULT_RULE_CONFIG.battle,
      ...ruleConfig?.battle,
    },
  };
}

function normalizeFaction(faction: FactionState): FactionState {
  const maxHp = faction.maxHp ?? (faction.id === 1 ? 10 : faction.id === 3 ? 6 : 8);
  return {
    ...faction,
    maxHp,
    hp: Math.min(faction.hp, maxHp),
    civilians: faction.id === 4 ? 0 : faction.civilians,
    weaponAttack: faction.weaponAttack ?? (faction.id === 1 || faction.id === 3 ? 2 : 3),
    weaponFamily: faction.weaponFamily ?? (faction.id === 1 || faction.id === 3 ? "13" : "24"),
    hasDualWeapon: faction.hasDualWeapon ?? false,
    awakened: faction.awakened ?? false,
    restActive: faction.restActive ?? false,
    incomeMultiplier: faction.incomeMultiplier ?? 1,
    attacksThisTurn: faction.attacksThisTurn ?? 0,
    weaponUpgradedThisTurn: faction.weaponUpgradedThisTurn ?? false,
    defeatedBy: faction.defeatedBy ?? null,
    attackPenaltyAgainst: faction.attackPenaltyAgainst ?? null,
    attackPenaltyPercent: faction.attackPenaltyPercent ?? 0,
    revivalTributeTo: faction.revivalTributeTo ?? null,
    revivalTributeRoundsRemaining: faction.revivalTributeRoundsRemaining ?? 0,
    hand: faction.hand ?? [],
  };
}

function normalizeGameState(state: GameState | null | undefined): GameState | null {
  if (!state) {
    return null;
  }
  const ruleConfig = normalizeRuleConfig(state.ruleConfig);
  return {
    ...state,
    phase: state.phase ?? "action",
    deck: state.deck ?? [],
    discardPile: state.discardPile ?? [],
    ruleConfig,
    factions: state.factions.map(normalizeFaction),
  };
}

function readSave(): PersistedData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedData;
    if (parsed.v !== 2) {
      return null;
    }
    return {
      v: 2,
      gameState: normalizeGameState(parsed.gameState),
      factionCount: [2, 3, 4].includes(parsed.factionCount) ? parsed.factionCount : initialFactionCount,
      ruleConfig: normalizeRuleConfig(parsed.ruleConfig),
    };
  } catch {
    return null;
  }
}

function App() {
  const savedData = useMemo(() => readSave(), []);
  const [screen, setScreen] = useState<Screen>("home");
  const [factionCount, setFactionCount] = useState(savedData?.factionCount ?? initialFactionCount);
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(savedData?.ruleConfig ?? DEFAULT_RULE_CONFIG);
  const [gameState, setGameState] = useState<GameState | null>(savedData?.gameState ?? null);
  const [reinforcementCivilians, setReinforcementCivilians] = useState(3);
  const [battleTargetId, setBattleTargetId] = useState<FactionId>(defaultBattleTarget);
  const [battleSoldiers, setBattleSoldiers] = useState(5);
  const [configCodeInput, setConfigCodeInput] = useState("");
  const [configFeedback, setConfigFeedback] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showFactions, setShowFactions] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showRevive, setShowRevive] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [lastActionLogs, setLastActionLogs] = useState<GameLogEntry[]>([]);

  const showActionLogs = (logs: GameLogEntry[]) => {
    setLastActionLogs(logs);
  };

  const updateRuleValue = (
    sectionKey: keyof RuleConfig,
    fieldKey: string,
    rawValue: string,
    min = 0,
  ) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return;
    }
    setRuleConfig((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [fieldKey]: Math.max(min, value),
      },
    }));
  };

  const activeFaction =
    gameState?.factions.find((faction) => faction.id === gameState.currentFactionId) ?? null;

  useEffect(() => {
    const data: PersistedData = {
      v: 2,
      gameState,
      factionCount,
      ruleConfig,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [factionCount, gameState, ruleConfig]);

  useEffect(() => {
    if (!gameState || !activeFaction) {
      return;
    }
    const firstTarget =
      gameState.factions.find((faction) => faction.alive && faction.id !== activeFaction.id)?.id ??
      activeFaction.id;
    const nextDeploymentLimit = getDeploymentLimit(gameState.round, gameState.ruleConfig);
    const nextBattleLimit = Math.max(
      1,
      Math.min(
        nextDeploymentLimit,
        Math.max(1, activeFaction.soldiers - gameState.ruleConfig.battle.actionUnitCost),
      ),
    );
    setBattleTargetId(firstTarget);
    setBattleSoldiers((current) => Math.max(1, Math.min(current, nextBattleLimit)));
  }, [gameState, activeFaction]);

  const startGame = (nextFactionCount = factionCount, nextRuleConfig = ruleConfig) => {
    const state = initGame(nextFactionCount, nextRuleConfig);
    setFactionCount(nextFactionCount);
    setRuleConfig(nextRuleConfig);
    setGameState(state);
    setScreen("game");
    setShowFactions(false);
    setShowLogs(false);
    setBattleTargetId(
      nextFactionCount > 1 ? (state.factions[1].id as FactionId) : state.factions[0].id,
    );
    setBattleSoldiers(5);
  };

  const continueGame = () => {
    if (!gameState) {
      return;
    }
    setScreen("game");
  };

  const resetToHome = () => {
    setScreen("home");
  };

  const restartGame = () => {
    startGame(factionCount, ruleConfig);
  };

  const updateActiveFaction = (
    updater: (faction: FactionState) => { faction: FactionState; logs: GameState["logs"] },
  ) => {
    if (!gameState || !activeFaction || gameState.winnerId) {
      return;
    }

    const result = updater(activeFaction);
    const updatedFactions = replaceFaction(gameState.factions, result.faction);
    const winner = determineWinner(updatedFactions);
    showActionLogs(result.logs);
    setGameState({
      ...gameState,
      factions: updatedFactions,
      winnerId: winner?.id ?? null,
      logs: [...gameState.logs, ...result.logs],
    });
  };

  const resolveBattleForState = (
    state: GameState,
    attackerId: FactionId,
    defenderId: FactionId,
    committedSoldiers: number,
  ): { state: GameState; logs: GameLogEntry[] } => {
    const attacker = state.factions.find((faction) => faction.id === attackerId);
    const defender = state.factions.find((faction) => faction.id === defenderId);
    if (!attacker || !defender || !attacker.alive || !defender.alive || attacker.id === defender.id) {
      const warningLog = createLog(state.round, attackerId, "请选择有效的敌对阵营。");
      return { state: { ...state, logs: [...state.logs, warningLog] }, logs: [warningLog] };
    }
    if (defender.restActive) {
      const warningLog = createLog(state.round, attackerId, `${defender.name} 正在休整，不能被攻击。`);
      return { state: { ...state, logs: [...state.logs, warningLog] }, logs: [warningLog] };
    }

    const avoid = consumeAvoidWar(state, defender.id, "攻击");
    if (avoid.prevented) {
      return { state: avoid.state, logs: avoid.logs };
    }

    const battle = resolveBattle(attacker, defender, committedSoldiers, state.round, state.ruleConfig);
    let updatedFactions = replaceFaction(avoid.state.factions, battle.attacker);
    updatedFactions = replaceFaction(updatedFactions, battle.defender);
    const extraLogs = [...battle.logs];

    if (battle.result.defenderDefeated) {
      const absorbResult = absorbDefeatedFaction(battle.attacker, battle.defender, state.round);
      updatedFactions = replaceFaction(updatedFactions, absorbResult.winner);
      updatedFactions = replaceFaction(updatedFactions, absorbResult.loser);
      extraLogs.push(
        createLog(state.round, defender.id, `${defender.name} 王城崩溃，阵营覆灭。`),
        ...absorbResult.logs,
      );
    } else if (battle.attacker.id === 4 && battle.attacker.awakened && battle.defender.weaponAttack > 0) {
      const nextAttacker = {
        ...battle.attacker,
        weaponAttack: Math.max(battle.attacker.weaponAttack, battle.defender.weaponAttack),
      };
      const nextDefender = {
        ...battle.defender,
        weaponAttack: battle.defender.weaponFamily === "24" ? 3 : 2,
      };
      updatedFactions = replaceFaction(updatedFactions, nextAttacker);
      updatedFactions = replaceFaction(updatedFactions, nextDefender);
      extraLogs.push(createLog(state.round, attacker.id, `${attacker.name} 发动朔野王，夺取 ${defender.name} 一副武器。`));
    }

    const awakenedState = applyAwakenings({
      ...avoid.state,
      factions: updatedFactions,
      winnerId: determineWinner(updatedFactions)?.id ?? null,
      logs: [...avoid.state.logs, ...extraLogs],
    });
    return { state: awakenedState, logs: extraLogs };
  };

  const handleBattle = () => {
    if (!gameState || !activeFaction || gameState.winnerId) {
      return;
    }

    if (!aliveTargets?.length) {
      const warningLog = createLog(gameState.round, activeFaction.id, "当前没有可进攻的敌对阵营。");
      showActionLogs([warningLog]);
      setGameState({ ...gameState, logs: [...gameState.logs, warningLog] });
      return;
    }

    const result = resolveBattleForState(gameState, activeFaction.id, battleTargetId, battleSoldiers);
    showActionLogs(result.logs);
    setGameState(result.state);
  };

  const handleReinforcement = () => {
    if (!gameState || !activeFaction || gameState.winnerId) {
      return;
    }

    if (!activeFaction.reinforcementPending) {
      const infoLog = createLog(gameState.round, activeFaction.id, `${activeFaction.name} 本回合已经完成增员。`);
      showActionLogs([infoLog]);
      setGameState({ ...gameState, logs: [...gameState.logs, infoLog] });
      return;
    }

    updateActiveFaction((faction) =>
      applyReinforcement(
        faction,
        gameState.round,
        reinforcementCivilians,
        gameState.ruleConfig,
      ),
    );
  };

  const handleEndTurn = () => {
    if (!gameState) {
      return;
    }

    if (activeFaction?.reinforcementPending) {
      const warningLog = createLog(
        gameState.round,
        activeFaction.id,
        `请先分配本轮新增的 ${gameState.ruleConfig.economy.reinforcementPerTurn} 个单位。`,
      );
      showActionLogs([warningLog]);
      setGameState({ ...gameState, logs: [...gameState.logs, warningLog] });
      return;
    }

    if (activeFaction && mustDiscardCount(activeFaction) > 0) {
      const warningLog = createLog(
        gameState.round,
        activeFaction.id,
        `手牌超过当前血量上限，请先弃置 ${mustDiscardCount(activeFaction)} 张牌。`,
      );
      showActionLogs([warningLog]);
      setGameState({ ...gameState, logs: [...gameState.logs, warningLog] });
      return;
    }

    const nextState = nextTurn(gameState);
    const newLogs = nextState.logs.slice(gameState.logs.length);
    showActionLogs(newLogs);
    setGameState(nextState);
  };

  const handleFactionSkill = () => {
    if (!gameState || !activeFaction || gameState.winnerId) {
      return;
    }

    if (activeFaction.id === 3) {
      updateActiveFaction((faction) => {
        if (faction.civilians <= 0) {
          return {
            faction,
            logs: [createLog(gameState.round, faction.id, `${faction.name} 没有可典民的平民。`)],
          };
        }
        return {
          faction: { ...faction, civilians: faction.civilians - 1, gold: faction.gold + 60 },
          logs: [createLog(gameState.round, faction.id, `${faction.name} 发动典民：1 民换 60 金。`)],
        };
      });
      return;
    }

    updateActiveFaction((faction) => exchangeRulerHpForCivilians(faction, gameState.round));
  };

  const handleDiscardSelected = () => {
    if (!gameState || !activeFaction || !selectedCardId) {
      return;
    }
    const result = discardCardsFromFaction(gameState, activeFaction.id, [selectedCardId]);
    setSelectedCardId(null);
    showActionLogs(result.logs);
    setGameState(result.state);
  };

  const handlePlaySelectedCard = () => {
    if (!gameState || !activeFaction || !selectedCardId || gameState.winnerId) {
      return;
    }
    const card = activeFaction.hand.find((item) => item.instanceId === selectedCardId);
    if (!card) {
      return;
    }
    const cardResult = playCard(gameState, activeFaction.id, selectedCardId, {
      targetId: battleTargetId,
    });
    let nextState = cardResult.state;
    let logs = cardResult.logs;
    if (cardResult.requiresBattle) {
      const battleResult = resolveBattleForState(nextState, activeFaction.id, battleTargetId, battleSoldiers);
      nextState = battleResult.state;
      logs = [...logs, ...battleResult.logs];
    }
    setSelectedCardId(null);
    showActionLogs(logs);
    setGameState(nextState);
  };

  const handleRevive = (targetId: FactionId) => {
    if (!gameState || !activeFaction || gameState.winnerId) {
      return;
    }

    const target = gameState.factions.find((faction) => faction.id === targetId);
    if (!target) {
      return;
    }

    const result = reviveFaction(activeFaction, target, gameState.round);
    let updatedFactions = replaceFaction(gameState.factions, result.reviver);
    updatedFactions = replaceFaction(updatedFactions, result.revived);
    const winner = determineWinner(updatedFactions);
    showActionLogs(result.logs);
    setShowRevive(false);
    setGameState(applyAwakenings({
      ...gameState,
      factions: updatedFactions,
      winnerId: winner?.id ?? null,
      logs: [...gameState.logs, ...result.logs],
    }));
  };

  const handleExportConfig = async () => {
    const code = encodeConfigCode(factionCount, ruleConfig);
    setConfigCodeInput(code);
    setConfigFeedback("配置码已生成。");
    try {
      await navigator.clipboard.writeText(code);
      setConfigFeedback("配置码已生成并复制到剪贴板。");
    } catch {
      setConfigFeedback("配置码已生成，请手动复制。");
    }
  };

  const handleImportConfig = () => {
    try {
      const imported = parseConfigCode(configCodeInput);
      setFactionCount(imported.factionCount);
      setRuleConfig(imported.ruleConfig);
      setConfigFeedback("配置码导入成功，新开对局将使用该规则。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "配置码解析失败。";
      setConfigFeedback(message);
    }
  };

  const aliveTargets = gameState?.factions.filter(
    (faction) => faction.alive && faction.id !== activeFaction?.id,
  );
  const winnerFaction = gameState?.winnerId
    ? gameState.factions.find((faction) => faction.id === gameState.winnerId)
    : null;
  const latestLogs = gameState ? [...gameState.logs].reverse() : [];
  const deploymentLimit = gameState ? getDeploymentLimit(gameState.round, gameState.ruleConfig) : 1;
  const activeBattleLimit = activeFaction && gameState
    ? Math.max(1, Math.min(deploymentLimit, Math.max(1, activeFaction.soldiers - gameState.ruleConfig.battle.actionUnitCost)))
    : 1;
  const activeAttacksUsed = activeFaction?.attacksThisTurn ?? 0;
  const defeatedFactions = gameState?.factions.filter((faction) => !faction.alive) ?? [];
  const selectedCard = activeFaction?.hand.find((card) => card.instanceId === selectedCardId) ?? null;
  const selectedCardDefinition = selectedCard ? CARD_DEFINITIONS[selectedCard.cardId] : null;
  const discardNeeded = activeFaction ? mustDiscardCount(activeFaction) : 0;

  return (
    <div className="min-h-screen bg-transparent text-amber-50">
      <main
        className={`mx-auto flex w-full max-w-6xl flex-col ${
          screen === "game"
            ? "h-dvh overflow-hidden px-2 py-2 sm:px-4"
            : "min-h-screen px-4 py-5 sm:px-6 lg:px-8"
        }`}
      >
        {screen === "home" && (
          <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between rounded-[2rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(66,31,14,0.94),rgba(25,21,18,0.96))] p-6 shadow-panel">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Tabletop H5</p>
              <h1 className="font-display text-5xl leading-none text-amber-50">King Game</h1>
              <p className="text-base leading-7 text-amber-100/80">
                四阵营本地热座回合制桌牌原型。牌位围绕中庭桌台展开，支持自动存档、继续游戏、配置码导入导出。
              </p>
            </div>
            <div className="space-y-3">
              {gameState && (
                <button
                  className="w-full rounded-2xl border border-amber-200/40 bg-amber-50/10 px-5 py-4 text-base font-semibold text-amber-50"
                  onClick={continueGame}
                >
                  继续游戏
                </button>
              )}
              <button
                className="w-full rounded-2xl bg-amber-300 px-5 py-4 text-base font-semibold text-stone-950 shadow-sm"
                onClick={() => setScreen("setup")}
              >
                开始新棋局
              </button>
              <button
                className="w-full rounded-2xl bg-amber-50/12 px-5 py-4 text-base font-semibold text-amber-50"
                onClick={() => setShowRules(true)}
              >
                查看规则
              </button>
              <div className="rounded-2xl border border-amber-200/20 bg-black/20 p-4 text-sm leading-6 text-amber-100/80">
                当前默认规则：每轮增员 {ruleConfig.economy.reinforcementPerTurn}，民产金 {ruleConfig.economy.civilianGoldOutput}，兵耗金 {ruleConfig.economy.soldierUpkeep}。开局阵营名已固定为统治者、反抗者、守护者、游猎者。
              </div>
            </div>
          </section>
        )}

        {screen === "setup" && (
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 rounded-[2rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(248,228,177,0.96),rgba(187,137,69,0.92))] p-6 text-stone-950 shadow-panel">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-stone-700">Setup</p>
              <h2 className="mt-2 font-display text-4xl">开局设置</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">选择阵营数量，调整规则，或导入配置码后开始新局。</p>
            </div>
            <label className="space-y-3">
              <span className="text-sm font-semibold">阵营数量</span>
              <select
                className="w-full rounded-2xl border border-amber-950/20 bg-amber-50/80 px-4 py-4"
                value={factionCount}
                onChange={(event) => setFactionCount(Number(event.target.value))}
              >
                {[2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} 个阵营
                  </option>
                ))}
              </select>
            </label>
            <section className="rounded-3xl border border-amber-950/10 bg-amber-50/55 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">通用规则编辑</h3>
                <button
                  className="text-sm font-semibold text-stone-800"
                  onClick={() => {
                    setRuleConfig(DEFAULT_RULE_CONFIG);
                    setConfigFeedback("规则已恢复默认值。");
                  }}
                >
                  恢复默认规则
                </button>
              </div>
              <div className="space-y-4">
                {ruleSections.map((section) => (
                  <div key={section.title} className="rounded-2xl border border-amber-950/10 bg-white/60 p-3">
                    <h4 className="mb-3 font-semibold">{section.title}</h4>
                    {section.key === "initialFactionStats" && (
                      <p className="mb-3 text-sm leading-6 text-stone-700">
                        这里是通用备用初始值。当前开局会优先使用四个固定阵营的专属初始属性：统治者、反抗者、守护者、游猎者。
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {section.fields.map((field) => (
                        <label key={field.key} className="space-y-2 text-sm">
                          <span className="block text-stone-700">{field.label}</span>
                          <input
                            className="w-full rounded-2xl border border-amber-950/15 bg-white/85 px-3 py-3"
                            type="number"
                            min={field.min ?? 0}
                            step={field.step ?? 1}
                            value={String(ruleConfig[section.key][field.key as keyof typeof ruleConfig[typeof section.key]])}
                            onChange={(event) =>
                              updateRuleValue(section.key, field.key, event.target.value, field.min ?? 0)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-amber-950/10 bg-amber-50/55 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">配置码</h3>
                <button className="text-sm font-semibold text-stone-800" onClick={handleExportConfig}>
                  导出当前配置
                </button>
              </div>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-amber-950/15 bg-white/85 px-4 py-3 text-sm leading-6"
                placeholder="粘贴配置码后点击导入"
                value={configCodeInput}
                onChange={(event) => setConfigCodeInput(event.target.value)}
              />
              <div className="mt-3 flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-amber-950/20 bg-white/35 px-4 py-3 font-semibold"
                  onClick={handleImportConfig}
                >
                  导入配置
                </button>
                <button
                  className="flex-1 rounded-2xl border border-amber-950/20 bg-white/35 px-4 py-3 font-semibold"
                  onClick={() => {
                    setRuleConfig(DEFAULT_RULE_CONFIG);
                    setFactionCount(initialFactionCount);
                    setConfigCodeInput("");
                    setConfigFeedback("已恢复默认配置。");
                  }}
                >
                  恢复默认
                </button>
              </div>
              {configFeedback && <p className="mt-3 text-sm text-stone-700">{configFeedback}</p>}
            </section>
            <div className="mt-auto flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-amber-950/20 bg-white/35 px-4 py-4 font-semibold"
                onClick={() => setScreen("home")}
              >
                返回首页
              </button>
              <button
                className="flex-1 rounded-2xl bg-stone-950 px-4 py-4 font-semibold text-amber-50"
                onClick={() => startGame()}
              >
                进入游戏
              </button>
            </div>
          </section>
        )}

        {screen === "game" && gameState && activeFaction && (
          <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
            <header className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-amber-200/20 bg-black/40 px-3 py-2 shadow-panel backdrop-blur">
              <div className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-amber-300/75">King Game Table</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <h2 className="whitespace-nowrap font-display text-2xl leading-none text-amber-50">
                    第 {gameState.round} 轮
                  </h2>
                  <span className="truncate rounded-full border border-amber-200/20 bg-amber-50/10 px-2 py-1 text-xs font-semibold text-amber-100">
                    {activeFaction.name}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {winnerFaction && (
                  <span className="rounded-full border border-amber-200/30 bg-amber-300 px-2.5 py-1.5 text-xs font-semibold text-stone-950">
                    获胜：{winnerFaction.name}
                  </span>
                )}
                <button
                  className="rounded-full border border-amber-200/30 bg-amber-50/10 px-2.5 py-1.5 text-xs font-semibold text-amber-50"
                  onClick={restartGame}
                >
                  重开
                </button>
                <button
                  className="rounded-full border border-amber-200/30 bg-amber-50/10 px-2.5 py-1.5 text-xs font-semibold text-amber-50"
                  onClick={resetToHome}
                >
                  首页
                </button>
                <button
                  className="rounded-full border border-amber-200/30 bg-amber-50/10 px-2.5 py-1.5 text-xs font-semibold text-amber-50"
                  onClick={() => setShowRules(true)}
                >
                  规则
                </button>
              </div>
            </header>

            <section className="relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-amber-200/25 bg-[radial-gradient(circle_at_center,rgba(73,125,79,0.86),rgba(29,60,44,0.94)_48%,rgba(23,18,16,0.98)_100%)] p-2 shadow-panel">
              <div className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-amber-200/25" />
              <div className="pointer-events-none absolute inset-8 rounded-full border border-amber-200/10" />

              <div className="absolute left-1/2 top-1/2 z-0 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/35 bg-[radial-gradient(circle,#6b3f1d_0%,#3c2415_58%,#1c1512_100%)] p-2 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-48 sm:w-48">
                <div className="rounded-full border border-amber-200/20 bg-black/20 px-3 py-4">
                  <p className="text-[0.58rem] uppercase tracking-[0.18em] text-amber-300/80">当前行动</p>
                  <h3 className="mt-1 font-display text-xl leading-none text-amber-50 sm:text-2xl">{activeFaction.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-amber-100/75">
                    {activeFaction.reinforcementPending ? "等待分配新增单位" : "本回合可结束"}
                  </p>
                  <p className="mt-1 text-[0.68rem] text-amber-100/60">
                    士兵 {activeFaction.soldiers} / 平民 {activeFaction.civilians}
                  </p>
                  <p className="mt-1 text-[0.62rem] text-amber-100/55">
                    攻击 {activeAttacksUsed}/{gameState.ruleConfig.battle.attacksPerTurn} · 上场上限 {deploymentLimit}
                  </p>
                  <p className="mt-1 text-[0.62rem] text-amber-100/55">
                    牌堆 {gameState.deck.length} · 弃牌 {gameState.discardPile.length}
                  </p>
                </div>
              </div>

              {tableSeats.map((seat) => {
                const faction = gameState.factions.find((item) => item.id === seat.id);
                if (!faction) {
                  return null;
                }

                return (
                  <div key={seat.id} className={`absolute z-10 ${seat.className}`}>
                    <div className="mb-1 text-center text-[0.65rem] font-semibold tracking-[0.2em] text-amber-100/65">
                      {seat.label}
                    </div>
                    <StatCard faction={faction} isActive={faction.id === activeFaction.id} />
                  </div>
                );
              })}
            </section>

            <section className="shrink-0 overflow-hidden rounded-2xl border border-amber-200/25 bg-[linear-gradient(145deg,rgba(248,228,177,0.97),rgba(191,139,69,0.95))] p-2 text-stone-950 shadow-panel">
              <div className="mb-2 rounded-xl border border-amber-950/10 bg-white/40 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold">当前手牌</span>
                    <span className="ml-2 rounded-full bg-stone-950/10 px-2 py-0.5 text-[0.66rem] font-semibold">
                      {activeFaction.hand.length} 张 / 需弃 {discardNeeded}
                    </span>
                  </div>
                  {selectedCardDefinition && (
                    <span className="max-w-[52%] truncate text-[0.66rem] text-stone-700">
                      {selectedCardDefinition.description}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {activeFaction.hand.length === 0 && (
                    <div className="rounded-xl border border-amber-950/10 bg-white/45 px-3 py-2 text-xs text-stone-700">
                      暂无手牌
                    </div>
                  )}
                  {activeFaction.hand.map((card: CardInstance) => {
                    const definition = CARD_DEFINITIONS[card.cardId];
                    const selected = card.instanceId === selectedCardId;
                    return (
                      <button
                        key={card.instanceId}
                        className={`min-w-[5.6rem] rounded-xl border px-2 py-2 text-left shadow-sm ${
                          selected
                            ? "border-stone-950 bg-stone-950 text-amber-50"
                            : "border-amber-950/15 bg-amber-50/80 text-stone-950"
                        }`}
                        onClick={() => setSelectedCardId(selected ? null : card.instanceId)}
                      >
                        <span className="block truncate text-xs font-bold">{definition.name}</span>
                        <span className="mt-1 block text-[0.58rem] opacity-75">
                          {definition.type === "scheme"
                            ? "锦囊"
                            : definition.type === "equipment"
                              ? "装备"
                              : definition.type === "weapon"
                                ? "武器"
                                : "基础"}
                          {card.exemptFromHandLimit ? " · 免上限" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 grid grid-cols-[1fr_0.7fr_auto_auto] gap-1.5">
                  <select
                    className="min-w-0 rounded-xl border border-amber-950/15 bg-white/85 px-2 py-2 text-xs"
                    value={battleTargetId}
                    onChange={(event) => setBattleTargetId(Number(event.target.value) as FactionId)}
                  >
                    {aliveTargets?.map((faction) => (
                      <option key={faction.id} value={faction.id}>
                        {faction.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="min-w-0 rounded-xl border border-amber-950/15 bg-white/85 px-2 py-2 text-xs"
                    type="number"
                    min={1}
                    max={activeBattleLimit}
                    value={battleSoldiers}
                    onChange={(event) => setBattleSoldiers(Number(event.target.value))}
                  />
                  <button
                    className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-amber-50 disabled:opacity-40"
                    onClick={handlePlaySelectedCard}
                    disabled={!selectedCard || !!gameState.winnerId}
                  >
                    出牌
                  </button>
                  <button
                    className="rounded-xl border border-stone-950 bg-white/50 px-3 py-2 text-xs font-semibold text-stone-950 disabled:opacity-40"
                    onClick={handleDiscardSelected}
                    disabled={!selectedCard}
                  >
                    弃牌
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="min-w-0 rounded-xl border border-amber-950/10 bg-white/35 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">增员</span>
                    <span className="rounded-full bg-stone-950/10 px-2 py-0.5 text-[0.66rem] font-semibold">
                      平民 {reinforcementCivilians} / 士兵{" "}
                      {gameState.ruleConfig.economy.reinforcementPerTurn - reinforcementCivilians}
                    </span>
                  </div>
                  <input
                    className="block w-full accent-stone-950"
                    type="range"
                    min={0}
                    max={gameState.ruleConfig.economy.reinforcementPerTurn}
                    value={reinforcementCivilians}
                    onChange={(event) => setReinforcementCivilians(Number(event.target.value))}
                    disabled={!activeFaction.reinforcementPending}
                  />
                </div>
                <button
                  className="rounded-xl bg-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  onClick={handleReinforcement}
                  disabled={!!gameState.winnerId}
                >
                  确认
                </button>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <button
                  className="min-w-0 rounded-xl bg-wine px-1.5 py-2 text-[0.68rem] font-semibold text-white shadow-sm"
                  onClick={() =>
                    updateActiveFaction((faction) =>
                      convertCiviliansToSoldiers(faction, gameState.round, gameState.ruleConfig),
                    )
                  }
                >
                  民转兵
                </button>
                <button
                  className="min-w-0 rounded-xl bg-steel px-1.5 py-2 text-[0.68rem] font-semibold text-white shadow-sm"
                  onClick={() =>
                    updateActiveFaction((faction) =>
                      convertSoldiersToCivilians(faction, gameState.round, gameState.ruleConfig),
                    )
                  }
                >
                  兵转民
                </button>
                <button
                  className="min-w-0 rounded-xl bg-amber-700 px-1.5 py-2 text-[0.68rem] font-semibold text-white shadow-sm"
                  onClick={() =>
                    updateActiveFaction((faction) =>
                      upgradeWeapon(faction, gameState.round, gameState.ruleConfig),
                    )
                  }
                >
                  升级武器
                </button>
                <button
                  className="min-w-0 rounded-xl bg-emerald-800 px-1.5 py-2 text-[0.68rem] font-semibold text-white shadow-sm"
                  onClick={() =>
                    updateActiveFaction((faction) =>
                      upgradeArmor(faction, gameState.round, gameState.ruleConfig),
                    )
                  }
                >
                  强化盔甲
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[1fr_0.7fr_auto_auto] gap-1.5">
                <select
                  className="min-w-0 rounded-xl border border-amber-950/15 bg-white/85 px-2 py-2 text-xs"
                  value={battleTargetId}
                  onChange={(event) => setBattleTargetId(Number(event.target.value) as FactionId)}
                >
                  {aliveTargets?.map((faction) => (
                    <option key={faction.id} value={faction.id}>
                      {faction.name}
                    </option>
                  ))}
                </select>
                <input
                  className="min-w-0 rounded-xl border border-amber-950/15 bg-white/85 px-2 py-2 text-xs"
                  type="number"
                  min={1}
                  max={activeBattleLimit}
                  value={battleSoldiers}
                  onChange={(event) => setBattleSoldiers(Number(event.target.value))}
                />
                <button
                  className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-amber-50 disabled:opacity-40"
                  onClick={handleBattle}
                  disabled={!!gameState.winnerId}
                >
                  进攻
                </button>
                <button
                  className="rounded-xl border border-stone-950 bg-white/50 px-3 py-2 text-xs font-semibold text-stone-950 disabled:opacity-40"
                  onClick={handleEndTurn}
                  disabled={!!gameState.winnerId}
                >
                  结束
                </button>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <button
                  className="rounded-xl border border-amber-950/15 bg-white/40 px-2 py-1.5 text-xs font-semibold"
                  onClick={handleFactionSkill}
                >
                  阵营技能
                </button>
                <button
                  className="rounded-xl border border-amber-950/15 bg-white/40 px-2 py-1.5 text-xs font-semibold"
                  onClick={() => setShowRevive(true)}
                >
                  契约/复活
                </button>
                <button
                  className="rounded-xl border border-amber-950/15 bg-white/40 px-2 py-1.5 text-xs font-semibold"
                  onClick={() => setShowFactions(true)}
                >
                  阵营详情
                </button>
                <button
                  className="rounded-xl border border-amber-950/15 bg-white/40 px-2 py-1.5 text-xs font-semibold"
                  onClick={() => setShowLogs(true)}
                >
                  战报
                </button>
              </div>
            </section>
          </section>
        )}

      </main>

      {showFactions && gameState && activeFaction && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center">
          <section className="mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-[1.5rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(248,228,177,0.98),rgba(184,130,61,0.96))] p-4 text-stone-950 shadow-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-stone-700">Factions</p>
                <h2 className="mt-1 font-display text-2xl">阵营详情</h2>
              </div>
              <button
                className="rounded-full bg-stone-950 px-3 py-2 text-sm font-semibold text-amber-50"
                onClick={() => setShowFactions(false)}
              >
                关闭
              </button>
            </div>
            <div className="grid min-h-0 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {gameState.factions.map((faction) => {
                const penaltyTarget = faction.attackPenaltyAgainst
                  ? gameState.factions.find((item) => item.id === faction.attackPenaltyAgainst)
                  : null;
                const tributeTarget = faction.revivalTributeTo
                  ? gameState.factions.find((item) => item.id === faction.revivalTributeTo)
                  : null;

                return (
                  <article key={faction.id} className="space-y-2">
                    <StatCard faction={faction} isActive={faction.id === activeFaction.id} />
                    <div className="rounded-2xl border border-amber-950/10 bg-white/45 p-3 text-xs leading-5 text-stone-700">
                      <p>{factionSkillDescriptions[faction.id]}</p>
                      {penaltyTarget && faction.attackPenaltyPercent > 0 && (
                        <p className="mt-1 font-semibold text-wine">
                          攻击 {penaltyTarget.name} 时攻击力减少 {faction.attackPenaltyPercent}%。
                        </p>
                      )}
                      {tributeTarget && (
                        <p className="mt-1 font-semibold text-stone-900">
                          复活契约：向 {tributeTarget.name} 上交 30% 金币，剩余{" "}
                          {faction.revivalTributeRoundsRemaining} 轮。
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {lastActionLogs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center">
          <section className="mx-auto flex max-h-[76dvh] w-full max-w-lg flex-col rounded-[1.5rem] border border-amber-200/30 bg-[linear-gradient(145deg,rgba(44,29,18,0.98),rgba(16,13,12,0.98))] p-4 text-amber-50 shadow-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-300/75">Action</p>
                <h2 className="mt-1 font-display text-2xl">本次操作</h2>
              </div>
              <button
                className="rounded-full bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
                onClick={() => setLastActionLogs([])}
              >
                知道了
              </button>
            </div>
            <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
              {lastActionLogs.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-amber-200/15 bg-amber-50/10 p-3 text-sm leading-6">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-amber-100/60">
                    <span>Round {entry.round}</span>
                    <span>{entry.factionId ? `Faction ${entry.factionId}` : "System"}</span>
                  </div>
                  <p>{entry.message}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {showRevive && gameState && activeFaction && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center">
          <section className="mx-auto flex max-h-[84dvh] w-full max-w-lg flex-col rounded-[1.5rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(248,228,177,0.98),rgba(184,130,61,0.96))] p-4 text-stone-950 shadow-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-stone-700">Contract</p>
                <h2 className="mt-1 font-display text-2xl">契约/复活</h2>
              </div>
              <button
                className="rounded-full bg-stone-950 px-3 py-2 text-sm font-semibold text-amber-50"
                onClick={() => setShowRevive(false)}
              >
                关闭
              </button>
            </div>
            <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
              {defeatedFactions.length === 0 && (
                <div className="rounded-2xl border border-amber-950/10 bg-white/45 p-4 text-sm leading-6 text-stone-700">
                  暂无可复活阵营。阵营覆灭后会出现在这里。
                </div>
              )}
              {defeatedFactions.map((faction) => {
                const restriction = getReviveRestriction(activeFaction, faction);

                return (
                  <article key={faction.id} className="rounded-2xl border border-amber-950/10 bg-white/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">{faction.name}</h3>
                        <p className={`mt-1 text-xs leading-5 ${restriction ? "text-wine" : "text-stone-700"}`}>
                          {restriction ?? "可复活：复活者支付 30% 资产，对方签订 3 轮金币契约。"}
                        </p>
                      </div>
                      <button
                        className="shrink-0 rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-amber-50 disabled:opacity-40"
                        onClick={() => handleRevive(faction.id)}
                        disabled={!!gameState.winnerId}
                      >
                        复活
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {showLogs && gameState && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center">
          <section className="mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-[1.5rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(44,29,18,0.98),rgba(16,13,12,0.98))] p-4 text-amber-50 shadow-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-300/75">Battle Log</p>
                <h2 className="mt-1 font-display text-2xl">战报</h2>
              </div>
              <button
                className="rounded-full bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
                onClick={() => setShowLogs(false)}
              >
                关闭
              </button>
            </div>
            <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
              {latestLogs.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-amber-200/15 bg-amber-50/10 p-3 text-sm leading-6">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-amber-100/60">
                    <span>Round {entry.round}</span>
                    <span>{entry.factionId ? `Faction ${entry.factionId}` : "System"}</span>
                  </div>
                  <p>{entry.message}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/65 p-4 backdrop-blur-sm">
          <section className="mx-auto w-full max-w-md rounded-[2rem] border border-amber-200/25 bg-[linear-gradient(145deg,rgba(248,228,177,0.98),rgba(184,130,61,0.96))] p-6 text-stone-950 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-stone-700">Rules</p>
                <h2 className="mt-2 font-display text-3xl">规则说明</h2>
              </div>
              <button className="rounded-full bg-stone-950 px-3 py-2 text-sm font-semibold text-amber-50" onClick={() => setShowRules(false)}>
                关闭
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
              <p>1. 支持 4 个阵营，本地热座轮流操作；设置页保留 2-4 阵营调试入口。</p>
              <p>2. 每个行动回合摸 4 张牌并结算经济：平民产金，士兵扣金；游猎者士兵不扣金。</p>
              <p>3. 每轮新增 {ruleConfig.economy.reinforcementPerTurn} 个单位；游猎者不可拥有平民，新增平民会转为士兵。</p>
              <p>4. 第一轮最多上场 {ruleConfig.battle.firstRoundDeployLimit} 名士兵，后续每轮增加 {ruleConfig.battle.deployLimitIncreasePerRound}，最高 {ruleConfig.battle.maxDeployUnits}。</p>
              <p>5. 每个阵营每回合最多进攻 {ruleConfig.battle.attacksPerTurn} 次，每次作战固定消耗 {ruleConfig.battle.actionUnitCost} 名士兵。</p>
              <p>6. 武器每回合最多升级一次；盔甲按每套 {ruleConfig.battle.armorReductionPercent}% 减伤，最高 30%。</p>
              <p>7. 敌方血量归零后阵营覆灭，击杀方获得 50% 金币和全部平民，不继承士兵、武器、盔甲。</p>
              <p>8. 阵营可通过契约复活部分覆灭阵营；统治者不可复活反抗者或游猎者，守护者不可复活游猎者，统治者不可被复活。</p>
              <p>9. 复活后向复活者上交 30% 金币 3 轮，攻击复活者时攻击力减少 20%。</p>
              <p>10. 仅存统治者和守护者时统治者胜；仅存反抗者和守护者时反抗者胜；守护者和游猎者需消灭所有其他阵营。</p>
              <p>11. 手牌超过当前血量时必须先弃牌；避战会在成为目标时自动打出。</p>
              <p>12. 阵营觉醒技会在击败、契约或场上覆灭状态满足条件时自动触发。</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
