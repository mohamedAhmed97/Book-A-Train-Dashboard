import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F7FB", bg2: "#FFFFFF", bg3: "#F4F7FB", bg4: "#E6F1FB", bg5: "#E5E7EB",
        primary: { DEFAULT: "#185FA5", light: "#378ADD", dark: "#0C447C" },
        accent: { DEFAULT: "#1D9E75", light: "#9FE1CB" },
        coral: "#E53935",
        amber: "#F59E0B",
        txt: "#111827", txt2: "#6B7280", txt3: "#9CA3AF",
      },
    },
  },
  plugins: [],
};
export default config;
