import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Lexend", "sans-serif"] },
      colors: {
        primary: "#df0060",
        bg: "#FBF8F1",
      },
    },
  },
  plugins: [],
} satisfies Config;
