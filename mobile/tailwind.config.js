/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: ["./src/**/*.{js,jsx,ts,tsx}"],
  },
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "poppins-regular": ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
        "poppins-extra": ["Poppins_800ExtraBold"],
      },
      colors: {
        bg: "#000000",
        panel: "#111111",
        elevated: "#1C1C1C",
        border: "#2A2A2A",
        brand: "#C5F460",
        ink: "#FFFFFF",
        muted: "#A3A3A3",
      },
      borderRadius: {
        card: "28px",
      },
    },
  },
  plugins: [],
};
