const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

// Keep payment verification working when Google Play opens a banking app.
// Continuous Native Generation applies this; never edit generated native files.
module.exports = function withPurchases(config) {
  return withAndroidManifest(config, config => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$["android:launchMode"] = "singleTop";
    return config;
  });
};
