import { type ReactNode } from "react";

interface CardFrameProps {
  children: ReactNode;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  accentColor?: string;
  glowColor?: string;
  className?: string;
  awakened?: boolean;
}

const sizePadding: Record<string, string> = {
  sm: "p-1.5",
  md: "p-2.5",
  lg: "p-4",
};

export function CardFrame({
  children,
  variant = "light",
  size = "md",
  accentColor,
  glowColor,
  className = "",
  awakened = false,
}: CardFrameProps) {
  const baseStyle = variant === "dark"
    ? "bg-gradient-to-br from-[rgba(44,29,18,0.98)] to-[rgba(16,13,12,0.98)] border-amber-200/20"
    : "bg-gradient-to-br from-parchment to-parchment-dark border-gold-frame/40";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 ${baseStyle} ${sizePadding[size]} ${
        awakened ? "animate-glow-pulse" : ""
      } ${className}`}
      style={{
        borderColor: accentColor ?? undefined,
        boxShadow: glowColor
          ? `0 0 18px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.08)`
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Corner gem decorations */}
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-2 rounded-br-md border-b border-r"
        style={{ borderColor: accentColor ?? "var(--card-frame-gold)" }} />
      <div className="pointer-events-none absolute right-0 top-0 h-2 w-2 rounded-bl-md border-b border-l"
        style={{ borderColor: accentColor ?? "var(--card-frame-gold)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 rounded-tr-md border-r border-t"
        style={{ borderColor: accentColor ?? "var(--card-frame-gold)" }} />
      <div className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 rounded-tl-md border-l border-t"
        style={{ borderColor: accentColor ?? "var(--card-frame-gold)" }} />

      {/* Inner highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/5 to-transparent" />

      <div className="relative">{children}</div>
    </div>
  );
}
