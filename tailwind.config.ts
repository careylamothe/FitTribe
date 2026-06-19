/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        punch:        "#FF2D78",  // hot pink — primary accent (buttons, links)
        "punch-dark": "#C4005A",  // deep pink for hover states
        "punch-soft": "#FFD6E7",  // light pink fill (badges, hover backgrounds)
        zest:         "#C8F400",  // lime green — secondary accent
        "zest-dark":  "#8AAA00",  // deep lime for hover states
        sunny:        "#FFD700",  // sunny yellow — highlight accent
        canvas:       "#FFFFFF",  // page / card background
        ink:          "#1A1A2E",  // primary text
        "ink-muted":  "#6B6B8A",  // secondary / muted text
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans:    ["var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
