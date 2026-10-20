
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#101011",
        panel: "#1A1A1D",
        elevated: "#222225",
        border: "#313137",
        brand: "#FF7838",
        ink: "#F8F7F4",
        muted: "#A7A7AA"
      },
      borderRadius: {
        card: "24px"
      }
    }
  },
  plugins: []
};
