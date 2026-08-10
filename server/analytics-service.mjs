import { createHash, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getSupabaseAdminClient } from "./supabase-client.mjs";

const visitorCookieName = "zz_visitor";
const visitorLifetimeSeconds = 365 * 24 * 60 * 60;

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

export const normalizePageKey = (value) => {
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

const appendSetCookie = (response, cookie) => {
  if (!response) return;
  if (typeof response.appendHeader === "function") {
    response.appendHeader("Set-Cookie", cookie);
    return;
  }
  const existing = response.getHeader?.("Set-Cookie");
  if (!existing) {
    response.setHeader("Set-Cookie", cookie);
    return;
  }
  const cookies = Array.isArray(existing) ? existing : [String(existing)];
  response.setHeader("Set-Cookie", [...cookies, cookie]);
};

const resolveVisitor = (request, response) => {
  const existing = parseCookies(request)[visitorCookieName];
  const visitorId = /^[A-Za-z0-9_-]{24,128}$/.test(existing || "")
    ? existing
    : randomBytes(24).toString("base64url");
  if (visitorId !== existing) {
    const secure =
      request.headers["x-forwarded-proto"] === "https" ||
      Boolean(request.socket?.encrypted);
    appendSetCookie(response, createVisitorCookie(visitorId, secure));
  }
  return visitorHash(visitorId);
};

const shouldUseSupabase = () => {
  const backend = String(process.env.ANALYTICS_BACKEND || "")
    .trim()
    .toLowerCase();
  if (backend === "sqlite") return false;
  if (backend === "supabase") return true;
  return Boolean(
    String(process.env.SUPABASE_URL || "").trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  );
};

const createSqliteAnalyticsService = async ({
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
    database
      .prepare(
        `
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
    `,
      )
      .get(pageKey);
  const readHeat = (pageKey, visitorHashValue) =>
    database
      .prepare(
        `
      SELECT 1 AS heated
      FROM page_heat
      WHERE page_key = ? AND visitor_hash = ?
    `,
      )
      .get(pageKey, visitorHashValue);
  const readSummary = () =>
    database
      .prepare(
        `
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
    `,
      )
      .all();

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

  return {
    backend: "sqlite",
    getStats: async (request, response, rawPageKey) => {
      const pageKey = normalizePageKey(rawPageKey);
      const hash = resolveVisitor(request, response);
      ensurePage.run(pageKey, new Date().toISOString());
      return statsFor(pageKey, hash);
    },
    recordView: async (request, response, rawPageKey) => {
      const pageKey = normalizePageKey(rawPageKey);
      const hash = resolveVisitor(request, response);
      const nowText = new Date().toISOString();
      ensurePage.run(pageKey, nowText);
      addVisitorView.run(pageKey, hash, nowText, nowText);
      incrementViews.run(nowText, pageKey);
      return { ...statsFor(pageKey, hash), counted: true };
    },
    stampHeat: async (request, response, rawPageKey) => {
      const pageKey = normalizePageKey(rawPageKey);
      const hash = resolveVisitor(request, response);
      const nowText = new Date().toISOString();
      ensurePage.run(pageKey, nowText);
      const result = addHeat.run(pageKey, hash, nowText);
      const awarded = result.changes > 0;
      if (awarded) incrementHeat.run(nowText, pageKey);
      return { ...statsFor(pageKey, hash), awarded };
    },
    summary: async () =>
      readSummary().map((row) => ({
        pageKey: row.pageKey,
        views: Number(row.views),
        visitors: Number(row.visitors),
        heat: Number(row.heat),
      })),
  };
};

const mapEngagementRow = (row = {}) => ({
  pageKey: row.page_key || row.pageKey || "",
  views: Number(row.views || 0),
  visitors: Number(row.visitors || 0),
  heat: Number(row.heat || 0),
  heated: Boolean(row.heated),
});

const createSupabaseAnalyticsService = () => {
  const supabase = getSupabaseAdminClient();

  const callRpc = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return {
        pageKey: args.target_page_key,
        views: 0,
        visitors: 0,
        heat: 0,
        heated: false,
      };
    }
    return mapEngagementRow(row);
  };

  return {
    backend: "supabase",
    getStats: async (request, response, rawPageKey) => {
      const pageKey = normalizePageKey(rawPageKey);
      const hash = resolveVisitor(request, response);
      return callRpc("zz_get_page_engagement", {
        target_page_key: pageKey,
        target_visitor_hash: hash,
      });
    },
    recordView: async (request, response, rawPageKey) => {
      const pageKey = normalizePageKey(rawPageKey);
      const hash = resolveVisitor(request, response);
      const stats = await callRpc("zz_record_page_view", {
        target_page_key: pageKey,
        target_visitor_hash: hash,
      });
      return { ...stats, counted: true };
    },
    stampHeat: async (request, response, rawPageKey) => {
      const pageKey = normalizePageKey(rawPageKey);
      const hash = resolveVisitor(request, response);
      const { data, error } = await supabase.rpc("zz_stamp_page_heat", {
        target_page_key: pageKey,
        target_visitor_hash: hash,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        ...mapEngagementRow(row),
        awarded: Boolean(row?.awarded),
      };
    },
    summary: async () => {
      const { data: pages, error } = await supabase
        .from("zz_page_stats")
        .select("page_key, views, heat")
        .order("views", { ascending: false });
      if (error) throw error;
      const { data: visitorRows, error: visitorError } = await supabase
        .from("zz_page_visitors")
        .select("page_key");
      if (visitorError) throw visitorError;
      const visitorCounts = new Map();
      for (const row of visitorRows || []) {
        visitorCounts.set(
          row.page_key,
          (visitorCounts.get(row.page_key) || 0) + 1,
        );
      }
      return (pages || []).map((row) => ({
        pageKey: row.page_key,
        views: Number(row.views || 0),
        visitors: visitorCounts.get(row.page_key) || 0,
        heat: Number(row.heat || 0),
      }));
    },
  };
};

export const createAnalyticsService = async (options = {}) => {
  if (shouldUseSupabase()) {
    try {
      return createSupabaseAnalyticsService();
    } catch (error) {
      if (error.message !== "SUPABASE_NOT_CONFIGURED") throw error;
    }
  }
  return createSqliteAnalyticsService(options);
};
