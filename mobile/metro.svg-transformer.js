// Compatibility for running Metro sessions that cached the previous transformer path.
// New sessions use the standard Expo configuration; tab icons are native SVG elements.
module.exports = require("@expo/metro-config/babel-transformer");
