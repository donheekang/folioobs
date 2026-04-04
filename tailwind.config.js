/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#10b981",
        "primary-deep": "#006c49",
        "on-primary": "#ffffff",
        surface: "#f9f9fb",
        "surface-low": "#f3f3f5",
        "surface-high": "#e8e8ea",
        "on-surface": "#111827",
        "on-surface-variant": "#4b5563",
        "outline-variant": "#e5e7eb",
        error: "#ef4444",
      },
      fontFamily: {
        editorial: ["Newsreader", "Georgia", "serif"],
        utility: ["Inter", "Noto Sans KR", "sans-serif"],
        body: ["Inter", "Noto Sans KR", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.375rem",
        xl: "0.5rem",
      },
    },
  },
  plugins: [],
}
