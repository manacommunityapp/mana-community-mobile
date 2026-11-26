const appConfig = require('./app.json').expo;
const { URL } = require('url');

module.exports = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  const isProduction = process.env.NODE_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
  const isDevelopmentBuild = !process.env.EAS_BUILD_PROFILE || process.env.EAS_BUILD_PROFILE === 'development';
  let isPrivateApiHost = false;
  try {
    const hostname = new URL(apiUrl).hostname;
    isPrivateApiHost = hostname === 'localhost' || hostname === '127.0.0.1' ||
      /^10\./.test(hostname) || /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  } catch {}
  const allowLocalCleartext = !isProduction && isDevelopmentBuild && isPrivateApiHost && apiUrl.startsWith('http://');

  return {
    ...appConfig,
    plugins: [
      ...(appConfig.plugins || []),
      ...(allowLocalCleartext
        ? [['expo-build-properties', { android: { usesCleartextTraffic: true } }]]
        : []),
    ],
  };
};
