
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
        "inter-regular": ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        "inter-extra": ["Inter_800ExtraBold"]
      },
      colors: {
        bg: "#101011",
        panel: "#1A1A1D",
        elevated: "#242427",
        border: "#303034",
        brand: "#C5F460",
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
