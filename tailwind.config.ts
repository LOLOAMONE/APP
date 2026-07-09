import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef6ee",
          100: "#fdead7",
          200: "#fad1ae",
          300: "#f6b17a",
          400: "#f18844",
          500: "#ec6a20",
          600: "#dd5116",
          700: "#b73d14",
          800: "#923118",
          900: "#762a16",
        },
      },
    },
  },
  plugins: [],
};

export default config;
