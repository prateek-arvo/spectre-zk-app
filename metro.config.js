const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Alias react-native-worklets-core -> react-native-worklets
// VisionCamera v4 requires 'react-native-worklets-core' but Expo SDK 54 ships 'react-native-worklets'
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-worklets-core') {
    return context.resolveRequest(context, 'react-native-worklets', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
