import { withAndroidManifest } from '@expo/config-plugins';

function allowCleartextOnPreview(config) {
  if (process.env.EXPO_USE_CLEARTEXT !== 'true') {
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });
}

export default ({ config }) => {
  const cleartext = process.env.EXPO_USE_CLEARTEXT === 'true';
  const next = {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      usesCleartextTraffic: cleartext ? true : config.android?.usesCleartextTraffic,
    },
  };
  return cleartext ? allowCleartextOnPreview(next) : next;
};
