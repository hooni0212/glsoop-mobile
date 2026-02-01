const http = require("http");
const { URL } = require("url");

const DEMO_EMAIL = "demo@glsoop.com";
const DEMO_PW = "demo1234";
const DEMO_TOKEN = "tok_demo";

function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function handleOptions(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end();
}

function isAuthorized(req) {
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${DEMO_TOKEN}`;
}

function startMockApiServer({ port }) {
  const server = http.createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendJson(res, 400, { ok: false, message: "Bad request" });
      return;
    }

    if (req.method === "OPTIONS") {
      handleOptions(res);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readJson(req);
      const email = body?.email;
      const pw = body?.pw;
      if (email === DEMO_EMAIL && pw === DEMO_PW) {
        sendJson(res, 200, { ok: true, token: DEMO_TOKEN });
        return;
      }
      sendJson(res, 401, { ok: false, message: "이메일 또는 비밀번호가 올바르지 않아요." });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { ok: false, message: "Unauthorized" });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        id: 1,
        name: "데모",
        nickname: "데모",
        email: DEMO_EMAIL,
        bio: null,
        about: null,
        isAdmin: false,
        isVerified: true,
        level: 3,
        xp: 120,
        streak_days: 5,
        max_streak_days: 12,
        followerCount: 0,
        followingCount: 0,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/signup") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/posts") {
      sendJson(res, 200, { ok: true, posts: [], hasMore: false });
      return;
    }

    sendJson(res, 404, { ok: false, message: "Not found" });
  });

  server.listen(port, () => {
    console.log(`[mock-api] listening on http://127.0.0.1:${port}`);
  });

  return {
    server,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

module.exports = {
  startMockApiServer,
};
