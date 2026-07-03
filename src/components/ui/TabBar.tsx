interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "light" | "dark";
}

export function TabBar({ tabs, activeTab, onTabChange, variant = "dark" }: TabBarProps) {
  return (
    <div
      className={`flex gap-1 rounded-xl p-1 ${
        variant === "dark"
          ? "border border-amber-200/20 bg-black/30"
          : "border border-amber-950/10 bg-amber-950/5"
      }`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ${
              isActive
                ? variant === "dark"
                  ? "bg-gold-frame/20 text-gold-frame shadow-sm"
                  : "bg-gold-frame text-white shadow-sm"
                : variant === "dark"
                  ? "text-amber-100/60 hover:bg-white/5 hover:text-amber-100"
                  : "text-stone-600 hover:bg-amber-950/5 hover:text-stone-800"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span
                className={`ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold ${
                  isActive
                    ? "bg-gold-frame/40 text-white"
                    : variant === "dark"
                      ? "bg-amber-100/20 text-amber-200"
                      : "bg-stone-300 text-stone-700"
                }`}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <div className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gold-frame" />
            )}
          </button>
        );
      })}
    </div>
  );
}
