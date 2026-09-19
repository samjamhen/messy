import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

  return {
    ...config,
    name: config.name ?? 'messy-app',
    slug: config.slug ?? 'messy-app',
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', {
        ...(androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}),
        ...(iosGoogleMapsApiKey ? { iosGoogleMapsApiKey } : {}),
      }],
    ],
  };
};
