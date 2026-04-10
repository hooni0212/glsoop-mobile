import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const APP_URL = process.env.SCREENSHOT_APP_URL || "http://127.0.0.1:8081";
const API_BASE = process.env.SCREENSHOT_API_BASE || "http://127.0.0.1:3000";
const USE_LIVE_PUBLIC = process.env.SCREENSHOT_USE_LIVE_PUBLIC === "true";
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.SCREENSHOT_OUTPUT_DIR || "docs/release/screenshots/ios-1284x2778"
);

const VIEWPORT = {
  width: Number(process.env.SCREENSHOT_VIEWPORT_WIDTH || 428),
  height: Number(process.env.SCREENSHOT_VIEWPORT_HEIGHT || 926),
};
const DEVICE_SCALE_FACTOR = Number(process.env.SCREENSHOT_DEVICE_SCALE_FACTOR || 3);
const TOKEN_KEY = "glsoop_auth_token_v1";
const TOKEN_VALUE = "screenshot-token";

const meResponse = {
  ok: true,
  id: 7,
  name: "김태훈",
  nickname: "태훈",
  email: "taehun@glsoop.com",
  bio: "문장을 모으고, 취향을 기록하는 사람",
  about:
    "매일 조금씩 읽고 쓰는 사람들을 위한 공간, 글숲에서 조용히 오래 남는 글을 만들고 있어요.",
  level: 12,
  xp: 1840,
  streak_days: 21,
  max_streak_days: 30,
  follower_count: 128,
  following_count: 42,
  is_verified: true,
};

const growthSummary = {
  level: 12,
  current_xp: 1840,
  next_level_xp: 2200,
  today_xp: 120,
  weekly_posts: 5,
  streak_days: 21,
  max_streak_days: 30,
  title: "초록 기록자",
};

const achievements = [
  {
    id: 1,
    code: "daily_writer_7",
    name: "7일 연속 기록",
    description: "7일 동안 매일 글을 남겨보세요.",
    category: "habit",
    status: "completed",
    progress: 7,
    target: 7,
    unlocked_at: "2026-03-20T12:00:00.000Z",
    position_index: 1,
    icon: "🌿",
  },
  {
    id: 2,
    code: "first_100_likes",
    name: "공감 100",
    description: "누적 공감 100개를 달성해보세요.",
    category: "community",
    status: "in_progress",
    progress: 82,
    target: 100,
    unlocked_at: null,
    position_index: 2,
    icon: "✨",
  },
  {
    id: 3,
    code: "essay_master",
    name: "에세이 애호가",
    description: "에세이 10편을 완성해보세요.",
    category: "writing",
    status: "locked",
    progress: 3,
    target: 10,
    unlocked_at: null,
    position_index: 3,
    icon: "🪶",
  },
];

const topPosts = [
  {
    id: "1001",
    title: "비 오는 오후의 문장",
    excerpt: "젖은 창가에 기대어 오늘의 마음을 천천히 적어 내려갔다.",
    author_name: "태훈",
    category: "essay",
    created_at: "2026-03-25T09:30:00.000Z",
    like_count: 128,
    bookmark_count: 47,
    user_liked: true,
    user_bookmarked: true,
    tags: ["감정", "기록"],
  },
  {
    id: "1002",
    title: "초록빛 밤산책",
    excerpt: "풀냄새가 남은 골목을 지나며 오래된 생각을 털어냈다.",
    author_name: "글숲",
    category: "poem",
    created_at: "2026-03-24T20:10:00.000Z",
    like_count: 76,
    bookmark_count: 23,
    user_liked: false,
    user_bookmarked: false,
    tags: ["산책", "밤"],
  },
  {
    id: "1003",
    title: "하루의 끝에서",
    excerpt: "서둘러 지나간 하루 끝에 남은 문장을 가만히 들여다본다.",
    author_name: "태훈",
    category: "short",
    created_at: "2026-03-23T18:00:00.000Z",
    like_count: 52,
    bookmark_count: 19,
    user_liked: false,
    user_bookmarked: true,
    tags: ["회고"],
  },
];

const postDetail = {
  ok: true,
  post: {
    id: "1001",
    title: "비 오는 오후의 문장",
    content:
      "비 냄새가 가득한 오후였다.\n\n한 문장을 붙잡고 오래 앉아 있으니, 지나간 시간들이 천천히 현재형으로 돌아왔다.\n\n오늘은 조용한 기분을 끝까지 놓치지 않기로 했다.",
    created_at: "2026-03-25T09:30:00.000Z",
    author_name: "태훈",
    author_id: "7",
    category: "essay",
    like_count: 128,
    bookmark_count: 47,
    user_liked: true,
    user_bookmarked: true,
    tags: ["감정", "기록", "비"],
  },
};

const runtimeConfig = {
  ok: true,
  legal: {
    versions: {
      terms: "2026-03",
      privacy: "2026-03",
      guidelines: "2026-03",
    },
    effective_dates: {
      terms: "2026-03-01",
      privacy: "2026-03-01",
      guidelines: "2026-03-01",
    },
    contacts: {
      department: "글숲 운영팀",
      email: "support@glsoop.com",
      phone: "02-0000-0000",
      dpo_name: "글숲 개인정보보호책임자",
    },
  },
};

function json(body) {
  return {
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  };
}

function toLivePostSummary(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: String(raw.id ?? raw.post_id ?? ""),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "글숲",
  };
}

let livePublic = {
  postId: "1001",
  postTitle: "비 오는 오후의 문장",
};

async function loadLivePublicFixtures() {
  if (!USE_LIVE_PUBLIC) return;

  const res = await fetch(`${API_BASE}/api/posts?limit=1&sort=latest`, {
    headers: { Authorization: "Bearer screenshot-token" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load live public feed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const first = Array.isArray(data?.posts) ? data.posts[0] : null;
  const normalized = toLivePostSummary(first);
  if (!normalized?.id) {
    throw new Error("Live public feed did not return a usable post.");
  }

  livePublic = {
    postId: normalized.id,
    postTitle: normalized.title,
  };
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function installApiMocks(page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === "/api/me") {
      await route.fulfill(json(meResponse));
      return;
    }

    if (pathname === "/api/runtime-config") {
      if (USE_LIVE_PUBLIC) {
        await route.continue();
        return;
      }
      await route.fulfill(json(runtimeConfig));
      return;
    }

    if (pathname === "/api/growth/dashboard") {
      await route.fulfill(
        json({
          ok: true,
          summary: growthSummary,
          achievements,
          campaigns: [],
          top_posts: topPosts,
        })
      );
      return;
    }

    if (pathname === "/api/growth/summary") {
      await route.fulfill(json({ ok: true, summary: growthSummary }));
      return;
    }

    if (pathname === "/api/posts") {
      if (USE_LIVE_PUBLIC) {
        await route.continue();
        return;
      }
      await route.fulfill(json({ ok: true, posts: topPosts, has_more: false }));
      return;
    }

    if (pathname === `/api/posts/${livePublic.postId}`) {
      if (USE_LIVE_PUBLIC) {
        await route.continue();
        return;
      }
      await route.fulfill(json(postDetail));
      return;
    }

    if (pathname === `/api/posts/${livePublic.postId}/related`) {
      if (USE_LIVE_PUBLIC) {
        await route.continue();
        return;
      }
      await route.fulfill(json({ ok: true, posts: topPosts.slice(1) }));
      return;
    }

    if (pathname === "/api/posts/my") {
      await route.fulfill(json({ ok: true, posts: topPosts }));
      return;
    }

    if (pathname === "/api/posts/liked") {
      await route.fulfill(json({ ok: true, posts: topPosts.slice(0, 2) }));
      return;
    }

    if (pathname === "/api/me/followings") {
      await route.fulfill(
        json({
          ok: true,
          followings: [
            {
              id: "11",
              name: "초록 문장가",
              nickname: "greenwriter",
              bio: "조용한 기록을 좋아해요.",
              email: "green@glsoop.com",
              follower_count: 19,
            },
          ],
        })
      );
      return;
    }

    if (pathname === "/api/logout") {
      await route.fulfill(json({ ok: true }));
      return;
    }

    await route.fulfill(json({ ok: true }));
  });
}

async function createPage(browser, opts = {}) {
  const authenticated = opts.authenticated ?? true;
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });

  if (authenticated) {
    await context.addInitScript(([key, value]) => {
      window.localStorage.setItem(key, value);
    }, [TOKEN_KEY, TOKEN_VALUE]);
  }

  const page = await context.newPage();
  await installApiMocks(page);
  return { context, page };
}

async function captureHome(browser) {
  const { context, page } = await createPage(browser);
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.getByText(livePublic.postTitle).first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "01-home.png"),
    scale: "device",
  });
  await context.close();
}

async function captureLogin(browser) {
  const { context, page } = await createPage(browser, { authenticated: false });
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("auth-login-screen").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "02-login.png"),
    scale: "device",
  });
  await context.close();
}

async function captureWrite(browser) {
  const { context, page } = await createPage(browser);
  await page.goto(`${APP_URL}/write`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("write-title-input").waitFor();
  await page.getByTestId("write-title-input").fill("비 오는 저녁의 기록");
  await page.getByTestId("write-body-input").fill(
    "빗소리가 얇게 번지는 창가 앞에서, 오늘의 감정을 한 문장씩 눌러 적었습니다.\n\n조용한 밤이 오래 남기를 바라며."
  );
  await page.getByTestId("write-category-essay").click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "03-write.png"),
    scale: "device",
  });
  await context.close();
}

async function captureMe(browser) {
  const { context, page } = await createPage(browser);
  await page.goto(`${APP_URL}/me`, { waitUntil: "domcontentloaded" });
  await page.getByText("프로필 홈").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "04-me.png"),
    scale: "device",
  });
  await context.close();
}

async function captureGrowth(browser) {
  const { context, page } = await createPage(browser);
  await page.goto(`${APP_URL}/growth`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("growth-screen").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "05-growth.png"),
    scale: "device",
  });
  await context.close();
}

async function main() {
  await ensureOutputDir();
  await loadLivePublicFixtures();
  const browser = await chromium.launch({ headless: true });

  try {
    await captureHome(browser);
    await captureLogin(browser);
    await captureWrite(browser);
    await captureMe(browser);
    await captureGrowth(browser);
    console.log(`Saved screenshots to ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
