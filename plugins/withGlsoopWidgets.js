const fs = require("fs");
const path = require("path");

const {
  IOSConfig,
  createRunOncePlugin,
  withAndroidManifest,
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
const PODFILE_RESOURCE_BUNDLE_SIGNING_MARKER =
  "# glsoop: disable CocoaPods resource bundle signing for EAS Xcode builds";
const ANDROID_PACKAGE_REGISTRATION = "add(GlsoopWidgetSnapshotsPackage())";
const ANDROID_WIDGET_RECEIVERS = [
  {
    name: ".GlsoopTodayPromptWidgetProvider",
    resource: "@xml/glsoop_today_prompt_widget_info",
  },
  {
    name: ".GlsoopSentenceFrameWidgetProvider",
    resource: "@xml/glsoop_sentence_frame_widget_info",
  },
];

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
  const androidPackageName = options.androidPackageName ?? config.android?.package ?? "com.glsoop.app";

  return {
    appGroupIdentifier: options.appGroupIdentifier ?? DEFAULT_APP_GROUP_IDENTIFIER,
    androidPackageName,
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

function patchPodfileForResourceBundleSigning(iosRoot) {
  const podfilePath = path.join(iosRoot, "Podfile");
  if (!fs.existsSync(podfilePath)) return;

  const source = fs.readFileSync(podfilePath, "utf8");
  if (source.includes(PODFILE_RESOURCE_BUNDLE_SIGNING_MARKER)) return;

  const patch = `

    ${PODFILE_RESOURCE_BUNDLE_SIGNING_MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"

      target.build_configurations.each do |config|
        config.build_settings["CODE_SIGNING_ALLOWED"] = "NO"
      end
    end
`;

  const nextSource = source.replace(/\n  end\nend\s*$/, `${patch}\n  end\nend\n`);
  if (nextSource === source) {
    throw new Error("Failed to patch iOS Podfile for resource bundle signing.");
  }
  fs.writeFileSync(podfilePath, nextSource, "utf8");
}

function getAndroidPackagePath(androidPackageName) {
  return androidPackageName.split(".").join(path.sep);
}

function writeAndroidFiles(androidRoot, options) {
  const packageDir = path.join(
    androidRoot,
    "app",
    "src",
    "main",
    "java",
    getAndroidPackagePath(options.androidPackageName)
  );
  const resRoot = path.join(androidRoot, "app", "src", "main", "res");

  writeFileIfChanged(
    path.join(packageDir, "GlsoopAndroidWidgets.kt"),
    createAndroidWidgetsKotlin(options)
  );
  writeFileIfChanged(
    path.join(resRoot, "layout", "glsoop_widget_today_prompt.xml"),
    createTodayPromptWidgetLayoutXml()
  );
  writeFileIfChanged(
    path.join(resRoot, "layout", "glsoop_widget_sentence_frame.xml"),
    createSentenceFrameWidgetLayoutXml()
  );
  writeFileIfChanged(
    path.join(resRoot, "xml", "glsoop_today_prompt_widget_info.xml"),
    createTodayPromptWidgetInfoXml()
  );
  writeFileIfChanged(
    path.join(resRoot, "xml", "glsoop_sentence_frame_widget_info.xml"),
    createSentenceFrameWidgetInfoXml()
  );
  writeFileIfChanged(
    path.join(resRoot, "drawable", "glsoop_widget_background.xml"),
    createAndroidWidgetBackgroundXml()
  );
  patchAndroidMainApplication(androidRoot, options);
}

function patchAndroidMainApplication(androidRoot, options) {
  const packageDir = path.join(
    androidRoot,
    "app",
    "src",
    "main",
    "java",
    getAndroidPackagePath(options.androidPackageName)
  );
  const mainApplicationPath = path.join(packageDir, "MainApplication.kt");
  if (!fs.existsSync(mainApplicationPath)) return;

  const source = fs.readFileSync(mainApplicationPath, "utf8");
  if (source.includes(ANDROID_PACKAGE_REGISTRATION)) return;

  const commentNeedle =
    "              // Packages that cannot be autolinked yet can be added manually here, for example:\n" +
    "              // add(MyReactNativePackage())";
  if (source.includes(commentNeedle)) {
    fs.writeFileSync(
      mainApplicationPath,
      source.replace(commentNeedle, `${commentNeedle}\n              ${ANDROID_PACKAGE_REGISTRATION}`),
      "utf8"
    );
    return;
  }

  const applyNeedle = "PackageList(this).packages.apply {";
  if (!source.includes(applyNeedle)) {
    throw new Error("Failed to patch Android MainApplication for Glsoop widgets.");
  }

  fs.writeFileSync(
    mainApplicationPath,
    source.replace(applyNeedle, `${applyNeedle}\n              ${ANDROID_PACKAGE_REGISTRATION}`),
    "utf8"
  );
}

function ensureAndroidWidgetReceivers(androidManifest) {
  const application = androidManifest.manifest?.application?.[0];
  if (!application) {
    throw new Error("Failed to locate Android application manifest.");
  }

  application.receiver = application.receiver ?? [];
  for (const receiver of ANDROID_WIDGET_RECEIVERS) {
    const existing = application.receiver.find((item) => item?.$?.["android:name"] === receiver.name);
    const next = {
      $: {
        "android:name": receiver.name,
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": receiver.resource,
          },
        },
      ],
    };

    if (existing) {
      Object.assign(existing, next);
    } else {
      application.receiver.push(next);
    }
  }
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
import UIKit
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
  let imageUrl: String?
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
  let imageData: Data?
}

private enum RemoteImageLoader {
  static func loadImageData(from imageUrl: String?, completion: @escaping (Data?) -> Void) {
    guard
      let rawUrl = imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
      !rawUrl.isEmpty,
      let url = URL(string: rawUrl)
    else {
      completion(nil)
      return
    }

    var request = URLRequest(url: url)
    request.cachePolicy = .returnCacheDataElseLoad
    request.timeoutInterval = 8

    URLSession.shared.dataTask(with: request) { data, response, _ in
      guard
        let httpResponse = response as? HTTPURLResponse,
        (200..<300).contains(httpResponse.statusCode),
        let data,
        !data.isEmpty
      else {
        completion(nil)
        return
      }

      completion(data)
    }.resume()
  }
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
        imageUrl: nil,
        deepLink: "glsoop://"
      ),
      imageData: nil
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (SentenceFrameEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }

    loadEntry(completion: completion)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SentenceFrameEntry>) -> Void) {
    loadEntry { entry in
      completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
  }

  private func readPayload() -> SentenceFramePayload? {
    SnapshotReader.decode(SentenceFramePayload.self, key: GlsoopWidgetConstants.sentenceFrameKey)
  }

  private func loadEntry(completion: @escaping (SentenceFrameEntry) -> Void) {
    let payload = readPayload()
    guard payload?.premiumStatus == "active" else {
      completion(SentenceFrameEntry(date: Date(), payload: payload, imageData: nil))
      return
    }

    RemoteImageLoader.loadImageData(from: payload?.imageUrl) { imageData in
      completion(SentenceFrameEntry(date: Date(), payload: payload, imageData: imageData))
    }
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

private struct WidgetImageBackground: ViewModifier {
  let image: UIImage

  func body(content: Content) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      content.containerBackground(for: .widget) {
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
      }
    } else {
      content.background {
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
      }
    }
  }
}

private extension View {
  func glsoopWidgetImageBackground(_ image: UIImage) -> some View {
    modifier(WidgetImageBackground(image: image))
  }
}

private struct FullBleedWidgetImage: View {
  let image: UIImage

  var body: some View {
    GeometryReader { proxy in
      Image(uiImage: image)
        .resizable()
        .scaledToFill()
        .frame(width: proxy.size.width, height: proxy.size.height)
        .clipped()
    }
    .glsoopWidgetImageBackground(image)
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
  let entry: SentenceFrameEntry

  var body: some View {
    let payload = entry.payload
    let activePayload = payload?.premiumStatus == "active" ? payload : nil

    Group {
      if
        activePayload != nil,
        let imageData = entry.imageData,
        let image = UIImage(data: imageData)
      {
        FullBleedWidgetImage(image: image)
      } else {
        ZStack {
          Color(red: 0.99, green: 0.98, blue: 0.94)

          VStack(alignment: .leading, spacing: 12) {
            HStack {
              Text("문장 액자")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.28, green: 0.42, blue: 0.32))
              Spacer(minLength: 4)
              BrandLabel()
            }

            Spacer(minLength: 8)

            Text(activePayload == nil ? "문장 액자는 프리미엄에서 사용할 수 있어요" : "앱에서 선택한 글 사진을 불러오고 있어요")
              .font(.title3)
              .fontWeight(.semibold)
              .foregroundColor(Color(red: 0.12, green: 0.16, blue: 0.14))
              .lineLimit(4)
              .minimumScaleFactor(0.74)

            Text(activePayload?.title ?? "북마크에서 직접 고른 글만 보여줘요.")
              .font(.caption)
              .foregroundColor(Color(red: 0.38, green: 0.43, blue: 0.39))
              .lineLimit(2)

            Spacer(minLength: 8)

            Text(activePayload?.authorName.map { "by \\($0)" } ?? "앱에서 선택하기")
              .font(.caption2)
              .fontWeight(.semibold)
              .foregroundColor(Color(red: 0.30, green: 0.50, blue: 0.37))
              .lineLimit(1)
          }
          .padding(18)
        }
        .glsoopPaperBackground()
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
    .description("북마크에서 선택한 글 사진을 큰 정사각형 위젯에 담아요.")
    .supportedFamilies([.systemLarge])
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

function createAndroidWidgetsKotlin(options) {
  return `package ${options.androidPackageName}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import org.json.JSONObject

private const val WIDGET_PREFS_NAME = "glsoop_widget_snapshots"
private const val TODAY_PROMPT_KEY = "${options.todayPromptSnapshotKey}"
private const val SENTENCE_FRAME_KEY = "${options.sentenceFrameSnapshotKey}"
private const val MAX_WIDGET_IMAGE_EDGE_PX = 768
private const val TAG = "GlsoopWidgets"

class GlsoopWidgetSnapshotsModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "GlsoopWidgetSnapshots"

  @ReactMethod
  fun updateSnapshot(key: String, payload: String, promise: Promise) {
    try {
      if (!GlsoopWidgetStore.isAllowedKey(key)) {
        promise.reject("E_WIDGET_KEY", "Unsupported widget snapshot key.")
        return
      }

      GlsoopWidgetStore.write(reactContext, key, payload)
      GlsoopWidgetUpdater.updateAll(reactContext)
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("E_WIDGET_UPDATE", "Failed to update widget snapshot.", error)
    }
  }

  @ReactMethod
  fun removeSnapshot(key: String, promise: Promise) {
    try {
      if (!GlsoopWidgetStore.isAllowedKey(key)) {
        promise.reject("E_WIDGET_KEY", "Unsupported widget snapshot key.")
        return
      }

      GlsoopWidgetStore.remove(reactContext, key)
      GlsoopWidgetUpdater.updateAll(reactContext)
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("E_WIDGET_REMOVE", "Failed to remove widget snapshot.", error)
    }
  }
}

class GlsoopWidgetSnapshotsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(GlsoopWidgetSnapshotsModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}

class GlsoopTodayPromptWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    GlsoopWidgetUpdater.updateTodayPrompt(context, appWidgetManager, appWidgetIds)
  }
}

class GlsoopSentenceFrameWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    GlsoopWidgetUpdater.updateSentenceFrame(context, appWidgetManager, appWidgetIds)
  }
}

private object GlsoopWidgetStore {
  fun isAllowedKey(key: String): Boolean = key == TODAY_PROMPT_KEY || key == SENTENCE_FRAME_KEY

  fun write(context: Context, key: String, payload: String) {
    context.applicationContext
      .getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(key, payload)
      .apply()
  }

  fun remove(context: Context, key: String) {
    context.applicationContext
      .getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(key)
      .apply()
  }

  fun readJson(context: Context, key: String): JSONObject? {
    val raw = context.applicationContext
      .getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE)
      .getString(key, null)
      ?.trim()
      ?: return null

    if (raw.isEmpty()) return null
    return try {
      JSONObject(raw)
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to parse widget snapshot for " + key, error)
      null
    }
  }
}

private object GlsoopWidgetUpdater {
  private val imageExecutor = Executors.newSingleThreadExecutor()

  fun updateAll(context: Context) {
    val appContext = context.applicationContext
    val manager = AppWidgetManager.getInstance(appContext)

    updateTodayPrompt(
      appContext,
      manager,
      manager.getAppWidgetIds(ComponentName(appContext, GlsoopTodayPromptWidgetProvider::class.java))
    )
    updateSentenceFrame(
      appContext,
      manager,
      manager.getAppWidgetIds(ComponentName(appContext, GlsoopSentenceFrameWidgetProvider::class.java))
    )
  }

  fun updateTodayPrompt(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val snapshot = GlsoopWidgetStore.readJson(context, TODAY_PROMPT_KEY)
    for (appWidgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.glsoop_widget_today_prompt)
      val day = snapshot?.optInt("day")?.takeIf { it > 0 }
      val title = snapshot?.optString("title")?.takeIf { it.isNotBlank() }
        ?: "앱에서 오늘의 글감을 확인해 주세요"
      val body = snapshot?.optString("body")?.takeIf { it.isNotBlank() }
        ?: "글숲에서 조용히 한 문장을 시작해보세요."
      val deepLink = snapshot?.optString("deepLink")?.takeIf { it.isNotBlank() }
        ?: "glsoop://write"

      views.setTextViewText(R.id.glsoop_today_prompt_label, day?.let { it.toString() + "일차" } ?: "오늘")
      views.setTextViewText(R.id.glsoop_today_prompt_title, title)
      views.setTextViewText(R.id.glsoop_today_prompt_body, body)
      views.setOnClickPendingIntent(
        R.id.glsoop_today_prompt_root,
        buildDeepLinkIntent(context, deepLink, appWidgetId)
      )
      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }

  fun updateSentenceFrame(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    val snapshot = GlsoopWidgetStore.readJson(context, SENTENCE_FRAME_KEY)
    for (appWidgetId in appWidgetIds) {
      updateSentenceFrameFallback(context, appWidgetManager, appWidgetId, snapshot)

      val active = snapshot?.optString("premiumStatus") == "active"
      val imageUrl = snapshot?.optString("imageUrl")?.takeIf { it.isNotBlank() }
      if (!active || imageUrl == null) continue

      imageExecutor.execute {
        val bitmap = downloadBitmap(imageUrl)
        if (bitmap == null) {
          updateSentenceFrameFallback(context, appWidgetManager, appWidgetId, snapshot)
          return@execute
        }

        val views = RemoteViews(context.packageName, R.layout.glsoop_widget_sentence_frame)
        val deepLink = snapshot.optString("deepLink").takeIf { it.isNotBlank() }
          ?: "glsoop://posts/" + snapshot.optString("postId")
        views.setViewVisibility(R.id.glsoop_sentence_frame_image, View.VISIBLE)
        views.setViewVisibility(R.id.glsoop_sentence_frame_fallback, View.GONE)
        views.setImageViewBitmap(R.id.glsoop_sentence_frame_image, bitmap)
        views.setOnClickPendingIntent(
          R.id.glsoop_sentence_frame_root,
          buildDeepLinkIntent(context, deepLink, appWidgetId + 10000)
        )
        appWidgetManager.updateAppWidget(appWidgetId, views)
      }
    }
  }

  private fun updateSentenceFrameFallback(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    snapshot: JSONObject?
  ) {
    val active = snapshot?.optString("premiumStatus") == "active"
    val title = snapshot?.optString("title")?.takeIf { it.isNotBlank() }
      ?: "북마크에서 직접 고른 글만 보여줘요."
    val author = snapshot?.optString("authorName")?.takeIf { it.isNotBlank() }
      ?: "앱에서 선택하기"
    val message = if (active) {
      "앱에서 선택한 글 사진을 불러오고 있어요"
    } else {
      "문장 액자는 프리미엄에서 사용할 수 있어요"
    }
    val deepLink = if (active) {
      snapshot?.optString("deepLink")?.takeIf { it.isNotBlank() } ?: "glsoop://"
    } else {
      "glsoop://premium"
    }

    val views = RemoteViews(context.packageName, R.layout.glsoop_widget_sentence_frame)
    views.setViewVisibility(R.id.glsoop_sentence_frame_image, View.GONE)
    views.setViewVisibility(R.id.glsoop_sentence_frame_fallback, View.VISIBLE)
    views.setTextViewText(R.id.glsoop_sentence_frame_message, message)
    views.setTextViewText(R.id.glsoop_sentence_frame_title, title)
    views.setTextViewText(R.id.glsoop_sentence_frame_author, author)
    views.setOnClickPendingIntent(
      R.id.glsoop_sentence_frame_root,
      buildDeepLinkIntent(context, deepLink, appWidgetId + 10000)
    )
    appWidgetManager.updateAppWidget(appWidgetId, views)
  }

  private fun buildDeepLinkIntent(context: Context, deepLink: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
      addCategory(Intent.CATEGORY_BROWSABLE)
      setPackage(context.packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_IMMUTABLE
    } else {
      0
    }
    return PendingIntent.getActivity(context, requestCode, intent, flags)
  }

  private fun downloadBitmap(imageUrl: String): android.graphics.Bitmap? {
    return try {
      val connection = (URL(imageUrl).openConnection() as HttpURLConnection).apply {
        connectTimeout = 8000
        readTimeout = 8000
        instanceFollowRedirects = true
      }
      connection.inputStream.use { stream ->
        decodeWidgetBitmap(stream.readBytes())
      }
    } catch (error: Throwable) {
      Log.w(TAG, "Failed to download sentence frame image", error)
      null
    }
  }

  private fun decodeWidgetBitmap(bytes: ByteArray): Bitmap? {
    if (bytes.isEmpty()) return null

    val bounds = BitmapFactory.Options().apply {
      inJustDecodeBounds = true
    }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)

    var sampleSize = 1
    while (
      bounds.outWidth / sampleSize > MAX_WIDGET_IMAGE_EDGE_PX ||
      bounds.outHeight / sampleSize > MAX_WIDGET_IMAGE_EDGE_PX
    ) {
      sampleSize *= 2
    }

    val decoded = BitmapFactory.decodeByteArray(
      bytes,
      0,
      bytes.size,
      BitmapFactory.Options().apply {
        inSampleSize = sampleSize
      }
    ) ?: return null

    val longestEdge = maxOf(decoded.width, decoded.height)
    if (longestEdge <= MAX_WIDGET_IMAGE_EDGE_PX) return decoded

    val scale = MAX_WIDGET_IMAGE_EDGE_PX.toFloat() / longestEdge.toFloat()
    val targetWidth = maxOf(1, (decoded.width * scale).toInt())
    val targetHeight = maxOf(1, (decoded.height * scale).toInt())
    val scaled = Bitmap.createScaledBitmap(decoded, targetWidth, targetHeight, true)
    if (scaled != decoded) decoded.recycle()
    return scaled
  }
}
`;
}

function createTodayPromptWidgetLayoutXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/glsoop_today_prompt_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@drawable/glsoop_widget_background"
  android:orientation="vertical"
  android:padding="16dp">

  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:gravity="center_vertical"
    android:orientation="horizontal">

    <TextView
      android:id="@+id/glsoop_today_prompt_label"
      android:layout_width="0dp"
      android:layout_height="wrap_content"
      android:layout_weight="1"
      android:fontFamily="sans"
      android:text="오늘"
      android:textColor="#476B52"
      android:textSize="12sp"
      android:textStyle="bold" />

    <TextView
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:fontFamily="sans"
      android:text="글숲"
      android:textColor="#476B52"
      android:textSize="12sp"
      android:textStyle="bold" />
  </LinearLayout>

  <Space
    android:layout_width="match_parent"
    android:layout_height="0dp"
    android:layout_weight="1" />

  <TextView
    android:id="@+id/glsoop_today_prompt_title"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:ellipsize="end"
    android:fontFamily="sans"
    android:maxLines="3"
    android:text="앱에서 오늘의 글감을 확인해 주세요"
    android:textColor="#1F2924"
    android:textSize="18sp"
    android:textStyle="bold" />

  <TextView
    android:id="@+id/glsoop_today_prompt_body"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="8dp"
    android:ellipsize="end"
    android:fontFamily="sans"
    android:maxLines="2"
    android:text="글숲에서 조용히 한 문장을 시작해보세요."
    android:textColor="#606D63"
    android:textSize="13sp" />

  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="14dp"
    android:fontFamily="sans"
    android:text="이 주제로 쓰기"
    android:textColor="#4D805E"
    android:textSize="12sp"
    android:textStyle="bold" />
</LinearLayout>
`;
}

function createSentenceFrameWidgetLayoutXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/glsoop_sentence_frame_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@android:color/transparent"
  android:padding="0dp">

  <ImageView
    android:id="@+id/glsoop_sentence_frame_image"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:adjustViewBounds="true"
    android:contentDescription="문장 액자 글 사진"
    android:scaleType="centerCrop"
    android:visibility="gone" />

  <LinearLayout
    android:id="@+id/glsoop_sentence_frame_fallback"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/glsoop_widget_background"
    android:orientation="vertical"
    android:padding="10dp"
    android:visibility="visible">

    <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:gravity="center_vertical"
      android:orientation="horizontal">

      <TextView
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:fontFamily="sans"
        android:text="문장 액자"
        android:textColor="#476B52"
        android:textSize="12sp"
        android:textStyle="bold" />

      <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:fontFamily="sans"
        android:text="글숲"
        android:textColor="#476B52"
        android:textSize="12sp"
        android:textStyle="bold" />
    </LinearLayout>

    <Space
      android:layout_width="match_parent"
      android:layout_height="0dp"
      android:layout_weight="1" />

    <TextView
      android:id="@+id/glsoop_sentence_frame_message"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:ellipsize="end"
      android:fontFamily="sans"
      android:maxLines="4"
      android:text="문장 액자는 프리미엄에서 사용할 수 있어요"
      android:textColor="#1F2924"
      android:textSize="18sp"
      android:textStyle="bold" />

    <TextView
      android:id="@+id/glsoop_sentence_frame_title"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:layout_marginTop="10dp"
      android:ellipsize="end"
      android:fontFamily="sans"
      android:maxLines="2"
      android:text="북마크에서 직접 고른 글만 보여줘요."
      android:textColor="#606D63"
      android:textSize="13sp" />

    <Space
      android:layout_width="match_parent"
      android:layout_height="0dp"
      android:layout_weight="1" />

    <TextView
      android:id="@+id/glsoop_sentence_frame_author"
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:fontFamily="sans"
      android:text="앱에서 선택하기"
      android:textColor="#4D805E"
      android:textSize="12sp"
      android:textStyle="bold" />
  </LinearLayout>
</FrameLayout>
`;
}

function createTodayPromptWidgetInfoXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:description="@string/app_name"
  android:initialLayout="@layout/glsoop_widget_today_prompt"
  android:minWidth="180dp"
  android:minHeight="110dp"
  android:previewLayout="@layout/glsoop_widget_today_prompt"
  android:resizeMode="horizontal|vertical"
  android:targetCellWidth="3"
  android:targetCellHeight="2"
  android:updatePeriodMillis="1800000"
  android:widgetCategory="home_screen" />
`;
}

function createSentenceFrameWidgetInfoXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:description="@string/app_name"
  android:initialLayout="@layout/glsoop_widget_sentence_frame"
  android:minWidth="250dp"
  android:minHeight="250dp"
  android:previewLayout="@layout/glsoop_widget_sentence_frame"
  android:resizeMode="horizontal|vertical"
  android:targetCellWidth="4"
  android:targetCellHeight="4"
  android:updatePeriodMillis="1800000"
  android:widgetCategory="home_screen" />
`;
}

function createAndroidWidgetBackgroundXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
  android:shape="rectangle">
  <solid android:color="#fffdf8" />
  <corners android:radius="20dp" />
</shape>
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
      patchPodfileForResourceBundleSigning(nextConfig.modRequest.platformProjectRoot);
      return nextConfig;
    },
  ]);

  config = withAndroidManifest(config, (nextConfig) => {
    ensureAndroidWidgetReceivers(nextConfig.modResults);
    return nextConfig;
  });

  config = withDangerousMod(config, [
    "android",
    (nextConfig) => {
      writeAndroidFiles(nextConfig.modRequest.platformProjectRoot, resolvedOptions);
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
