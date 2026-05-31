import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

// iOS buildNumber / Android versionCode를 한 곳에서 같이 관리합니다.
const MOBILE_BUILD_NUMBER = 41;
const ADMOB_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const ADMOB_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function shouldRequireAdMobAppId(platform: "android" | "ios") {
  if (process.env.EAS_BUILD_PROFILE !== "production") return false;

  const buildPlatform = readEnv("EAS_BUILD_PLATFORM");
  if (buildPlatform === "android" || buildPlatform === "ios") {
    return buildPlatform === platform;
  }

  return true;
}

function resolveAdMobAppId(name: string, testAppId: string, platform: "android" | "ios") {
  const configured = readEnv(name);
  if (configured) return configured;

  if (shouldRequireAdMobAppId(platform)) {
    throw new Error(`${name} is required for production AdMob builds.`);
  }

  return testAppId;
}

const androidAdMobAppId = resolveAdMobAppId(
  "ADMOB_ANDROID_APP_ID",
  ADMOB_TEST_ANDROID_APP_ID,
  "android"
);
const iosAdMobAppId = resolveAdMobAppId("ADMOB_IOS_APP_ID", ADMOB_TEST_IOS_APP_ID, "ios");

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
        photosPermission: "프로필 사진을 선택하기 위해 사진 보관함 접근 권한이 필요합니다.",
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: androidAdMobAppId,
        iosAppId: iosAdMobAppId,
      },
    ],
  ],
  ios: {
    ...baseConfig.ios,
    infoPlist: {
      ...(baseConfig.ios?.infoPlist ?? {}),
      NSUserTrackingUsageDescription:
        "맞춤형 광고와 광고 성과 측정을 위해 앱 활동 사용 권한을 요청할 수 있습니다.",
    },
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
    adMob: {
      androidAppId: androidAdMobAppId,
      iosAppId: iosAdMobAppId,
      usingTestAppIds:
        androidAdMobAppId === ADMOB_TEST_ANDROID_APP_ID ||
        iosAdMobAppId === ADMOB_TEST_IOS_APP_ID,
    },
  },
});
