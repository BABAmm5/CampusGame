import { useState } from "react";
import { TabBar } from "./ui/TabBar";
import { OrnateButton } from "./ui/OrnateButton";
import { CardFrame } from "./CardFrame";
import { DEFAULT_RULE_CONFIG } from "../game/config";
import { encodeConfigCode, parseConfigCode } from "../game/configCodec";
import type { RuleConfig } from "../game/types";

interface SetupScreenProps {
  factionCount: number;
  ruleConfig: RuleConfig;
  includeSubFactions: boolean;
  includeNeutral: boolean;
  onFactionCountChange: (n: number) => void;
  onRuleConfigChange: (config: RuleConfig) => void;
  onSubFactionsChange: (v: boolean) => void;
  onNeutralChange: (v: boolean) => void;
  onStartGame: () => void;
  onBack: () => void;
}

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
      { key: "invaderGuardianBonusPercent", label: "游猎者对守护者伤害加成%", min: 0 },
    ],
  },
];

export function SetupScreen({
  factionCount,
  ruleConfig,
  includeSubFactions,
  includeNeutral,
  onFactionCountChange,
  onRuleConfigChange,
  onSubFactionsChange,
  onNeutralChange,
  onStartGame,
  onBack,
}: SetupScreenProps) {
  const [activeRuleTab, setActiveRuleTab] = useState("initialFactionStats");
  const [configCodeInput, setConfigCodeInput] = useState("");
  const [configFeedback, setConfigFeedback] = useState("");

  const updateRuleValue = (sectionKey: keyof RuleConfig, fieldKey: string, rawValue: string, min = 0) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    onRuleConfigChange({
      ...ruleConfig,
      [sectionKey]: { ...ruleConfig[sectionKey], [fieldKey]: Math.max(min, value) },
    });
  };

  const handleExport = async () => {
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

  const handleImport = () => {
    try {
      const imported = parseConfigCode(configCodeInput);
      onFactionCountChange(imported.factionCount);
      onRuleConfigChange(imported.ruleConfig);
      setConfigFeedback("配置码导入成功，新开对局将使用该规则。");
    } catch (error) {
      setConfigFeedback(error instanceof Error ? error.message : "配置码解析失败。");
    }
  };

  const activeSection = ruleSections.find((s) => s.key === activeRuleTab);
  const ruleTabs = ruleSections.map((s) => ({ id: s.key, label: s.title }));

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto rounded-3xl border border-gold-frame/20 bg-gradient-to-br from-[rgba(44,29,18,0.96)] to-[rgba(16,13,12,0.98)] p-5 shadow-panel">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-frame/50">Setup</p>
        <h2 className="mt-1 font-display text-3xl text-amber-50">开局设置</h2>
      </div>

      {/* Faction count */}
      <CardFrame variant="dark" size="sm">
        <p className="mb-2 text-[0.65rem] font-semibold text-amber-100/60">主阵营数量</p>
        <div className="flex gap-2">
          {[2, 3, 4].map((count) => (
            <button
              key={count}
              onClick={() => onFactionCountChange(count)}
              className={`flex-1 rounded-xl border-2 py-3 text-center font-display text-lg font-bold transition-all duration-200 ${
                count === factionCount
                  ? "border-gold-frame bg-gold-frame/15 text-gold-frame -translate-y-1 shadow-glow-gold"
                  : "border-amber-200/10 bg-black/20 text-amber-100/40 hover:border-amber-200/25 hover:text-amber-100/60"
              }`}
            >
              {count} 阵营
            </button>
          ))}
        </div>
        {/* 附属阵营开关 */}
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-violet-500/20 bg-violet-900/10 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-violet-300">附属阵营</p>
              <p className="text-[0.55rem] text-violet-200/50">暮光者(第2轮) · 募道者(第3轮) · 幕读者(第2轮)</p>
            </div>
            <input
              type="checkbox"
              checked={includeSubFactions}
              onChange={(e) => onSubFactionsChange(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-500/20 bg-gray-900/10 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-gray-300">中立阵营</p>
              <p className="text-[0.55rem] text-gray-200/50">墓怨者 · 偏向游猎者 · 可被任意阵营击败</p>
            </div>
            <input
              type="checkbox"
              checked={includeNeutral}
              onChange={(e) => onNeutralChange(e.target.checked)}
              className="h-4 w-4 accent-gray-500"
            />
          </label>
        </div>
      </CardFrame>

      {/* Rule editor with tabs */}
      <CardFrame variant="dark" size="sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[0.65rem] font-semibold text-amber-100/60">规则编辑</p>
          <button
            className="text-[0.6rem] font-semibold text-gold-frame/70 hover:text-gold-frame"
            onClick={() => {
              onRuleConfigChange(DEFAULT_RULE_CONFIG);
              setConfigFeedback("规则已恢复默认值。");
            }}
          >
            恢复默认
          </button>
        </div>
        <TabBar tabs={ruleTabs} activeTab={activeRuleTab} onTabChange={setActiveRuleTab} variant="dark" />
        {activeSection && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {activeSection.fields.map((field) => (
              <label key={field.key} className="space-y-1">
                <span className="block text-[0.6rem] text-amber-100/50">{field.label}</span>
                <input
                  className="w-full rounded-lg border border-gold-frame/15 bg-black/30 px-2 py-1.5 text-xs text-amber-50"
                  type="number"
                  min={field.min ?? 0}
                  step={field.step ?? 1}
                  value={String(
                    ruleConfig[activeSection.key][field.key as keyof typeof ruleConfig[typeof activeSection.key]],
                  )}
                  onChange={(e) => updateRuleValue(activeSection.key, field.key, e.target.value, field.min ?? 0)}
                />
              </label>
            ))}
          </div>
        )}
      </CardFrame>

      {/* Config code */}
      <CardFrame variant="dark" size="sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[0.65rem] font-semibold text-amber-100/60">配置码</p>
          <button className="text-[0.6rem] font-semibold text-gold-frame/70 hover:text-gold-frame" onClick={handleExport}>
            导出当前配置
          </button>
        </div>
        <textarea
          className="min-h-20 w-full rounded-lg border border-gold-frame/15 bg-black/30 px-3 py-2 text-xs text-amber-50 placeholder:text-amber-100/20"
          placeholder="粘贴配置码后点击导入"
          value={configCodeInput}
          onChange={(e) => setConfigCodeInput(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <OrnateButton size="sm" variant="secondary" onClick={handleImport} className="flex-1">
            导入配置
          </OrnateButton>
          <OrnateButton
            size="sm"
            variant="ghost"
            onClick={() => {
              onRuleConfigChange(DEFAULT_RULE_CONFIG);
              onFactionCountChange(4);
              setConfigCodeInput("");
              setConfigFeedback("已恢复默认配置。");
            }}
          >
            恢复默认
          </OrnateButton>
        </div>
        {configFeedback && (
          <p className="mt-2 text-[0.6rem] text-gold-frame/70">{configFeedback}</p>
        )}
      </CardFrame>

      {/* Bottom buttons */}
      <div className="mt-auto flex gap-3">
        <OrnateButton variant="ghost" size="lg" onClick={onBack} className="flex-1">
          返回首页
        </OrnateButton>
        <OrnateButton variant="primary" size="lg" onClick={onStartGame} className="flex-1" glow="rgba(201,168,76,0.3)">
          进入游戏 →
        </OrnateButton>
      </div>
    </section>
  );
}
