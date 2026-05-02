import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

// iOS buildNumber / Android versionCode를 한 곳에서 같이 관리합니다.
const MOBILE_BUILD_NUMBER = 29;

export default (): ExpoConfig => ({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    [
      "expo-notifications",
      {
        color: "#2D5A3D",
        defaultChannel: "default",
      },
    ],
  ],
  ios: {
    ...baseConfig.ios,
    buildNumber: String(MOBILE_BUILD_NUMBER),
  },
  android: {
    ...baseConfig.android,
    versionCode: MOBILE_BUILD_NUMBER,
  },
  extra: {
    ...baseConfig.extra,
    mobileBuildNumber: MOBILE_BUILD_NUMBER,
  },
});
