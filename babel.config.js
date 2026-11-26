// Expo SDK 49 braucht diese Datei noch (ab SDK 50 ist sie optional).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
