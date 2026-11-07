
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: ["./src/**/*.{js,jsx,ts,tsx}"]
  },
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "outfit-regular": ["Outfit_400Regular"],
        "outfit-medium": ["Outfit_500Medium"],
        "outfit-semibold": ["Outfit_600SemiBold"],
        "outfit-bold": ["Outfit_700Bold"],
        "outfit-extra": ["Outfit_800ExtraBold"]
      },
      colors: {
        bg: "#101011",
        panel: "#1A1A1D",
        elevated: "#242427",
        border: "#303034",
        brand: "#43CFB3",
        ink: "#F8F7F4",
        muted: "#A7AAAF"
      },
      borderRadius: {
        card: "24px"
      }
    }
  },
  plugins: []
};
