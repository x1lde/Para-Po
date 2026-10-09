const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the on-device landmark model (assets/models/landmark_model.tflite).
config.resolver.assetExts.push('tflite');

module.exports = config;
