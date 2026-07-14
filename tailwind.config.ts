import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Couleur officielle de la charte Amoné : bordeaux #901C3A.
        // Utilisée pour tous les accents de l'application (boutons primaires ET
        // dangereux/suppression, alertes, badges) — un seul point de configuration.
        brand: {
          50: "#fbeff2",
          100: "#f5dbe2",
          200: "#ebb7c4",
          300: "#df7c95",
          400: "#d3365f",
          500: "#b32348",
          600: "#901c3a",
          700: "#73162e",
          800: "#581325",
          900: "#42101d",
        },
        gold: {
          50: "#f9f6f1",
          100: "#efe9dc",
          200: "#e0d2b8",
          300: "#cdb88e",
          400: "#c1a671",
          500: "#b7985b",
          600: "#9c7e44",
          700: "#7c6536",
          800: "#604e2a",
          900: "#47391f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
