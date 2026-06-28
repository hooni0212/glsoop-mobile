const fs = require("fs");
const path = require("path");

const {
  IOSConfig,
  createRunOncePlugin,
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const APP_GROUPS_ENTITLEMENT = "com.apple.security.application-groups";
const DEFAULT_APP_GROUP_IDENTIFIER = "group.com.glsoop.app";
const DEFAULT_WIDGET_TARGET_NAME = "GlsoopWidgets";
const DEFAULT_TODAY_PROMPT_KIND = "glsoop.widget.todayPrompt.v1";
const DEFAULT_SENTENCE_FRAME_KIND = "glsoop.widget.sentenceFrame.v1";
const DEFAULT_TODAY_PROMPT_KEY = "glsoop.widget.todayPrompt.v1";
const DEFAULT_SENTENCE_FRAME_KEY = "glsoop.widget.sentenceFrame.v1";

function quote(value) {
  return `"${value}"`;
}

function trimQuotes(value) {
  return String(value ?? "").replace(/^"(.*)"$/, "$1");
}

function writeFileIfChanged(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === contents) {
    return;
  }
  fs.writeFileSync(filePath, contents, "utf8");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeOptions(config, options = {}) {
  const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.glsoop.app";
  const widgetTargetName = options.widgetTargetName ?? DEFAULT_WIDGET_TARGET_NAME;

  return {
    appGroupIdentifier: options.appGroupIdentifier ?? DEFAULT_APP_GROUP_IDENTIFIER,
    widgetTargetName,
    widgetBundleIdentifier:
      options.widgetBundleIdentifier ?? `${bundleIdentifier}.widgets`,
    todayPromptKind: options.todayPromptKind ?? DEFAULT_TODAY_PROMPT_KIND,
    sentenceFrameKind: options.sentenceFrameKind ?? DEFAULT_SENTENCE_FRAME_KIND,
    todayPromptSnapshotKey: options.todayPromptSnapshotKey ?? DEFAULT_TODAY_PROMPT_KEY,
    sentenceFrameSnapshotKey:
      options.sentenceFrameSnapshotKey ?? DEFAULT_SENTENCE_FRAME_KEY,
  };
}

function getTargetUuid(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  for (const key of Object.keys(targets)) {
    if (key.endsWith("_comment")) continue;
    const target = targets[key];
    if (trimQuotes(target.name) === targetName) return key;
  }
  return null;
}

function getApplicationTarget(project) {
  const targets = project.pbxNativeTargetSection();
  for (const key of Object.keys(targets)) {
    if (key.endsWith("_comment")) continue;
    const target = targets[key];
    if (trimQuotes(target.productType) === "com.apple.product-type.application") {
      return { uuid: key, target };
    }
  }
  throw new Error("Failed to locate iOS application target.");
}

function getBuildConfigurationsForTarget(project, targetUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  if (!target?.buildConfigurationList) return [];
  return IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
    project,
    target.buildConfigurationList
  );
}

function ensureGroup(project, { name, pathName, parentGroupKey }) {
  const existing =
    project.findPBXGroupKey({ name }) ||
    (pathName ? project.findPBXGroupKey({ path: pathName }) : null);
  if (existing) return existing;

  const groupKey = project.pbxCreateGroup(name, pathName);
  if (parentGroupKey) {
    const parent = project.getPBXGroupByKey(parentGroupKey);
    const alreadyLinked = parent?.children?.some((child) => child.value === groupKey);
    if (!alreadyLinked) {
      project.addToPbxGroup(groupKey, parentGroupKey);
    }
  }
  return groupKey;
}

function ensureBuildPhase(project, targetUuid, buildPhaseType, comment) {
  const section = project.hash.project.objects[buildPhaseType] ?? {};
  const target = project.pbxNativeTargetSection()[targetUuid];
  const hasPhase = (target.buildPhases ?? []).some((phase) => {
    const item = section[phase.value];
    return item?.isa === buildPhaseType || phase.comment === comment;
  });

  if (!hasPhase) {
    project.addBuildPhase([], buildPhaseType, comment, targetUuid);
  }
}

function addSourceFileOnce(project, filePath, targetUuid, groupKey) {
  if (project.hasFile(filePath)) return;
  project.addSourceFile(filePath, { target: targetUuid }, groupKey);
}

function addFrameworkOnce(project, frameworkName, targetUuid) {
  if (project.hasFile(frameworkName)) return;
  project.addFramework(frameworkName, { target: targetUuid });
}

function writeNativeFiles(iosRoot, projectRoot, options) {
  const sourceRoot = IOSConfig.Paths.getSourceRoot(projectRoot);
  const widgetRoot = path.join(iosRoot, options.widgetTargetName);

  writeFileIfChanged(
    path.join(sourceRoot, "GlsoopWidgetSnapshots.swift"),
    createSnapshotNativeModuleSwift(options)
  );
  writeFileIfChanged(
    path.join(sourceRoot, "GlsoopWidgetSnapshotsBridge.m"),
    createSnapshotNativeModuleBridge()
  );
  writeFileIfChanged(
    path.join(widgetRoot, `${options.widgetTargetName}.swift`),
    createWidgetBundleSwift(options)
  );
  writeFileIfChanged(
    path.join(widgetRoot, `${options.widgetTargetName}-Info.plist`),
    createWidgetInfoPlist()
  );
  writeFileIfChanged(
    path.join(widgetRoot, `${options.widgetTargetName}.entitlements`),
    createWidgetEntitlementsPlist(options)
  );
}

function updateTargetBuildSettings(project, targetUuid, config, options) {
  const version = config.version ?? "1.0.9";
  const buildNumber = config.ios?.buildNumber ?? "1";

  for (const [, buildConfiguration] of getBuildConfigurationsForTarget(project, targetUuid)) {
    const settings = buildConfiguration.buildSettings ?? {};
    settings.APPLICATION_EXTENSION_API_ONLY = "YES";
    settings.CODE_SIGN_ENTITLEMENTS = `${options.widgetTargetName}/${options.widgetTargetName}.entitlements`;
    settings.CURRENT_PROJECT_VERSION = String(buildNumber);
    settings.GENERATE_INFOPLIST_FILE = "NO";
    settings.INFOPLIST_FILE = `${options.widgetTargetName}/${options.widgetTargetName}-Info.plist`;
    settings.IPHONEOS_DEPLOYMENT_TARGET = settings.IPHONEOS_DEPLOYMENT_TARGET ?? "15.1";
    settings.MARKETING_VERSION = version;
    settings.PRODUCT_BUNDLE_IDENTIFIER = options.widgetBundleIdentifier;
    settings.PRODUCT_NAME = quote("$(TARGET_NAME)");
    settings.SKIP_INSTALL = "YES";
    settings.SWIFT_VERSION = settings.SWIFT_VERSION ?? "5.0";
    settings.TARGETED_DEVICE_FAMILY = settings.TARGETED_DEVICE_FAMILY ?? quote("1,2");
    buildConfiguration.buildSettings = settings;
  }
}

function applyXcodeProject(config, project, options) {
  const appTarget = getApplicationTarget(project);
  const appTargetUuid = appTarget.uuid;
  const appTargetName = trimQuotes(
    appTarget.target?.name ?? ""
  );
  const appGroupKey =
    project.findPBXGroupKey({ name: appTargetName }) ||
    project.findPBXGroupKey({ path: appTargetName });

  if (appGroupKey) {
    addSourceFileOnce(
      project,
      `${appTargetName}/GlsoopWidgetSnapshots.swift`,
      appTargetUuid,
      appGroupKey
    );
    addSourceFileOnce(
      project,
      `${appTargetName}/GlsoopWidgetSnapshotsBridge.m`,
      appTargetUuid,
      appGroupKey
    );
  }

  let widgetTargetUuid = getTargetUuid(project, options.widgetTargetName);
  if (!widgetTargetUuid) {
    project.addTarget(
      options.widgetTargetName,
      "app_extension",
      options.widgetTargetName,
      options.widgetBundleIdentifier
    );
    widgetTargetUuid = getTargetUuid(project, options.widgetTargetName);
  }

  if (!widgetTargetUuid) {
    throw new Error(`Failed to create iOS widget target: ${options.widgetTargetName}`);
  }

  const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
  const widgetGroupKey = ensureGroup(project, {
    name: options.widgetTargetName,
    pathName: undefined,
    parentGroupKey: mainGroupKey,
  });
  const widgetGroup = project.getPBXGroupByKey(widgetGroupKey);
  if (widgetGroup?.path === options.widgetTargetName) {
    delete widgetGroup.path;
  }

  ensureBuildPhase(project, widgetTargetUuid, "PBXSourcesBuildPhase", "Sources");
  ensureBuildPhase(project, widgetTargetUuid, "PBXFrameworksBuildPhase", "Frameworks");
  ensureBuildPhase(project, widgetTargetUuid, "PBXResourcesBuildPhase", "Resources");

  addSourceFileOnce(
    project,
    `${options.widgetTargetName}/${options.widgetTargetName}.swift`,
    widgetTargetUuid,
    widgetGroupKey
  );
  addFrameworkOnce(project, "WidgetKit.framework", widgetTargetUuid);
  addFrameworkOnce(project, "SwiftUI.framework", widgetTargetUuid);
  updateTargetBuildSettings(project, widgetTargetUuid, config, options);
}

function createSnapshotNativeModuleBridge() {
  return `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(GlsoopWidgetSnapshots, NSObject)

RCT_EXTERN_METHOD(updateSnapshot:(NSString *)key
                  payload:(NSString *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeSnapshot:(NSString *)key
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;
}

function createSnapshotNativeModuleSwift(options) {
  return `import Foundation
import React
import WidgetKit

@objc(GlsoopWidgetSnapshots)
class GlsoopWidgetSnapshots: NSObject {
  private let appGroupIdentifier = "${options.appGroupIdentifier}"
  private let allowedKeys: Set<String> = [
    "${options.todayPromptSnapshotKey}",
    "${options.sentenceFrameSnapshotKey}"
  ]

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(updateSnapshot:payload:resolver:rejecter:)
  func updateSnapshot(
    _ key: NSString,
    payload: NSString,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let snapshotKey = key as String
    guard allowedKeys.contains(snapshotKey) else {
      reject("E_WIDGET_KEY", "Unsupported widget snapshot key.", nil)
      return
    }

    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("E_WIDGET_APP_GROUP", "Could not open widget App Group storage.", nil)
      return
    }

    defaults.set(payload as String, forKey: snapshotKey)
    defaults.synchronize()
    WidgetCenter.shared.reloadAllTimelines()
    resolve(nil)
  }

  @objc(removeSnapshot:resolver:rejecter:)
  func removeSnapshot(
    _ key: NSString,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let snapshotKey = key as String
    guard allowedKeys.contains(snapshotKey) else {
      reject("E_WIDGET_KEY", "Unsupported widget snapshot key.", nil)
      return
    }

    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("E_WIDGET_APP_GROUP", "Could not open widget App Group storage.", nil)
      return
    }

    defaults.removeObject(forKey: snapshotKey)
    defaults.synchronize()
    WidgetCenter.shared.reloadAllTimelines()
    resolve(nil)
  }
}
`;
}

function createWidgetBundleSwift(options) {
  return `import SwiftUI
import WidgetKit

private enum GlsoopWidgetConstants {
  static let appGroupIdentifier = "${options.appGroupIdentifier}"
  static let todayPromptKey = "${options.todayPromptSnapshotKey}"
  static let sentenceFrameKey = "${options.sentenceFrameSnapshotKey}"
}

private struct TodayPromptPayload: Decodable {
  let version: Int?
  let updatedAt: String?
  let localDateKey: String?
  let campaignKey: String?
  let day: Int?
  let title: String?
  let body: String?
  let deepLink: String?
}

private struct SentenceFramePayload: Decodable {
  let version: Int?
  let updatedAt: String?
  let premiumStatus: String?
  let postId: String?
  let title: String?
  let excerpt: String?
  let authorName: String?
  let deepLink: String?
}

private enum SnapshotReader {
  static func decode<T: Decodable>(_ type: T.Type, key: String) -> T? {
    guard
      let defaults = UserDefaults(suiteName: GlsoopWidgetConstants.appGroupIdentifier),
      let raw = defaults.string(forKey: key),
      let data = raw.data(using: .utf8)
    else {
      return nil
    }

    return try? JSONDecoder().decode(type, from: data)
  }
}

private struct TodayPromptEntry: TimelineEntry {
  let date: Date
  let payload: TodayPromptPayload?
}

private struct SentenceFrameEntry: TimelineEntry {
  let date: Date
  let payload: SentenceFramePayload?
}

private struct TodayPromptProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayPromptEntry {
    TodayPromptEntry(
      date: Date(),
      payload: TodayPromptPayload(
        version: 1,
        updatedAt: nil,
        localDateKey: nil,
        campaignKey: nil,
        day: 1,
        title: "오늘 가장 기억에 남은 장면",
        body: "오늘의 글감을 열고 한 문장으로 시작해보세요.",
        deepLink: "glsoop://write"
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayPromptEntry) -> Void) {
    completion(TodayPromptEntry(date: Date(), payload: readPayload()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayPromptEntry>) -> Void) {
    let entry = TodayPromptEntry(date: Date(), payload: readPayload())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
  }

  private func readPayload() -> TodayPromptPayload? {
    SnapshotReader.decode(TodayPromptPayload.self, key: GlsoopWidgetConstants.todayPromptKey)
  }
}

private struct SentenceFrameProvider: TimelineProvider {
  func placeholder(in context: Context) -> SentenceFrameEntry {
    SentenceFrameEntry(
      date: Date(),
      payload: SentenceFramePayload(
        version: 1,
        updatedAt: nil,
        premiumStatus: "active",
        postId: "preview",
        title: "문장 액자",
        excerpt: "좋아한 문장 하나를 조용히 홈 화면에 담아두세요.",
        authorName: "글숲",
        deepLink: "glsoop://"
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (SentenceFrameEntry) -> Void) {
    completion(SentenceFrameEntry(date: Date(), payload: readPayload()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SentenceFrameEntry>) -> Void) {
    let entry = SentenceFrameEntry(date: Date(), payload: readPayload())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
  }

  private func readPayload() -> SentenceFramePayload? {
    SnapshotReader.decode(SentenceFramePayload.self, key: GlsoopWidgetConstants.sentenceFrameKey)
  }
}

private struct PaperBackground: ViewModifier {
  func body(content: Content) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      content.containerBackground(Color(red: 0.99, green: 0.98, blue: 0.94), for: .widget)
    } else {
      content.background(Color(red: 0.99, green: 0.98, blue: 0.94))
    }
  }
}

private extension View {
  func glsoopPaperBackground() -> some View {
    modifier(PaperBackground())
  }
}

private struct WidgetShell<Content: View>: View {
  let content: Content

  init(@ViewBuilder content: () -> Content) {
    self.content = content()
  }

  var body: some View {
    ZStack {
      Color(red: 0.99, green: 0.98, blue: 0.94)
      content
        .padding(14)
    }
    .glsoopPaperBackground()
  }
}

private struct BrandLabel: View {
  var body: some View {
    Text("글숲")
      .font(.caption2)
      .fontWeight(.semibold)
      .foregroundColor(Color(red: 0.28, green: 0.42, blue: 0.32))
  }
}

private struct TodayPromptView: View {
  @Environment(\\.widgetFamily) private var family
  let entry: TodayPromptEntry

  var body: some View {
    let payload = entry.payload
    WidgetShell {
      VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
        HStack {
          Text(payload?.day.map { "\\($0)일차" } ?? "오늘")
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundColor(Color(red: 0.28, green: 0.42, blue: 0.32))
          Spacer(minLength: 4)
          BrandLabel()
        }

        Spacer(minLength: 2)

        Text(payload?.title ?? "앱에서 오늘의 글감을 확인해 주세요")
          .font(family == .systemSmall ? .headline : .title3)
          .fontWeight(.bold)
          .foregroundColor(Color(red: 0.12, green: 0.16, blue: 0.14))
          .lineLimit(family == .systemSmall ? 3 : 2)
          .minimumScaleFactor(0.82)

        if family != .systemSmall {
          Text(payload?.body ?? "글숲에서 조용히 한 문장을 시작해보세요.")
            .font(.caption)
            .foregroundColor(Color(red: 0.38, green: 0.43, blue: 0.39))
            .lineLimit(2)
        }

        Spacer(minLength: 2)

        Text("이 주제로 쓰기")
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundColor(Color(red: 0.30, green: 0.50, blue: 0.37))
      }
    }
    .widgetURL(URL(string: payload?.deepLink ?? "glsoop://write"))
  }
}

private struct SentenceFrameView: View {
  @Environment(\\.widgetFamily) private var family
  let entry: SentenceFrameEntry

  var body: some View {
    let payload = entry.payload
    let activePayload = payload?.premiumStatus == "active" ? payload : nil

    WidgetShell {
      VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
        HStack {
          Text("문장 액자")
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundColor(Color(red: 0.28, green: 0.42, blue: 0.32))
          Spacer(minLength: 4)
          BrandLabel()
        }

        Spacer(minLength: 2)

        Text(activePayload?.excerpt ?? "문장 액자는 프리미엄에서 사용할 수 있어요")
          .font(family == .systemSmall ? .headline : .title3)
          .fontWeight(.semibold)
          .foregroundColor(Color(red: 0.12, green: 0.16, blue: 0.14))
          .lineLimit(family == .systemSmall ? 5 : 4)
          .minimumScaleFactor(0.74)

        if family != .systemSmall {
          Text(activePayload?.title ?? "좋아한 글에서 직접 고른 문장만 보여줘요.")
            .font(.caption)
            .foregroundColor(Color(red: 0.38, green: 0.43, blue: 0.39))
            .lineLimit(1)
        }

        Spacer(minLength: 2)

        Text(activePayload?.authorName.map { "by \\($0)" } ?? "앱에서 선택하기")
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundColor(Color(red: 0.30, green: 0.50, blue: 0.37))
          .lineLimit(1)
      }
    }
    .widgetURL(URL(string: activePayload?.deepLink ?? "glsoop://premium"))
  }
}

struct TodayPromptWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "${options.todayPromptKind}", provider: TodayPromptProvider()) { entry in
      TodayPromptView(entry: entry)
    }
    .configurationDisplayName("오늘의 글감")
    .description("오늘의 글감을 홈 화면에서 바로 열어요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct SentenceFrameWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "${options.sentenceFrameKind}", provider: SentenceFrameProvider()) { entry in
      SentenceFrameView(entry: entry)
    }
    .configurationDisplayName("문장 액자")
    .description("프리미엄에서 선택한 문장을 홈 화면에 조용히 담아요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct GlsoopWidgetsBundle: WidgetBundle {
  var body: some Widget {
    TodayPromptWidget()
    SentenceFrameWidget()
  }
}
`;
}

function createWidgetInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>글숲 위젯</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;
}

function createWidgetEntitlementsPlist(options) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>${APP_GROUPS_ENTITLEMENT}</key>
  <array>
    <string>${options.appGroupIdentifier}</string>
  </array>
</dict>
</plist>
`;
}

function withGlsoopWidgets(config, options = {}) {
  const resolvedOptions = normalizeOptions(config, options);

  config = withEntitlementsPlist(config, (nextConfig) => {
    const current = nextConfig.modResults[APP_GROUPS_ENTITLEMENT];
    const currentGroups = Array.isArray(current) ? current : [];
    nextConfig.modResults[APP_GROUPS_ENTITLEMENT] = unique([
      ...currentGroups,
      resolvedOptions.appGroupIdentifier,
    ]);
    return nextConfig;
  });

  config = withDangerousMod(config, [
    "ios",
    (nextConfig) => {
      writeNativeFiles(
        nextConfig.modRequest.platformProjectRoot,
        nextConfig.modRequest.projectRoot,
        resolvedOptions
      );
      return nextConfig;
    },
  ]);

  config = withXcodeProject(config, (nextConfig) => {
    applyXcodeProject(nextConfig, nextConfig.modResults, resolvedOptions);
    return nextConfig;
  });

  return config;
}

module.exports = createRunOncePlugin(withGlsoopWidgets, "with-glsoop-widgets", "1.0.0");
