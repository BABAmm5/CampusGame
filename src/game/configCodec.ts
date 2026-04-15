import { DEFAULT_RULE_CONFIG } from "./config";
import type { RuleConfig } from "./types";

interface EncodedConfigPayload {
  v: 1;
  factionCount: number;
  ruleConfig: RuleConfig;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeConfigCode(factionCount: number, ruleConfig: RuleConfig): string {
  const payload: EncodedConfigPayload = {
    v: 1,
    factionCount,
    ruleConfig,
  };
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseConfigCode(code: string): EncodedConfigPayload {
  const raw = new TextDecoder().decode(base64ToBytes(code.trim()));
  const payload = JSON.parse(raw) as Partial<EncodedConfigPayload>;
  if (payload.v !== 1 || !payload.ruleConfig || ![2, 3, 4].includes(payload.factionCount ?? 0)) {
    throw new Error("配置码版本或阵营数无效。");
  }

  const merged: RuleConfig = {
    initialFactionStats: {
      ...DEFAULT_RULE_CONFIG.initialFactionStats,
      ...payload.ruleConfig.initialFactionStats,
    },
    economy: {
      ...DEFAULT_RULE_CONFIG.economy,
      ...payload.ruleConfig.economy,
    },
    battle: {
      ...DEFAULT_RULE_CONFIG.battle,
      ...payload.ruleConfig.battle,
    },
  };

  const numbers = [
    ...Object.values(merged.initialFactionStats),
    ...Object.values(merged.economy),
    ...Object.values(merged.battle),
  ];
  if (!numbers.every(isFiniteNumber)) {
    throw new Error("配置码包含非法数值。");
  }

  return {
    v: 1,
    factionCount: payload.factionCount as number,
    ruleConfig: merged,
  };
}
