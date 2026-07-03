/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        sand: "#f6efe3",
        accent: "#c46d2d",
        forest: "#365b43",
        wine: "#6f2f35",
        steel: "#5e6a7d",
        // Faction colors
        ruler: "#c2410c",
        rebel: "#0891b2",
        guardian: "#2563eb",
        hunter: "#ea580c",
        twilight: "#7c3aed",
        recruited: "#059669",
        curtain: "#6366f1",
        grave: "#374151",
        // Card system colors
        scheme: "#7c3aed",
        equipment: "#2563eb",
        "battle-card": "#dc2626",
        "weapon-card": "#ea580c",
        "gold-frame": "#c9a84c",
        parchment: "#f5e6c8",
        "parchment-dark": "#d4b896",
        "card-dark": "#3d2b1a",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(17, 24, 39, 0.12)",
        "card-hover": "0 8px 30px rgba(0,0,0,0.4), 0 0 15px rgba(201,168,76,0.3)",
        gem: "inset 0 -2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.2)",
        "glow-gold": "0 0 20px rgba(201,168,76,0.6)",
        "glow-ruler": "0 0 20px rgba(194,65,12,0.5)",
        "glow-rebel": "0 0 20px rgba(8,145,178,0.5)",
        "glow-guardian": "0 0 20px rgba(37,99,235,0.5)",
        "glow-hunter": "0 0 20px rgba(234,88,12,0.5)",
      },
      fontFamily: {
        display: ["Georgia", "ui-serif", "serif"],
        body: ["'Trebuchet MS'", "Verdana", "sans-serif"],
      },
      animation: {
        "card-enter": "cardEnter 0.4s ease-out both",
        "card-play": "cardPlay 0.5s ease-in forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "slide-up": "slideUp 0.35s ease-out both",
        "bg-orb-1": "bgOrb1 18s ease-in-out infinite",
        "bg-orb-2": "bgOrb2 22s ease-in-out infinite",
        "bg-orb-3": "bgOrb3 15s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.3s ease-out both",
      },
      keyframes: {
        cardEnter: {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        cardPlay: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-200px) scale(0.5)", opacity: "0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(201,168,76,0.4)" },
          "50%": { boxShadow: "0 0 28px rgba(201,168,76,0.85)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%) scale(0.95)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        bgOrb1: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.1)" },
          "66%": { transform: "translate(-15px, 15px) scale(0.95)" },
        },
        bgOrb2: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "40%": { transform: "translate(-25px, 25px) scale(1.08)" },
          "70%": { transform: "translate(20px, -10px) scale(0.92)" },
        },
        bgOrb3: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(20px, 15px) scale(1.12)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
