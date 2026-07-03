interface GemBadgeProps {
  color?: string;
  label: string;
  value: number;
  max?: number;
  size?: "sm" | "md";
}

const colorMap: Record<string, { bg: string; ring: string; text: string }> = {
  gold: { bg: "from-yellow-400 to-amber-600", ring: "ring-yellow-400/40", text: "text-yellow-300" },
  red: { bg: "from-red-400 to-red-700", ring: "ring-red-400/40", text: "text-red-300" },
  blue: { bg: "from-blue-400 to-blue-700", ring: "ring-blue-400/40", text: "text-blue-300" },
  green: { bg: "from-emerald-400 to-emerald-700", ring: "ring-emerald-400/40", text: "text-emerald-300" },
  purple: { bg: "from-purple-400 to-purple-700", ring: "ring-purple-400/40", text: "text-purple-300" },
  cyan: { bg: "from-cyan-400 to-cyan-700", ring: "ring-cyan-400/40", text: "text-cyan-300" },
  orange: { bg: "from-orange-400 to-orange-700", ring: "ring-orange-400/40", text: "text-orange-300" },
  gray: { bg: "from-gray-400 to-gray-600", ring: "ring-gray-400/40", text: "text-gray-300" },
};

export function GemBadge({ color = "gold", label, value, max, size = "sm" }: GemBadgeProps) {
  const c = colorMap[color] ?? colorMap.gold;

  if (max !== undefined) {
    return (
      <div className="flex items-center gap-1">
        <span className={`text-[0.6rem] font-semibold ${c.text} opacity-80`}>{label}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
              } ${
                i < value
                  ? `bg-gradient-to-br ${c.bg} ring-1 ${c.ring}`
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <span className={`text-[0.58rem] font-bold ${c.text}`}>
          {value}/{max}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className={`text-[0.6rem] font-semibold ${c.text} opacity-80`}>{label}</span>
      <span className={`text-[0.65rem] font-bold ${c.text}`}>{value}</span>
    </div>
  );
}
