import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Palette reprise de la charte Amoné (restaurants-amone.com) : bordeaux principal + doré en accent.
        brand: {
          50: "#faf0f2",
          100: "#f3dde2",
          200: "#e7bbc6",
          300: "#d78ea0",
          400: "#c55974",
          500: "#aa3c57",
          600: "#832e43",
          700: "#622232",
          800: "#4b1b27",
          900: "#39141d",
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
