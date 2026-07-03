import type { FactionId } from "../game/types";
import rulerEmblem from "../assets/factions/ruler.webp";
import rebelEmblem from "../assets/factions/rebel.webp";
import guardianEmblem from "../assets/factions/guardian.webp";
import hunterEmblem from "../assets/factions/hunter.webp";
import twilightEmblem from "../assets/factions/twilight.webp";
import recruitEmblem from "../assets/factions/recruit.webp";
import curtainEmblem from "../assets/factions/curtain.webp";
import graveEmblem from "../assets/factions/grave.webp";

export const FACTION_COLOR_MAP: Record<FactionId, { accent: string; glow: string; bg: string; gemColor: string }> = {
  1: { accent: "#c2410c", glow: "rgba(194,65,12,0.5)", bg: "from-red-900/40 to-red-950/60", gemColor: "red" },
  2: { accent: "#0891b2", glow: "rgba(8,145,178,0.5)", bg: "from-cyan-900/40 to-cyan-950/60", gemColor: "cyan" },
  3: { accent: "#2563eb", glow: "rgba(37,99,235,0.5)", bg: "from-blue-900/40 to-blue-950/60", gemColor: "blue" },
  4: { accent: "#ea580c", glow: "rgba(234,88,12,0.5)", bg: "from-orange-900/40 to-orange-950/60", gemColor: "orange" },
  5: { accent: "#7c3aed", glow: "rgba(124,58,237,0.5)", bg: "from-violet-900/40 to-violet-950/60", gemColor: "violet" },
  6: { accent: "#0d9488", glow: "rgba(13,148,136,0.5)", bg: "from-teal-900/40 to-teal-950/60", gemColor: "teal" },
  7: { accent: "#4338ca", glow: "rgba(67,56,202,0.5)", bg: "from-indigo-900/40 to-indigo-950/60", gemColor: "indigo" },
  8: { accent: "#374151", glow: "rgba(55,65,81,0.5)", bg: "from-gray-900/40 to-gray-950/60", gemColor: "gray" },
};

export const FACTION_EMOJI: Record<FactionId, string> = {
  1: "👑", 2: "⚔️", 3: "🛡️", 4: "🏹",
  5: "🌙", 6: "📢", 7: "📜", 8: "💀",
};

export const FACTION_EMBLEM: Record<FactionId, string> = {
  1: rulerEmblem, 2: rebelEmblem, 3: guardianEmblem, 4: hunterEmblem,
  5: twilightEmblem, 6: recruitEmblem, 7: curtainEmblem, 8: graveEmblem,
};
