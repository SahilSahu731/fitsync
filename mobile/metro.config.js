require("./scripts/patch-expo-router.cjs")();

const { getDefaultConfig } = require("expo/metro-config");

const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Invalidate bundles built before the initial-link lifecycle workaround.
config.cacheVersion = `${config.cacheVersion ?? ""}-fitsync-link-lifecycle-v1`;

module.exports = withNativeWind(config, {
  input: "./global.css",
});
