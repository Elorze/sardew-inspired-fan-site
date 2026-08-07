import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabase-client.mjs";

const sessionCookieName = "zz_account_session";
const sessionLifetimeSeconds = 30 * 24 * 60 * 60;
const sessionLifetimeMs = sessionLifetimeSeconds * 1000;
const progressTable = "zz_account_progress";
const tokenTable = "zz_account_tokens";

const env = (name) => String(process.env[name] || "").trim();
const nowIso = () => new Date().toISOString();
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const hashToken = (value) =>
  createHash("sha256").update(String(value)).digest("base64url");

const getSupabaseAnonClient = () => {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_ANON_KEY") || env("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED_AUTH");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
};

const sendSupabaseConfigError = (response, feature = "账号") => {
  sendJson(response, 503, {
    code: "SUPABASE_NOT_CONFIGURED",
    message: `Vercel ${feature}服务还没有配置 Supabase 环境变量。请检查 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY，以及 SUPABASE_ANON_KEY 或 SUPABASE_PUBLISHABLE_KEY。`,
  });
};

const isBackendAvailabilityError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("supabase_not_configured") ||
    message.includes("invalid url") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("permission denied") ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("network error")
  );
};

const parseCookies = (request) => {
  const cookies = {};
  for (const part of String(request.headers.cookie || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
};

const readBody = async (request) => {
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }
};

const sendJson = (response, status, payload) => {
  if (typeof response.status === "function" && typeof response.json === "function") {
    response.status(status).json(payload);
    return;
  }
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const isProductionRequest = (request) =>
  process.env.NODE_ENV === "production" ||
  String(request.headers["x-forwarded-proto"] || "").split(",")[0] === "https";

const setSessionCookie = (request, response, value, maxAge = sessionLifetimeSeconds) => {
  const attributes = [
    `${sessionCookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isProductionRequest(request)) attributes.push("Secure");
  response.setHeader("Set-Cookie", attributes.join("; "));
};

const readUser = async (userId) => {
  const supabase = getSupabaseAdminClient();
  const [{ data: user, error: userError }, { data: progress, error: progressError }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, name, display_name, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from(progressTable)
      .select("forum_points, forum_check_in_streak, forum_last_check_in_date, forum_water_count, forum_last_water_date, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (userError) throw userError;
  if (progressError) throw progressError;

  let profile = user;
  if (!profile) {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError) throw authError;
    if (!authUser?.user) return null;
    const fallbackName = String(
      authUser.user.user_metadata?.nickname ||
        authUser.user.user_metadata?.name ||
        authUser.user.email?.split("@")[0] ||
        "无名旅人",
    ).trim() || "无名旅人";
    profile = {
      id: authUser.user.id,
      email: authUser.user.email,
      name: fallbackName,
      display_name: fallbackName,
      updated_at: authUser.user.updated_at || authUser.user.created_at || nowIso(),
    };
  }

  const nickname = String(profile.display_name || profile.name || "无名旅人").trim() || "无名旅人";
  const points = Number(progress?.forum_points || 0);
  return {
    id: profile.id,
    email: profile.email,
    nickname,
    level: "LV.1 发芽",
    points: Number.isFinite(points) && points >= 0 ? points : 0,
    createdAt: profile.updated_at || nowIso(),
    updatedAt: profile.updated_at || progress?.updated_at || nowIso(),
    forumPoints: Number.isFinite(points) && points >= 0 ? points : 0,
    forumCheckInStreak: Number(progress?.forum_check_in_streak || 0),
    forumLastCheckInDate: progress?.forum_last_check_in_date || null,
    forumWaterCount: Number(progress?.forum_water_count || 0),
    forumLastWaterDate: progress?.forum_last_water_date || null,
    status: "active",
  };
};

const upsertProfile = async ({ id, email, nickname }) => {
  const supabase = getSupabaseAdminClient();
  const displayName = String(nickname || "").trim();
  const name = displayName || email.split("@")[0] || "无名旅人";
  const { error } = await supabase.from("users").upsert(
    {
      id,
      email,
      name,
      display_name: displayName || name,
      gender: "neutral",
      location_label: "远方",
      coords: null,
      invite_code: "",
      updated_at: nowIso(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  const { error: progressError } = await supabase.from(progressTable).upsert(
    { user_id: id, updated_at: nowIso() },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (progressError) throw progressError;
};

const createSession = async (request, response, userId) => {
  const rawToken = randomBytes(32).toString("base64url");
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(tokenTable).insert({
    token_hash: hashToken(rawToken),
    kind: "session",
    user_id: userId,
    created_at: nowIso(),
    last_seen_at: nowIso(),
    expires_at: new Date(Date.now() + sessionLifetimeMs).toISOString(),
    user_agent: String(request.headers["user-agent"] || "").slice(0, 180),
  });
  if (error) throw error;
  setSessionCookie(request, response, rawToken);
};

const readSession = async (request) => {
  const rawToken = parseCookies(request)[sessionCookieName];
  if (!rawToken) return null;
  const supabase = getSupabaseAdminClient();
  const { data: session, error } = await supabase
    .from(tokenTable)
    .select("token_hash, user_id, expires_at")
    .eq("kind", "session")
    .eq("token_hash", hashToken(rawToken))
    .gt("expires_at", nowIso())
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;
  const account = await readUser(session.user_id);
  if (!account) return null;
  return { ...session, rawToken, account };
};

const requireSession = async (request, response) => {
  const session = await readSession(request);
  if (session) return session;
  sendJson(response, 401, { code: "LOGIN_REQUIRED", message: "请先登录种种账号。" });
  return null;
};

const validateCredentials = (body) => {
  const email = normalizeEmail(body.email);
  const password = body.password;
  const nickname = String(body.nickname || "").trim();
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "INVALID_EMAIL", message: "请填写有效的邮箱地址。" };
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { error: "INVALID_PASSWORD", message: "密码需要 8 至 128 位。" };
  }
  return { email, password, nickname };
};

const signIn = async (email, password) => {
  const client = getSupabaseAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, message: error?.message || "邮箱或密码不正确。" };
  }
  return { ok: true, user: data.user };
};

const handleRegister = async (request, response) => {
  try {
    const body = await readBody(request);
    const credentials = validateCredentials(body);
    if (credentials.error) {
      sendJson(response, 400, { code: credentials.error, message: credentials.message });
      return;
    }
    if ([...(credentials.nickname || "")].length < 2 || [...(credentials.nickname || "")].length > 16) {
      sendJson(response, 400, { code: "INVALID_NICKNAME", message: "名字需要 2 至 16 个字。" });
      return;
    }

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: { nickname: credentials.nickname },
    });
    if (error) {
      sendJson(response, 409, { code: "REGISTER_FAILED", message: error.message || "注册失败。" });
      return;
    }
    const user = data.user;
    await upsertProfile({ id: user.id, email: credentials.email, nickname: credentials.nickname });
    await ensureUserProfile(user.id);
    const login = await signIn(credentials.email, credentials.password);
    if (!login.ok) {
      sendJson(response, 201, { account: await readUser(user.id) });
      return;
    }
    await createSession(request, response, user.id);
    sendJson(response, 201, { account: await readUser(user.id) });
  } catch (error) {
    if (error.message === "REQUEST_TOO_LARGE") {
      sendJson(response, 413, { code: "REQUEST_TOO_LARGE", message: "请求内容过大。" });
      return;
    }
    if (error.message === "INVALID_JSON") {
      sendJson(response, 400, { code: "INVALID_JSON", message: "请求内容格式不正确。" });
      return;
    }
    if (error.message === "SUPABASE_NOT_CONFIGURED" || error.message === "SUPABASE_NOT_CONFIGURED_AUTH" || isBackendAvailabilityError(error) || process.env.VERCEL) {
      sendSupabaseConfigError(response, "注册");
      return;
    }
    throw error;
  }
};

const handleLogin = async (request, response) => {
  try {
    const body = await readBody(request);
    const credentials = validateCredentials(body);
    if (credentials.error) {
      sendJson(response, 400, { code: credentials.error, message: credentials.message });
      return;
    }
    const result = await signIn(credentials.email, credentials.password);
    if (!result.ok) {
      sendJson(response, 401, { code: "INVALID_CREDENTIALS", message: "邮箱或密码不正确。" });
      return;
    }
    await upsertProfile({ id: result.user.id, email: credentials.email, nickname: credentials.nickname });
    await ensureUserProfile(result.user.id);
    await createSession(request, response, result.user.id);
    sendJson(response, 200, { account: await readUser(result.user.id) });
  } catch (error) {
    if (error.message === "REQUEST_TOO_LARGE") {
      sendJson(response, 413, { code: "REQUEST_TOO_LARGE", message: "请求内容过大。" });
      return;
    }
    if (error.message === "INVALID_JSON") {
      sendJson(response, 400, { code: "INVALID_JSON", message: "请求内容格式不正确。" });
      return;
    }
    if (error.message === "SUPABASE_NOT_CONFIGURED" || error.message === "SUPABASE_NOT_CONFIGURED_AUTH" || isBackendAvailabilityError(error) || process.env.VERCEL) {
      sendSupabaseConfigError(response, "登录");
      return;
    }
    throw error;
  }
};

const chinaDateKey = () =>
  new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

const readProgress = async (userId) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(progressTable)
    .select("forum_points, forum_check_in_streak, forum_last_check_in_date, forum_water_count, forum_last_water_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || {};
};

const ensureUserProfile = async (userId) => {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return;

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError) throw authError;
  const email = authUser?.user?.email;
  if (!email) throw new Error("MISSING_AUTH_USER");
  const fallbackName = String(
    authUser.user.user_metadata?.nickname ||
      authUser.user.user_metadata?.name ||
      email.split("@")[0] ||
      "无名旅人",
  ).trim() || "无名旅人";
  const { error: insertError } = await supabase.from("users").insert({
    id: userId,
    email,
    name: fallbackName,
    display_name: fallbackName,
    gender: "neutral",
    location_label: "远方",
    coords: null,
    invite_code: "",
    updated_at: nowIso(),
  });
  if (insertError) throw insertError;
};

const updateProgress = async (userId, values) => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from(progressTable)
    .upsert({ user_id: userId, ...values, updated_at: nowIso() }, { onConflict: "user_id" });
  if (error) throw error;
};

const sendRewardStatus = (response, progress, awarded = 0, newlyUnlocked = false) => {
  const points = Number(progress.forum_points || 0);
  const waterCount = Number(progress.forum_water_count || 0);
  sendJson(response, 200, {
    points,
    streak: Number(progress.forum_check_in_streak || 0),
    checkedInToday: progress.forum_last_check_in_date === chinaDateKey(),
    lastCheckInDate: progress.forum_last_check_in_date || null,
    wateredToday: progress.forum_last_water_date === chinaDateKey(),
    waterCount,
    waterAchievement: {
      id: "morning-dew-gardener",
      title: "晨露园丁",
      progress: Math.min(waterCount, 3),
      target: 3,
      unlocked: waterCount >= 3,
      newlyUnlocked,
    },
    awarded,
  });
};

export const createVercelAccountService = () => ({
  applyCors: () => false,
  health: () => ({ ready: true, clientCount: 0 }),
  handle: async (request, response, pathname) => {
    if (!pathname.startsWith("/api/auth/")) return false;
    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Origin", request.headers.origin || "");
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
      if (typeof response.status === "function") {
        response.status(204).end();
      } else {
        response.writeHead(204);
        response.end();
      }
      return true;
    }
    if (request.method === "GET" && pathname === "/api/auth/session") {
      const session = await readSession(request);
      sendJson(response, 200, { account: session?.account || null });
      return true;
    }
    if (request.method === "POST" && pathname === "/api/auth/register") {
      await handleRegister(request, response);
      return true;
    }
    if (request.method === "POST" && pathname === "/api/auth/login") {
      await handleLogin(request, response);
      return true;
    }
    if (request.method === "POST" && pathname === "/api/auth/logout") {
      const rawToken = parseCookies(request)[sessionCookieName];
      if (rawToken) {
        const supabase = getSupabaseAdminClient();
        await supabase.from(tokenTable).delete().eq("kind", "session").eq("token_hash", hashToken(rawToken));
      }
      setSessionCookie(request, response, "", 0);
      sendJson(response, 200, { account: null });
      return true;
    }
    if (request.method === "POST" && pathname === "/api/auth/logout-all") {
      const session = await requireSession(request, response);
      if (!session) return true;
      const supabase = getSupabaseAdminClient();
      await supabase.from(tokenTable).delete().eq("kind", "session").eq("user_id", session.account.id);
      setSessionCookie(request, response, "", 0);
      sendJson(response, 200, { account: null });
      return true;
    }
    if (request.method === "PATCH" && pathname === "/api/auth/profile") {
      const session = await requireSession(request, response);
      if (!session) return true;
      const body = await readBody(request);
      const nickname = String(body.nickname || "").trim();
      if ([...nickname].length < 2 || [...nickname].length > 16) {
        sendJson(response, 400, { code: "INVALID_NICKNAME", message: "名字需要 2 至 16 个字。" });
        return true;
      }
      await upsertProfile({ id: session.account.id, email: session.account.email, nickname });
      sendJson(response, 200, { account: await readUser(session.account.id) });
      return true;
    }
    if (request.method === "GET" && pathname === "/api/auth/forum-points") {
      const session = await requireSession(request, response);
      if (!session) return true;
      sendRewardStatus(response, await readProgress(session.account.id));
      return true;
    }
    if (request.method === "POST" && pathname === "/api/auth/forum-check-in") {
      const session = await requireSession(request, response);
      if (!session) return true;
      const progress = await readProgress(session.account.id);
      const today = chinaDateKey();
      if (progress.forum_last_check_in_date !== today) {
        const lastDate = progress.forum_last_check_in_date;
        const yesterday = new Date(`${today}T00:00:00.000Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const nextStreak = lastDate === yesterday.toISOString().slice(0, 10)
          ? Number(progress.forum_check_in_streak || 0) + 1
          : 1;
        await updateProgress(session.account.id, {
          forum_points: Number(progress.forum_points || 0) + 10,
          forum_check_in_streak: nextStreak,
          forum_last_check_in_date: today,
        });
        sendRewardStatus(response, { ...progress, forum_points: Number(progress.forum_points || 0) + 10, forum_check_in_streak: nextStreak, forum_last_check_in_date: today }, 10);
      } else {
        sendRewardStatus(response, progress);
      }
      return true;
    }
    if (request.method === "POST" && pathname === "/api/auth/forum-water") {
      const session = await requireSession(request, response);
      if (!session) return true;
      const progress = await readProgress(session.account.id);
      const today = chinaDateKey();
      if (progress.forum_last_water_date !== today) {
        const nextCount = Number(progress.forum_water_count || 0) + 1;
        await updateProgress(session.account.id, {
          forum_points: Number(progress.forum_points || 0) + 3,
          forum_water_count: nextCount,
          forum_last_water_date: today,
        });
        sendRewardStatus(response, { ...progress, forum_points: Number(progress.forum_points || 0) + 3, forum_water_count: nextCount, forum_last_water_date: today }, 3, nextCount >= 3 && Number(progress.forum_water_count || 0) < 3);
      } else {
        sendRewardStatus(response, progress);
      }
      return true;
    }
    if (request.method === "GET" && pathname === "/api/auth/sessions") {
      const session = await requireSession(request, response);
      if (!session) return true;
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from(tokenTable)
        .select("token_hash, created_at, expires_at, user_agent")
        .eq("kind", "session")
        .eq("user_id", session.account.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      sendJson(response, 200, {
        sessions: (data || []).map((item) => ({
          id: item.token_hash.slice(0, 16),
          current: item.token_hash === hashToken(session.rawToken),
          createdAt: item.created_at,
          expiresAt: item.expires_at,
          userAgent: item.user_agent || "",
        })),
      });
      return true;
    }
    sendJson(response, 404, { code: "AUTH_ENDPOINT_NOT_FOUND", message: "没有找到这个账号接口。" });
    return true;
  },
  getBrowserAccount: async (request) => (await readSession(request))?.account || null,
});
