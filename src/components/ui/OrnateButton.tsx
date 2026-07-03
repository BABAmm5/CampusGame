import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface OrnateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  glow?: string;
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-gradient-to-br from-gold-frame to-amber-700 text-stone-950 border-gold-frame/60 hover:from-gold-frame hover:to-amber-600",
  secondary:
    "bg-gradient-to-br from-gold-frame/15 to-card-dark/60 text-amber-50 border-gold-frame/30 hover:from-gold-frame/25 hover:to-card-dark/80",
  danger:
    "bg-gradient-to-br from-wine to-red-900 text-amber-50 border-wine/40 hover:from-wine hover:to-red-800",
  ghost:
    "bg-transparent text-amber-100/70 border-amber-200/15 hover:bg-white/5 hover:text-amber-50",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-2xl",
};

export function OrnateButton({
  variant = "secondary",
  size = "md",
  glow,
  children,
  className = "",
  disabled,
  style,
  ...rest
}: OrnateButtonProps) {
  return (
    <button
      className={`relative border font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      style={{
        ...style,
        ...(glow && !disabled
          ? { boxShadow: `0 0 16px ${glow}` }
          : {}),
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
