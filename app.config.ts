import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

// iOS buildNumber / Android versionCode를 한 곳에서 같이 관리합니다.
const MOBILE_BUILD_NUMBER = 41;

export default (): ExpoConfig => ({
  ...baseConfig,
  newArchEnabled: true,
  plugins: [
    ...(baseConfig.plugins ?? []),
    [
      "expo-notifications",
      {
        color: "#2D5A3D",
        defaultChannel: "default",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "글숲에서 만든 글 이미지를 사진 앱에 저장하고 확인하기 위해 사진 접근 권한이 필요합니다.",
        savePhotosPermission: "글숲에서 만든 글 이미지를 사진 앱에 저장하기 위해 사진 추가 권한이 필요합니다.",
        isAccessMediaLocationEnabled: false,
        granularPermissions: [],
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "프로필 사진으로 사용할 이미지를 선택하기 위해 사진 접근 권한이 필요합니다.",
      },
    ],
  ],
  ios: {
    ...baseConfig.ios,
    buildNumber: String(MOBILE_BUILD_NUMBER),
  },
  android: {
    ...baseConfig.android,
    edgeToEdgeEnabled: true,
    versionCode: MOBILE_BUILD_NUMBER,
  },
  extra: {
    ...baseConfig.extra,
    mobileBuildNumber: MOBILE_BUILD_NUMBER,
  },
});
