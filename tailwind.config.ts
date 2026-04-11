import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mutedInk: "#344356",
        surface: "#f6f8fb",
        panel: "#ffffff",
        accent: "#0f4c5c",
        accentSoft: "#e5f0f3",
        gold: "#a17f4d"
      },
      boxShadow: {
        panel: "0 12px 30px rgba(15, 23, 42, 0.08)",
        elevated: "0 20px 48px rgba(15, 23, 42, 0.14)"
      },
      backgroundImage: {
        "mesh-soft": "radial-gradient(circle at 15% 15%, rgba(15, 76, 92, 0.18), transparent 36%), radial-gradient(circle at 85% 10%, rgba(161, 127, 77, 0.14), transparent 36%), linear-gradient(180deg, #f8fbfd 0%, #f2f5f9 100%)"
      }
    }
  },
  plugins: []
};

export default config;
