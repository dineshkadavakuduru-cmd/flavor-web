/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#05060a",
          900: "#090b12",
          800: "#0e1220",
          700: "#161c30",
        },
        ember: "#ffb347",
        herb: "#7dd87d",
        spice: "#ff6b47",
        dairy: "#a8d0e6",
        fruit: "#e879c8",
        grain: "#f4d59e",
        bone: "#ede8dc",
        ash: "#8b93a7",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        grotesk: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        reveal: "reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 5s linear infinite",
      },
      keyframes: {
        reveal: {
          "0%": { opacity: "0", transform: "translateY(24px)", filter: "blur(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
