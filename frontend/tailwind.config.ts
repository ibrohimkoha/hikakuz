import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0c",
        surface: "#0f1117",
        card: "#181a20",
        "card-hover": "#22252e",
        accent: {
          rose: "#E11D48",
          red: "#BE123C",
          violet: "#06B6D4",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          glass: "rgba(255, 255, 255, 0.15)",
        }
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        heading: ["'Outfit'", "'Plus Jakarta Sans'", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 25px -5px rgba(225, 29, 72, 0.4)",
        "neon-red": "0 0 25px -5px rgba(190, 18, 60, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};
export default config;
