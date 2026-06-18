import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0d0d0d",
        "bg-card": "#161616",
        lime: {
          DEFAULT: "#c6ff00",
          dim: "#9bcf00",
        },
        border: "#2a2a2a",
        danger: "#ff5c5c",
      },
    },
  },
  plugins: [],
};

export default config;
