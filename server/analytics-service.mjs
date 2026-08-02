import { createHash, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const visitorCookieName = "zz_visitor";
const visitorLifetimeSeconds = 365 * 24 * 60 * 60;
const viewWindowMs = 30 * 60 * 1000;

const parseCookies = (request) => {
  const cookies = {};
  for (const item of String(request.headers.cookie || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    const name = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (name) cookies[name] = value;
  }
  return cookies;
};

const visitorHash = (visitorId) =>
  createHash("sha256").update(visitorId).digest("base64url");

const normalizePageKey = (value) => {
  const pageKey = String(value || "").trim();
  if (
    pageKey.length < 1 ||
    pageKey.length > 120 ||
    !/^[a-z0-9._/?=&-]+$/i.test(pageKey)
  ) {
    throw new Error("INVALID_PAGE_KEY");
  }
  return pageKey;
};

const createVisitorCookie = (visitorId, secure) =>
  [
    `${visitorCookieName}=${visitorId}`,
    "Path=/",
    `Max-Age=${visitorLifetimeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

export const createAnalyticsService = async ({
  rootDirectory,
  dataDirectory = rootDirectory,
}) => {
  const databasePath = resolve(
    dataDirectory,
    process.env.ANALYTICS_DB_FILE || "data/site-analytics.sqlite",
  );
  await mkdir(dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS page_stats (
      page_key TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
      heat INTEGER NOT NULL DEFAULT 0 CHECK (heat >= 0),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS page_visitors (
      page_key TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count >= 1),
      PRIMARY KEY (page_key, visitor_hash),
      FOREIGN KEY (page_key) REFERENCES page_stats(page_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS page_heat (
      page_key TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (page_key, visitor_hash),
      FOREIGN KEY (page_key) REFERENCES page_stats(page_key) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS page_visitors_page_key
      ON page_visitors(page_key);
    CREATE INDEX IF NOT EXISTS page_heat_page_key
      ON page_heat(page_key);
  `);

  const ensurePage = database.prepare(`
    INSERT INTO page_stats (page_key, views, heat, updated_at)
    VALUES (?, 0, 0, ?)
    ON CONFLICT(page_key) DO UPDATE SET updated_at = excluded.updated_at
  `);
  const readVisitor = database.prepare(`
    SELECT last_seen_at
    FROM page_visitors
    WHERE page_key = ? AND visitor_hash = ?
  `);
  const addVisitorView = database.prepare(`
    INSERT INTO page_visitors (
      page_key,
      visitor_hash,
      first_seen_at,
      last_seen_at,
      view_count
    )
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(page_key, visitor_hash) DO UPDATE SET
      last_seen_at = excluded.last_seen_at,
      view_count = page_visitors.view_count + 1
  `);
  const touchVisitor = database.prepare(`
    UPDATE page_visitors
    SET last_seen_at = ?
    WHERE page_key = ? AND visitor_hash = ?
  `);
  const incrementViews = database.prepare(`
    UPDATE page_stats
    SET views = views + 1, updated_at = ?
    WHERE page_key = ?
  `);
  const addHeat = database.prepare(`
    INSERT OR IGNORE INTO page_heat (page_key, visitor_hash, created_at)
    VALUES (?, ?, ?)
  `);
  const incrementHeat = database.prepare(`
    UPDATE page_stats
    SET heat = heat + 1, updated_at = ?
    WHERE page_key = ?
  `);
  const readStats = (pageKey) =>
    database.prepare(`
      SELECT
        page_stats.page_key AS pageKey,
        page_stats.views AS views,
        page_stats.heat AS heat,
        COUNT(page_visitors.visitor_hash) AS visitors
      FROM page_stats
      LEFT JOIN page_visitors
        ON page_visitors.page_key = page_stats.page_key
      WHERE page_stats.page_key = ?
      GROUP BY page_stats.page_key
    `).get(pageKey);
  const readHeat = (pageKey, visitorHashValue) =>
    database.prepare(`
      SELECT 1 AS heated
      FROM page_heat
      WHERE page_key = ? AND visitor_hash = ?
    `).get(pageKey, visitorHashValue);
  const readSummary = () =>
    database.prepare(`
      SELECT
        page_stats.page_key AS pageKey,
        page_stats.views AS views,
        page_stats.heat AS heat,
        COUNT(page_visitors.visitor_hash) AS visitors
      FROM page_stats
      LEFT JOIN page_visitors
        ON page_visitors.page_key = page_stats.page_key
      GROUP BY page_stats.page_key
      ORDER BY page_stats.views DESC, page_stats.heat DESC, page_stats.page_key ASC
    `).all();

  const getVisitor = (request, response) => {
    const existing = parseCookies(request)[visitorCookieName];
    const visitorId = /^[A-Za-z0-9_-]{24,128}$/.test(existing || "")
      ? existing
      : randomBytes(24).toString("base64url");
    if (visitorId !== existing && response) {
      const secure =
        request.headers["x-forwarded-proto"] === "https" ||
        Boolean(request.socket.encrypted);
      response.setHeader(
        "Set-Cookie",
        createVisitorCookie(visitorId, secure),
      );
    }
    return visitorHash(visitorId);
  };

  const statsFor = (pageKey, hash) => {
    const stats = readStats(pageKey) || {
      pageKey,
      views: 0,
      visitors: 0,
      heat: 0,
    };
    return {
      pageKey: stats.pageKey,
      views: Number(stats.views),
      visitors: Number(stats.visitors),
      heat: Number(stats.heat),
      heated: Boolean(hash && readHeat(pageKey, hash)),
    };
  };

  const recordView = (request, response, rawPageKey) => {
    const pageKey = normalizePageKey(rawPageKey);
    const hash = getVisitor(request, response);
    const now = new Date();
    const nowText = now.toISOString();
    ensurePage.run(pageKey, nowText);
    const visitor = readVisitor.get(pageKey, hash);
    const lastSeenAt = visitor
      ? Date.parse(String(visitor.last_seen_at || ""))
      : Number.NaN;
    const counted =
      !Number.isFinite(lastSeenAt) || now.getTime() - lastSeenAt >= viewWindowMs;

    if (counted) {
      addVisitorView.run(pageKey, hash, nowText, nowText);
      incrementViews.run(nowText, pageKey);
    } else {
      touchVisitor.run(nowText, pageKey, hash);
    }

    return { ...statsFor(pageKey, hash), counted };
  };

  const stampHeat = (request, response, rawPageKey) => {
    const pageKey = normalizePageKey(rawPageKey);
    const hash = getVisitor(request, response);
    const nowText = new Date().toISOString();
    ensurePage.run(pageKey, nowText);
    const result = addHeat.run(pageKey, hash, nowText);
    const awarded = result.changes > 0;
    if (awarded) incrementHeat.run(nowText, pageKey);
    return { ...statsFor(pageKey, hash), awarded };
  };

  const getStats = (request, response, rawPageKey) => {
    const pageKey = normalizePageKey(rawPageKey);
    const hash = getVisitor(request, response);
    ensurePage.run(pageKey, new Date().toISOString());
    return statsFor(pageKey, hash);
  };

  const summary = () =>
    readSummary().map((row) => ({
      pageKey: row.pageKey,
      views: Number(row.views),
      visitors: Number(row.visitors),
      heat: Number(row.heat),
    }));

  return {
    getStats,
    normalizePageKey,
    recordView,
    stampHeat,
    summary,
  };
};
