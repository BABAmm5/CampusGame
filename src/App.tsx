import { useEffect, useMemo, useState } from "react";
import { StatCard } from "./components/StatCard";
import { DEFAULT_RULE_CONFIG } from "./game/config";
import { encodeConfigCode, parseConfigCode } from "./game/configCodec";
import {
  applyReinforcement,
  convertCiviliansToSoldiers,
  convertSoldiersToCivilians,
  createLog,
  upgradeArmor,
  upgradeWeapon,
} from "./game/economyEngine";
import { initGame } from "./game/initGame";
import { nextTurn, replaceFaction } from "./game/roundEngine";
import { resolveBattle } from "./game/battleEngine";
import { determineWinner, absorbDefeatedFaction } from "./game/victoryEngine";
import type { FactionId, FactionState, GameState, RuleConfig } from "./game/types";

type Screen = "home" | "setup" | "game";

interface PersistedData {
  v: 1;
  gameState: GameState | null;
  factionCount: number;
  ruleConfig: RuleConfig;
}

const STORAGE_KEY = "king-game-save-v1";
const initialFactionCount = 2;
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
    ],
  },
];

function readSave(): PersistedData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedData;
    if (parsed.v !== 1) {
      return null;
    }
    return {
      v: 1,
      gameState: parsed.gameState,
      factionCount: [2, 3, 4].includes(parsed.factionCount) ? parsed.factionCount : initialFactionCount,
      ruleConfig: parsed.ruleConfig ?? DEFAULT_RULE_CONFIG,
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
  const [showFactions, setShowFactions] = useState(true);
  const [showLogs, setShowLogs] = useState(true);

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
      v: 1,
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
    setBattleTargetId(firstTarget);
    setBattleSoldiers((current) => Math.max(1, Math.min(current, Math.max(1, activeFaction.soldiers))));
  }, [gameState, activeFaction]);

  const startGame = (nextFactionCount = factionCount, nextRuleConfig = ruleConfig) => {
    const state = initGame(nextFactionCount, nextRuleConfig);
    setFactionCount(nextFactionCount);
    setRuleConfig(nextRuleConfig);
    setGameState(state);
    setScreen("game");
    setShowFactions(true);
    setShowLogs(true);
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
    setGameState({
      ...gameState,
      factions: updatedFactions,
      winnerId: winner?.id ?? null,
      logs: [...gameState.logs, ...result.logs],
    });
  };

  const handleBattle = () => {
    if (!gameState || !activeFaction || gameState.winnerId) {
      return;
    }

    const defender = gameState.factions.find((faction) => faction.id === battleTargetId);
    if (!defender || !defender.alive || defender.id === activeFaction.id) {
      const warningLog = createLog(gameState.round, activeFaction.id, "请选择有效的敌对阵营。");
      setGameState({ ...gameState, logs: [...gameState.logs, warningLog] });
      return;
    }

    const battle = resolveBattle(
      activeFaction,
      defender,
      battleSoldiers,
      gameState.round,
      gameState.ruleConfig,
    );
    let updatedFactions = replaceFaction(gameState.factions, battle.attacker);
    updatedFactions = replaceFaction(updatedFactions, battle.defender);
    const extraLogs = [...battle.logs];

    if (battle.result.defenderDefeated) {
      const absorbResult = absorbDefeatedFaction(battle.attacker, battle.defender, gameState.round);
      updatedFactions = replaceFaction(updatedFactions, absorbResult.winner);
      updatedFactions = replaceFaction(updatedFactions, absorbResult.loser);
      extraLogs.push(
        createLog(gameState.round, defender.id, `${defender.name} 王城崩溃，阵营覆灭。`),
        ...absorbResult.logs,
      );
    }

    const winner = determineWinner(updatedFactions);
    setGameState({
      ...gameState,
      factions: updatedFactions,
      winnerId: winner?.id ?? null,
      logs: [...gameState.logs, ...extraLogs],
    });
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
      setGameState({ ...gameState, logs: [...gameState.logs, warningLog] });
      return;
    }

    setGameState(nextTurn(gameState));
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

  return (
    <div className="min-h-screen bg-transparent text-ink">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
        {screen === "home" && (
          <section className="flex flex-1 flex-col justify-between rounded-[2rem] bg-white/85 p-6 shadow-panel">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.35em] text-accent">Mobile H5 Prototype</p>
              <h1 className="font-display text-5xl leading-none">King Game</h1>
              <p className="text-base leading-7 text-steel">
                本地热座回合制策略原型。支持自动存档、继续游戏、配置码导入导出，打包后可直接部署到 Gitee Pages 或 GitHub Pages。
              </p>
            </div>
            <div className="space-y-3">
              {gameState && (
                <button
                  className="w-full rounded-2xl border border-ink px-5 py-4 text-base font-semibold"
                  onClick={continueGame}
                >
                  继续游戏
                </button>
              )}
              <button
                className="w-full rounded-2xl bg-ink px-5 py-4 text-base font-semibold text-white"
                onClick={() => setScreen("setup")}
              >
                开始新棋局
              </button>
              <button
                className="w-full rounded-2xl bg-sand px-5 py-4 text-base font-semibold"
                onClick={() => setShowRules(true)}
              >
                查看规则
              </button>
              <div className="rounded-2xl bg-sand p-4 text-sm leading-6 text-steel">
                当前默认规则：每轮增员 {ruleConfig.economy.reinforcementPerTurn}，民产金 {ruleConfig.economy.civilianGoldOutput}，兵耗金 {ruleConfig.economy.soldierUpkeep}。开局阵营名已固定为统治者、反抗者、守护者、入侵者。
              </div>
            </div>
          </section>
        )}

        {screen === "setup" && (
          <section className="flex flex-1 flex-col gap-5 rounded-[2rem] bg-white/85 p-6 shadow-panel">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-accent">Setup</p>
              <h2 className="mt-2 font-display text-4xl">开局设置</h2>
              <p className="mt-3 text-sm leading-6 text-steel">选择阵营数量，调整规则，或导入配置码后开始新局。</p>
            </div>
            <label className="space-y-3">
              <span className="text-sm font-semibold">阵营数量</span>
              <select
                className="w-full rounded-2xl border border-stone-200 bg-sand px-4 py-4"
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
            <section className="rounded-3xl bg-sand p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">通用规则编辑</h3>
                <button
                  className="text-sm font-semibold text-accent"
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
                  <div key={section.title} className="rounded-2xl bg-white/70 p-3">
                    <h4 className="mb-3 font-semibold">{section.title}</h4>
                    {section.key === "initialFactionStats" && (
                      <p className="mb-3 text-sm leading-6 text-steel">
                        这里是通用备用初始值。当前开局会优先使用四个固定阵营的专属初始属性：统治者、反抗者、守护者、入侵者。
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {section.fields.map((field) => (
                        <label key={field.key} className="space-y-2 text-sm">
                          <span className="block text-steel">{field.label}</span>
                          <input
                            className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-3"
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
            <section className="rounded-3xl bg-sand p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">配置码</h3>
                <button className="text-sm font-semibold text-accent" onClick={handleExportConfig}>
                  导出当前配置
                </button>
              </div>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6"
                placeholder="粘贴配置码后点击导入"
                value={configCodeInput}
                onChange={(event) => setConfigCodeInput(event.target.value)}
              />
              <div className="mt-3 flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-stone-300 px-4 py-3 font-semibold"
                  onClick={handleImportConfig}
                >
                  导入配置
                </button>
                <button
                  className="flex-1 rounded-2xl border border-stone-300 px-4 py-3 font-semibold"
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
              {configFeedback && <p className="mt-3 text-sm text-steel">{configFeedback}</p>}
            </section>
            <div className="mt-auto flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-stone-300 px-4 py-4 font-semibold"
                onClick={() => setScreen("home")}
              >
                返回首页
              </button>
              <button
                className="flex-1 rounded-2xl bg-accent px-4 py-4 font-semibold text-white"
                onClick={() => startGame()}
              >
                进入游戏
              </button>
            </div>
          </section>
        )}

        {screen === "game" && gameState && activeFaction && (
          <section className="space-y-5 pb-8">
            <header className="relative overflow-hidden rounded-[2rem] bg-ink p-5 text-white shadow-panel ring-1 ring-white/10">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-12 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
              </div>
              <div className="relative mt-2 space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Round</p>
                <div>
                  <h2 className="font-display text-4xl">第 {gameState.round} 轮</h2>
                  <p className="mt-2 text-sm text-white/75">当前行动阵营：{activeFaction.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">状态</p>
                    <p className="mt-1 text-sm font-semibold">
                      {activeFaction.reinforcementPending ? "等待分配新增单位" : "本回合可结束"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">现役兵力</p>
                    <p className="mt-1 text-sm font-semibold">
                      {activeFaction.soldiers} 兵 / {activeFaction.civilians} 民
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gameState.winnerId && (
                    <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                      获胜：{gameState.factions.find((faction) => faction.id === gameState.winnerId)?.name}
                    </span>
                  )}
                  <button
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
                    onClick={restartGame}
                  >
                    重开一局
                  </button>
                  <button
                    className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white"
                    onClick={resetToHome}
                  >
                    返回首页
                  </button>
                  <button
                    className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => setShowRules(true)}
                  >
                    规则说明
                  </button>
                </div>
              </div>
            </header>

            <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-panel backdrop-blur">
              <div className="border-b border-stone-200/80 bg-[linear-gradient(135deg,rgba(196,109,45,0.14),rgba(54,91,67,0.08))] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-accent/80">Command</p>
                    <h3 className="mt-1 font-display text-2xl text-ink">操作面板</h3>
                  </div>
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold text-steel shadow-sm">
                    {activeFaction.reinforcementPending ? "待分配增员" : "可结束回合"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <article className="rounded-[1.5rem] bg-sand/90 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-steel">金币储备</p>
                    <p className="mt-2 font-display text-3xl text-ink">{activeFaction.gold}</p>
                  </article>
                  <article className="rounded-[1.5rem] bg-sand/90 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-steel">军备等级</p>
                    <p className="mt-2 font-display text-3xl text-ink">
                      武 {activeFaction.weaponLevel} / 甲 {activeFaction.armor}
                    </p>
                  </article>
                </div>

                <div className="rounded-[1.75rem] border border-stone-200/80 bg-sand/80 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-ink">本轮增员</h4>
                      <p className="mt-1 text-sm text-steel">
                        总计 {gameState.ruleConfig.economy.reinforcementPerTurn} 单位
                      </p>
                    </div>
                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-steel">
                      民 {reinforcementCivilians} / 兵{" "}
                      {gameState.ruleConfig.economy.reinforcementPerTurn - reinforcementCivilians}
                    </div>
                  </div>
                  <input
                    className="w-full accent-accent"
                    type="range"
                    min={0}
                    max={gameState.ruleConfig.economy.reinforcementPerTurn}
                    value={reinforcementCivilians}
                    onChange={(event) => setReinforcementCivilians(Number(event.target.value))}
                    disabled={!activeFaction.reinforcementPending}
                  />
                  <button
                    className="mt-4 w-full rounded-2xl bg-forest px-4 py-3 font-semibold text-white disabled:opacity-40"
                    onClick={() =>
                      updateActiveFaction((faction) =>
                        applyReinforcement(
                          faction,
                          gameState.round,
                          reinforcementCivilians,
                          gameState.ruleConfig,
                        ),
                      )
                    }
                    disabled={!activeFaction.reinforcementPending}
                  >
                    确认增员
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="rounded-[1.25rem] bg-wine px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    onClick={() =>
                      updateActiveFaction((faction) =>
                        convertCiviliansToSoldiers(faction, gameState.round, gameState.ruleConfig),
                      )
                    }
                  >
                    民转兵
                  </button>
                  <button
                    className="rounded-[1.25rem] bg-steel px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    onClick={() =>
                      updateActiveFaction((faction) =>
                        convertSoldiersToCivilians(faction, gameState.round, gameState.ruleConfig),
                      )
                    }
                  >
                    兵转民
                  </button>
                  <button
                    className="rounded-[1.25rem] bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    onClick={() =>
                      updateActiveFaction((faction) =>
                        upgradeWeapon(faction, gameState.round, gameState.ruleConfig),
                      )
                    }
                  >
                    升级武器
                  </button>
                  <button
                    className="rounded-[1.25rem] bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    onClick={() =>
                      updateActiveFaction((faction) =>
                        upgradeArmor(faction, gameState.round, gameState.ruleConfig),
                      )
                    }
                  >
                    强化盔甲
                  </button>
                </div>

                <div className="rounded-[1.75rem] border border-stone-200/80 bg-white/75 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-ink">发起进攻</h4>
                      <p className="mt-1 text-sm text-steel">选择目标阵营与投入兵力</p>
                    </div>
                    <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-steel">
                      上限 {activeFaction.soldiers} 兵
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <select
                      className="rounded-2xl border border-stone-200 bg-white px-3 py-3"
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
                      className="rounded-2xl border border-stone-200 bg-white px-3 py-3"
                      type="number"
                      min={1}
                      max={Math.max(1, activeFaction.soldiers)}
                      value={battleSoldiers}
                      onChange={(event) => setBattleSoldiers(Number(event.target.value))}
                    />
                  </div>
                  <button
                    className="mt-3 w-full rounded-2xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-40"
                    onClick={handleBattle}
                    disabled={!aliveTargets?.length || activeFaction.soldiers <= 0 || !!gameState.winnerId}
                  >
                    结算战斗
                  </button>
                </div>

                <button
                  className="w-full rounded-[1.4rem] border border-ink bg-white px-4 py-4 font-semibold text-ink disabled:opacity-40"
                  onClick={handleEndTurn}
                  disabled={!!gameState.winnerId}
                >
                  结束当前回合
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white/90 p-4 shadow-panel">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowFactions((value) => !value)}
              >
                <h3 className="font-display text-2xl">阵营状态</h3>
                <span className="text-sm font-semibold text-steel">{showFactions ? "收起" : "展开"}</span>
              </button>
              {showFactions && (
                <div className="mt-4 grid gap-3">
                  {gameState.factions.map((faction) => (
                    <StatCard
                      key={faction.id}
                      faction={faction}
                      isActive={faction.id === activeFaction.id}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] bg-white/90 p-4 shadow-panel">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowLogs((value) => !value)}
              >
                <h3 className="font-display text-2xl">战报</h3>
                <span className="text-sm font-semibold text-steel">{showLogs ? "收起" : "展开"}</span>
              </button>
              {showLogs && (
                <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                  {[...gameState.logs].reverse().map((entry) => (
                    <article key={entry.id} className="rounded-2xl bg-sand p-3 text-sm leading-6">
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-steel">
                        <span>Round {entry.round}</span>
                        <span>{entry.factionId ? `Faction ${entry.factionId}` : "System"}</span>
                      </div>
                      <p>{entry.message}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}
      </main>

      {showRules && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/50 p-4">
          <section className="mx-auto w-full max-w-md rounded-[2rem] bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-accent">Rules</p>
                <h2 className="mt-2 font-display text-3xl">规则说明</h2>
              </div>
              <button className="rounded-full bg-sand px-3 py-2 text-sm font-semibold" onClick={() => setShowRules(false)}>
                关闭
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-steel">
              <p>1. 支持 2 到 4 个阵营，本地热座轮流操作。</p>
              <p>2. 每个行动回合开始时，当前阵营先自动结算经济：民产金，兵耗金。</p>
              <p>3. 每轮每个阵营必须先分配新增单位，默认总数为 {ruleConfig.economy.reinforcementPerTurn}。</p>
              <p>4. 可执行民转兵、兵转民、武器升级、盔甲强化、主动进攻。</p>
              <p>5. 武器提高攻击，盔甲降低受到的伤害与反击损耗。</p>
              <p>6. 敌方血量归零后阵营死亡，资产由进攻方继承，最后存活者获胜。</p>
              <p>7. 设置页可直接修改规则参数，也可导出为配置码分享，导入后再开新局。</p>
              <p>8. 游戏会自动保存到浏览器 localStorage，可在首页继续。</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
