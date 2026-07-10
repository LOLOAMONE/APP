import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Couleur officielle de la charte Amoné : RVB 101/11/27, Pantone 56-16 C.
        brand: {
          50: "#fdedf0",
          100: "#fad6dc",
          200: "#f6acb9",
          300: "#ef6c83",
          400: "#e72245",
          500: "#a6122c",
          600: "#650b1b",
          700: "#450812",
          800: "#33060e",
          900: "#25040a",
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
