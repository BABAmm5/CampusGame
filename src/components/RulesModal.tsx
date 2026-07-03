import { ModalShell } from "./ModalShell";
import type { RuleConfig } from "../game/types";

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
  ruleConfig: RuleConfig;
}

export function RulesModal({ open, onClose, ruleConfig }: RulesModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} title="规则说明" subtitle="Rules" variant="dark" maxWidth="max-w-md">
      <div className="space-y-3 text-[0.75rem] leading-6 text-amber-100/65">
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
    </ModalShell>
  );
}
