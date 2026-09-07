/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [
    require("nativewind/preset"),
  ],

  theme: {
    extend: {
      colors: {
        background: "#080808",

        surface: "#111111",

        elevated: "#171717",

        foreground: "#FAFAFA",

        muted: "#A3A3A3",

        subtle: "#737373",

        border:
          "rgba(255,255,255,0.14)",

        brand: "#2563EB",

        "brand-bright":
          "#3B82F6",

        "brand-dark":
          "#1D4ED8",

        "brand-muted":
          "rgba(37,99,235,0.12)",

        danger: "#EF4444",

        success: "#22C55E",
      },
    },
  },

  plugins: [],
};