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
        steel: "#5e6a7d"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(17, 24, 39, 0.12)"
      },
      fontFamily: {
        display: ["Georgia", "ui-serif", "serif"],
        body: ["'Trebuchet MS'", "Verdana", "sans-serif"]
      }
    }
  },
  plugins: []
};
