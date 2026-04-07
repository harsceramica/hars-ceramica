import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8f6f1",
          100: "#ede5d9",
          200: "#dcc8b0",
          300: "#c9a984",
          400: "#b98f62",
          500: "#a9784c",
          600: "#8e6240",
          700: "#714d35",
          800: "#5b402f",
          900: "#4b3629"
        }
      }
    }
  },
  plugins: [],
};

export default config;
