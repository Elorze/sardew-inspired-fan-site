import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { createRemoteAccountService } from "./remote-account-service.mjs";

const scryptAsync = promisify(scrypt);
const sessionCookieName = "zz_account_session";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const authorizationCodeLifetimeMs = 5 * 60 * 1000;
const accessTokenLifetimeMs = 60 * 60 * 1000;

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const hashToken = (value) =>
  createHash("sha256").update(String(value)).digest("base64url");
const nowIso = () => new Date().toISOString();
const chinaTimeOffsetMs = 8 * 60 * 60 * 1000;
const chinaDateKey = (date = new Date()) =>
  new Date(date.getTime() + chinaTimeOffsetMs).toISOString().slice(0, 10);
const previousDateKey = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};
const forumPointsFor = (user) =>
  Number.isSafeInteger(user.forumPoints) && user.forumPoints >= 0
    ? user.forumPoints
    : 0;
const forumStreakFor = (user) =>
  Number.isSafeInteger(user.forumCheckInStreak) &&
  user.forumCheckInStreak >= 0
    ? user.forumCheckInStreak
    : 0;
const forumWaterCountFor = (user) =>
  Number.isSafeInteger(user.forumWaterCount) && user.forumWaterCount >= 0
    ? user.forumWaterCount
    : 0;
const forumWaterAchievement = (user, newlyUnlocked = false) => {
  const target = 3;
  const progress = Math.min(forumWaterCountFor(user), target);
  return {
    id: "morning-dew-gardener",
    title: "晨露园丁",
    progress,
    target,
    unlocked: progress >= target,
    newlyUnlocked,
  };
};
const forumRewardStatus = (
  user,
  { awarded = 0, achievementUnlocked = false } = {},
) => {
  const today = chinaDateKey();
  return {
    points: forumPointsFor(user),
    streak: forumStreakFor(user),
    checkedInToday: user.forumLastCheckInDate === today,
    lastCheckInDate: user.forumLastCheckInDate || null,
    wateredToday: user.forumLastWaterDate === today,
    waterCount: forumWaterCountFor(user),
    waterAchievement: forumWaterAchievement(user, achievementUnlocked),
    awarded,
  };
};

const isValidEmail = (email) =>
  email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidNickname = (nickname) => {
  const length = [...nickname].length;
  return length >= 2 && length <= 16;
};

const isValidPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 128;

const isValidPkceValue = (value) =>
  /^[A-Za-z0-9._~-]{43,128}$/.test(String(value || ""));

const publicAccount = (user) => ({
  id: user.id,
  email: user.email,
  nickname: user.nickname,
  level: user.level || "LV.1 发芽",
  points: forumPointsFor(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt || user.createdAt,
});

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`读取账号数据失败（${filePath}）：${error.message}`);
    }
    return fallback;
  }
};

const createJsonStore = (filePath, getValue) => {
  let queue = Promise.resolve();
  return () => {
    const operation = queue.then(async () => {
      await mkdir(dirname(filePath), { recursive: true });
      const temporaryFile = `${filePath}.${process.pid}.tmp`;
      await writeFile(
        temporaryFile,
        JSON.stringify(getValue(), null, 2),
        "utf8",
      );
      await rename(temporaryFile, filePath);
    });
    queue = operation.catch((error) => {
      console.error(`保存账号数据失败（${filePath}）：${error.message}`);
    });
    return operation;
  };
};

const parseCookies = (request) => {
  const cookies = {};
  for (const pair of String(request.headers.cookie || "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
};

const readRequestBody = async (request, limit = 64 * 1024) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const parseRequestBody = async (request) => {
  const rawBody = await readRequestBody(request);
  const contentType = String(request.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType === "application/x-www-form-urlencoded") {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
  try {
    return JSON.parse(rawBody || "{}");
  } catch {
    throw new Error("INVALID_JSON");
  }
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
};

const redirect = (response, location) => {
  response.writeHead(303, {
    "Cache-Control": "no-store",
    Location: location,
  });
  response.end();
};

const getBearerToken = (request) => {
  const authorization = String(request.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
};

const appendQuery = (target, values) => {
  const url = new URL(target);
  Object.entries(values).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const sanitizeClient = (client) => {
  const id = String(client?.id || "").trim();
  const name = String(client?.name || id).trim();
  const origins = Array.isArray(client?.origins)
    ? client.origins.map(normalizeOrigin).filter(Boolean)
    : [];
  const redirectUris = Array.isArray(client?.redirectUris)
    ? client.redirectUris.map((uri) => String(uri || "").trim()).filter(Boolean)
    : [];
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/i.test(id) || !redirectUris.length) {
    return null;
  }
  return { id, name, origins, redirectUris };
};

const loadClients = async (clientsFile) => {
  if (!existsSync(clientsFile)) return [];
  const value = await readJson(clientsFile, []);
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeClient).filter(Boolean);
};

const hashPassword = async (password, salt = randomBytes(16)) => {
  const derivedKey = await scryptAsync(password, salt, 64);
  return {
    passwordHash: Buffer.from(derivedKey).toString("base64"),
    passwordSalt: salt.toString("base64"),
  };
};

const verifyPassword = async (password, user) => {
  const salt = Buffer.from(user.passwordSalt, "base64");
  const storedHash = Buffer.from(user.passwordHash, "base64");
  const candidate = Buffer.from(await scryptAsync(password, salt, 64));
  return (
    candidate.length === storedHash.length &&
    timingSafeEqual(candidate, storedHash)
  );
};

export const createAccountService = async ({
  rootDirectory,
  dataDirectory = rootDirectory,
  env = process.env,
  localBaseUrl,
}) => {
  const usersFile = resolve(
    dataDirectory,
    env.ACCOUNT_USERS_FILE?.trim() || "data/users.json",
  );
  const stateFile = resolve(
    dataDirectory,
    env.ACCOUNT_STATE_FILE?.trim() || "data/account-state.json",
  );
  const clientsFile = resolve(
    rootDirectory,
    env.ACCOUNT_CLIENTS_FILE?.trim() || "config/account-clients.json",
  );
  const issuer = normalizeOrigin(
    env.ACCOUNT_ISSUER || env.PUBLIC_BASE_URL || localBaseUrl,
  );
  const cookieDomain = String(env.ACCOUNT_COOKIE_DOMAIN || "").trim();
  const trustProxy = env.TRUST_PROXY === "1";

  let users = await readJson(usersFile, {});
  let state = await readJson(stateFile, {
    sessions: {},
    accessTokens: {},
  });
  if (!state || typeof state !== "object") state = {};
  if (!state.sessions || typeof state.sessions !== "object") {
    state.sessions = {};
  }
  if (!state.accessTokens || typeof state.accessTokens !== "object") {
    state.accessTokens = {};
  }

  const clients = await loadClients(clientsFile);
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const remoteService = createRemoteAccountService();
  const configuredOrigins = new Set(
    String(env.ACCOUNT_ALLOWED_ORIGINS || "")
      .split(",")
      .map(normalizeOrigin)
      .filter(Boolean),
  );
  clients.forEach((client) => {
    client.origins.forEach((origin) => configuredOrigins.add(origin));
  });

  const authorizationCodes = new Map();
  const authenticationAttempts = new Map();
  const persistUsers = createJsonStore(usersFile, () => users);
  const persistState = createJsonStore(stateFile, () => state);

  const cleanupExpired = () => {
    const now = Date.now();
    let changed = false;
    for (const [key, session] of Object.entries(state.sessions)) {
      if (!session || session.expiresAt <= now) {
        delete state.sessions[key];
        changed = true;
      }
    }
    for (const [key, token] of Object.entries(state.accessTokens)) {
      if (!token || token.expiresAt <= now) {
        delete state.accessTokens[key];
        changed = true;
      }
    }
    for (const [key, code] of authorizationCodes) {
      if (code.expiresAt <= now) authorizationCodes.delete(key);
    }
    if (changed) void persistState();
  };

  cleanupExpired();

  const getRequestAddress = (request) => {
    if (trustProxy) {
      const forwarded = request.headers["x-forwarded-for"];
      const value = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(",")[0]?.trim();
      if (value) return value;
    }
    return request.socket.remoteAddress || "local";
  };

  const isRateLimited = (request, action, limit, windowMs) => {
    const key = `${action}:${getRequestAddress(request)}`;
    const now = Date.now();
    const recent = (authenticationAttempts.get(key) || []).filter(
      (timestamp) => now - timestamp < windowMs,
    );
    recent.push(now);
    authenticationAttempts.set(key, recent);
    return recent.length > limit;
  };

  const createSessionCookie = (token, maxAgeSeconds) => {
    const secure =
      env.NODE_ENV === "production" || issuer.startsWith("https://");
    const attributes = [
      `${sessionCookieName}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAgeSeconds}`,
    ];
    if (cookieDomain) attributes.push(`Domain=${cookieDomain}`);
    if (secure) attributes.push("Secure");
    return attributes.join("; ");
  };

  const createLocalUser = (userId, email, nickname) => {
    const createdAt = nowIso();
    const user = {
      id: userId || randomUUID(),
      email,
      nickname,
      level: "LV.1 发芽",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    };
    users[user.id] = user;
    return user;
  };

  const findUserByEmail = (email) =>
    Object.values(users).find((user) => user.email === email) || null;

  const readBrowserSession = (request) => {
    cleanupExpired();
    const rawToken = parseCookies(request)[sessionCookieName];
    if (!rawToken) return null;
    const tokenHash = hashToken(rawToken);
    const session = state.sessions[tokenHash];
    if (!session) return null;
    const user = users[session.userId];
    if (!user || user.status === "disabled") {
      delete state.sessions[tokenHash];
      void persistState();
      return null;
    }
    return { rawToken, tokenHash, session, user };
  };

  const beginBrowserSession = async (request, user, response) => {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const now = Date.now();
    state.sessions[tokenHash] = {
      id: randomUUID(),
      userId: user.id,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + sessionLifetimeMs,
      userAgent: String(request.headers["user-agent"] || "").slice(0, 180),
      address: getRequestAddress(request),
    };
    await persistState();
    response.setHeader(
      "Set-Cookie",
      createSessionCookie(rawToken, Math.floor(sessionLifetimeMs / 1000)),
    );
  };

  const revokeUserCredentials = async (userId, exceptSessionHash = "") => {
    for (const [key, session] of Object.entries(state.sessions)) {
      if (session.userId === userId && key !== exceptSessionHash) {
        delete state.sessions[key];
      }
    }
    for (const [key, token] of Object.entries(state.accessTokens)) {
      if (token.userId === userId) delete state.accessTokens[key];
    }
    await persistState();
  };

  const isAllowedOrigin = (origin) => configuredOrigins.has(normalizeOrigin(origin));

  const isSafeMutation = (request) => {
    const origin = normalizeOrigin(request.headers.origin);
    if (!origin) return true;
    try {
      return (
        new URL(origin).host === request.headers.host ||
        isAllowedOrigin(origin)
      );
    } catch {
      return false;
    }
  };

  const requireSafeMutation = (request, response) => {
    if (isSafeMutation(request)) return true;
    sendJson(response, 403, {
      code: "INVALID_ORIGIN",
      message: "无法确认本次账号请求的来源。",
    });
    return false;
  };

  const requireBrowserAccount = (request, response) => {
    const activeSession = readBrowserSession(request);
    if (activeSession) return activeSession;
    sendJson(response, 401, {
      code: "LOGIN_REQUIRED",
      message: "请先登录种种账号。",
    });
    return null;
  };

  const register = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    if (isRateLimited(request, "register", 10, 10 * 60_000)) {
      sendJson(response, 429, {
        code: "TOO_MANY_ATTEMPTS",
        message: "尝试次数过多，请稍后再试。",
      });
      return;
    }

    let body;
    try {
      body = await parseRequestBody(request);
    } catch {
      sendJson(response, 400, {
        code: "INVALID_REQUEST",
        message: "账号信息格式不正确。",
      });
      return;
    }

    const email = normalizeEmail(body.email);
    const nickname = String(body.nickname || "").trim();
    const password = body.password;
    if (!isValidEmail(email)) {
      sendJson(response, 400, {
        code: "INVALID_EMAIL",
        message: "请填写有效的邮箱地址。",
      });
      return;
    }
    if (!isValidNickname(nickname)) {
      sendJson(response, 400, {
        code: "INVALID_NICKNAME",
        message: "名字需要 2 至 16 个字。",
      });
      return;
    }
    if (!isValidPassword(password)) {
      sendJson(response, 400, {
        code: "INVALID_PASSWORD",
        message: "密码需要 8 至 128 位。",
      });
      return;
    }
    const result = await remoteService.register({ email, password, nickname });
    if (!result.ok) {
      const status = result.error === "SUPABASE_NOT_CONFIGURED" ? 503 : 401;
      sendJson(response, status, {
        code: result.error || "AUTH_FAILED",
        message: result.message || "注册失败。",
      });
      return;
    }

    const user = createLocalUser(result.userId, email, nickname);
    await persistUsers();
    await beginBrowserSession(request, user, response);
    sendJson(response, 201, { account: publicAccount(user) });
  };

  const login = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    if (isRateLimited(request, "login", 20, 10 * 60_000)) {
      sendJson(response, 429, {
        code: "TOO_MANY_ATTEMPTS",
        message: "尝试次数过多，请稍后再试。",
      });
      return;
    }

    let body;
    try {
      body = await parseRequestBody(request);
    } catch {
      sendJson(response, 400, {
        code: "INVALID_REQUEST",
        message: "登录信息格式不正确。",
      });
      return;
    }

    const email = normalizeEmail(body.email);
    const password = body.password;
    const nickname = String(body.nickname || "").trim();

    const result = await remoteService.login({ email, password, nickname });
    if (!result.ok) {
      const status = result.error === "SUPABASE_NOT_CONFIGURED" ? 503 : 401;
      sendJson(response, status, {
        code: result.error || "INVALID_CREDENTIALS",
        message: result.message || "邮箱或密码不正确。",
      });
      return;
    }

    let user = findUserByEmail(email);
    if (!user) {
      user = createLocalUser(result.userId, email, nickname || email.split("@")[0]);
      await persistUsers();
    }
    await beginBrowserSession(request, user, response);
    sendJson(response, 200, { account: publicAccount(user) });
  };

  const logout = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    const activeSession = readBrowserSession(request);
    if (activeSession) {
      delete state.sessions[activeSession.tokenHash];
      await persistState();
    }
    response.setHeader("Set-Cookie", createSessionCookie("", 0));
    sendJson(response, 200, { account: null });
  };

  const logoutAll = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;
    await revokeUserCredentials(activeSession.user.id);
    response.setHeader("Set-Cookie", createSessionCookie("", 0));
    sendJson(response, 200, { account: null });
  };

  const sendSession = (request, response) => {
    const activeSession = readBrowserSession(request);
    sendJson(response, 200, {
      account: activeSession ? publicAccount(activeSession.user) : null,
    });
  };

  const sendForumRewardStatus = (request, response) => {
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;
    sendJson(response, 200, forumRewardStatus(activeSession.user));
  };

  const checkInToForum = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;

    const today = chinaDateKey();
    if (activeSession.user.forumLastCheckInDate === today) {
      sendJson(response, 200, forumRewardStatus(activeSession.user));
      return;
    }

    const continued =
      activeSession.user.forumLastCheckInDate === previousDateKey(today);
    activeSession.user.forumPoints = forumPointsFor(activeSession.user) + 10;
    activeSession.user.forumCheckInStreak = continued
      ? forumStreakFor(activeSession.user) + 1
      : 1;
    activeSession.user.forumLastCheckInDate = today;
    activeSession.user.updatedAt = nowIso();
    await persistUsers();
    sendJson(
      response,
      200,
      forumRewardStatus(activeSession.user, { awarded: 10 }),
    );
  };

  const waterForumGarden = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;

    const today = chinaDateKey();
    if (activeSession.user.forumLastWaterDate === today) {
      sendJson(response, 200, forumRewardStatus(activeSession.user));
      return;
    }

    const previousCount = forumWaterCountFor(activeSession.user);
    const nextCount = previousCount + 1;
    activeSession.user.forumPoints = forumPointsFor(activeSession.user) + 3;
    activeSession.user.forumWaterCount = nextCount;
    activeSession.user.forumLastWaterDate = today;
    activeSession.user.updatedAt = nowIso();
    await persistUsers();
    sendJson(
      response,
      200,
      forumRewardStatus(activeSession.user, {
        awarded: 3,
        achievementUnlocked: previousCount < 3 && nextCount >= 3,
      }),
    );
  };

  const updateProfile = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;
    let body;
    try {
      body = await parseRequestBody(request);
    } catch {
      sendJson(response, 400, {
        code: "INVALID_REQUEST",
        message: "资料格式不正确。",
      });
      return;
    }
    const nickname = String(body.nickname || "").trim();
    if (!isValidNickname(nickname)) {
      sendJson(response, 400, {
        code: "INVALID_NICKNAME",
        message: "名字需要 2 至 16 个字。",
      });
      return;
    }
    activeSession.user.nickname = nickname;
    activeSession.user.updatedAt = nowIso();
    await persistUsers();
    sendJson(response, 200, { account: publicAccount(activeSession.user) });
  };

  const changePassword = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;
    let body;
    try {
      body = await parseRequestBody(request);
    } catch {
      sendJson(response, 400, {
        code: "INVALID_REQUEST",
        message: "密码信息格式不正确。",
      });
      return;
    }
    const currentPassword = body.currentPassword;
    const nextPassword = body.newPassword;
    if (
      !isValidPassword(currentPassword) ||
      !(await verifyPassword(currentPassword, activeSession.user).catch(
        () => false,
      ))
    ) {
      sendJson(response, 401, {
        code: "INVALID_CREDENTIALS",
        message: "当前密码不正确。",
      });
      return;
    }
    if (!isValidPassword(nextPassword) || nextPassword === currentPassword) {
      sendJson(response, 400, {
        code: "INVALID_NEW_PASSWORD",
        message: "新密码需要 8 至 128 位，并且不能与当前密码相同。",
      });
      return;
    }
    const result = await remoteService.changePassword({
      userId: activeSession.user.id,
      newPassword: nextPassword,
    });
    if (!result.ok) {
      sendJson(response, 503, {
        code: result.error || "AUTH_FAILED",
        message: result.message || "修改密码失败。",
      });
      return;
    }
    activeSession.user.updatedAt = nowIso();
    await persistUsers();
    await revokeUserCredentials(
      activeSession.user.id,
      activeSession.tokenHash,
    );
    sendJson(response, 200, { account: publicAccount(activeSession.user) });
  };

  const listSessions = (request, response) => {
    const activeSession = requireBrowserAccount(request, response);
    if (!activeSession) return;
    const sessions = Object.entries(state.sessions)
      .filter(([, session]) => session.userId === activeSession.user.id)
      .map(([key, session]) => ({
        id: session.id,
        current: key === activeSession.tokenHash,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        userAgent: session.userAgent,
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    sendJson(response, 200, { sessions });
  };

  const authorize = (request, response, url) => {
    const clientId = String(url.searchParams.get("client_id") || "");
    const redirectUri = String(url.searchParams.get("redirect_uri") || "");
    const stateValue = String(url.searchParams.get("state") || "");
    const codeChallenge = String(
      url.searchParams.get("code_challenge") || "",
    );
    const challengeMethod = String(
      url.searchParams.get("code_challenge_method") || "",
    );
    const client = clientsById.get(clientId);

    if (
      !client ||
      !client.redirectUris.includes(redirectUri) ||
      stateValue.length < 8 ||
      stateValue.length > 512 ||
      challengeMethod !== "S256" ||
      !isValidPkceValue(codeChallenge)
    ) {
      sendJson(response, 400, {
        code: "INVALID_AUTHORIZATION_REQUEST",
        message: "产品登录请求不完整或没有登记。",
      });
      return;
    }

    const activeSession = readBrowserSession(request);
    if (!activeSession) {
      const returnTo = `${url.pathname}${url.search}`;
      redirect(
        response,
        `/products.html?account=login&return_to=${encodeURIComponent(returnTo)}`,
      );
      return;
    }

    cleanupExpired();
    const rawCode = randomBytes(32).toString("base64url");
    authorizationCodes.set(hashToken(rawCode), {
      clientId,
      redirectUri,
      codeChallenge,
      userId: activeSession.user.id,
      expiresAt: Date.now() + authorizationCodeLifetimeMs,
    });
    redirect(
      response,
      appendQuery(redirectUri, {
        code: rawCode,
        state: stateValue,
      }),
    );
  };

  const exchangeToken = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    let body;
    try {
      body = await parseRequestBody(request);
    } catch {
      sendJson(response, 400, {
        error: "invalid_request",
        error_description: "授权信息格式不正确。",
      });
      return;
    }

    const clientId = String(body.client_id || "");
    const redirectUri = String(body.redirect_uri || "");
    const rawCode = String(body.code || "");
    const verifier = String(body.code_verifier || "");
    const client = clientsById.get(clientId);
    const codeHash = hashToken(rawCode);
    const authorization = authorizationCodes.get(codeHash);
    authorizationCodes.delete(codeHash);

    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    const valid =
      body.grant_type === "authorization_code" &&
      client &&
      client.redirectUris.includes(redirectUri) &&
      authorization &&
      authorization.expiresAt > Date.now() &&
      authorization.clientId === clientId &&
      authorization.redirectUri === redirectUri &&
      isValidPkceValue(verifier) &&
      challenge === authorization.codeChallenge;

    if (!valid) {
      sendJson(response, 400, {
        error: "invalid_grant",
        error_description: "授权码无效、已使用或已经过期。",
      });
      return;
    }

    const user = users[authorization.userId];
    if (!user || user.status === "disabled") {
      sendJson(response, 400, {
        error: "invalid_grant",
        error_description: "账号当前不可用。",
      });
      return;
    }

    const rawAccessToken = randomBytes(32).toString("base64url");
    const issuedAt = Date.now();
    state.accessTokens[hashToken(rawAccessToken)] = {
      id: randomUUID(),
      userId: user.id,
      clientId,
      issuedAt,
      expiresAt: issuedAt + accessTokenLifetimeMs,
    };
    await persistState();
    sendJson(response, 200, {
      access_token: rawAccessToken,
      token_type: "Bearer",
      expires_in: Math.floor(accessTokenLifetimeMs / 1000),
      account: publicAccount(user),
    });
  };

  const readAccessAccount = (request) => {
    cleanupExpired();
    const rawToken = getBearerToken(request);
    if (!rawToken) return null;
    const tokenHash = hashToken(rawToken);
    const token = state.accessTokens[tokenHash];
    if (!token || token.expiresAt <= Date.now()) return null;
    const user = users[token.userId];
    if (!user || user.status === "disabled") return null;
    return { rawToken, tokenHash, token, user };
  };

  const sendUserInfo = (request, response) => {
    const access = readAccessAccount(request);
    if (!access) {
      response.setHeader("WWW-Authenticate", 'Bearer realm="zhongzhong-account"');
      sendJson(response, 401, {
        code: "INVALID_TOKEN",
        message: "产品登录已过期，请重新登录。",
      });
      return;
    }
    sendJson(response, 200, { account: publicAccount(access.user) });
  };

  const revokeAccessToken = async (request, response) => {
    if (!requireSafeMutation(request, response)) return;
    let rawToken = getBearerToken(request);
    if (!rawToken) {
      try {
        const body = await parseRequestBody(request);
        rawToken = String(body.token || "");
      } catch {
        rawToken = "";
      }
    }
    if (rawToken) {
      delete state.accessTokens[hashToken(rawToken)];
      await persistState();
    }
    sendJson(response, 200, { revoked: true });
  };

  const sendClient = (request, response, clientId) => {
    const client = clientsById.get(clientId);
    if (!client) {
      sendJson(response, 404, {
        code: "CLIENT_NOT_FOUND",
        message: "没有找到这个种种产品。",
      });
      return;
    }
    sendJson(response, 200, {
      id: client.id,
      name: client.name,
      issuer,
      authorizationEndpoint: `${issuer}/api/auth/authorize`,
      tokenEndpoint: `${issuer}/api/auth/token`,
      userinfoEndpoint: `${issuer}/api/auth/userinfo`,
      revokeEndpoint: `${issuer}/api/auth/revoke`,
      codeChallengeMethods: ["S256"],
    });
  };

  const applyCors = (request, response, url) => {
    const origin = normalizeOrigin(request.headers.origin);
    if (!origin || !url.pathname.startsWith("/api/auth/")) return false;
    if (!isAllowedOrigin(origin)) return false;
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Vary", "Origin");
    return true;
  };

  const handle = async (request, response, url) => {
    if (
      request.method === "GET" &&
      url.pathname === "/.well-known/zhongzhong-account"
    ) {
      sendJson(response, 200, {
        issuer,
        authorizationEndpoint: `${issuer}/api/auth/authorize`,
        tokenEndpoint: `${issuer}/api/auth/token`,
        userinfoEndpoint: `${issuer}/api/auth/userinfo`,
        revokeEndpoint: `${issuer}/api/auth/revoke`,
        codeChallengeMethods: ["S256"],
        clients: clients.map(({ id, name }) => ({ id, name })),
      });
      return true;
    }

    if (!url.pathname.startsWith("/api/auth/")) return false;

    if (request.method === "OPTIONS") {
      if (!applyCors(request, response, url)) {
        sendJson(response, 403, {
          code: "ORIGIN_NOT_ALLOWED",
          message: "这个产品地址尚未接入统一账号。",
        });
        return true;
      }
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Max-Age": "600",
      });
      response.end();
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      sendSession(request, response);
      return true;
    }
    if (
      request.method === "GET" &&
      url.pathname === "/api/auth/forum-points"
    ) {
      sendForumRewardStatus(request, response);
      return true;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/auth/forum-check-in"
    ) {
      await checkInToForum(request, response);
      return true;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/auth/forum-water"
    ) {
      await waterForumGarden(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      await register(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      await login(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      await logout(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout-all") {
      await logoutAll(request, response);
      return true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/auth/profile") {
      await updateProfile(request, response);
      return true;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/auth/change-password"
    ) {
      await changePassword(request, response);
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/auth/sessions") {
      listSessions(request, response);
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/auth/authorize") {
      authorize(request, response, url);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/token") {
      await exchangeToken(request, response);
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/auth/userinfo") {
      sendUserInfo(request, response);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/revoke") {
      await revokeAccessToken(request, response);
      return true;
    }

    const clientMatch = url.pathname.match(
      /^\/api\/auth\/clients\/([a-z0-9_-]+)$/i,
    );
    if (request.method === "GET" && clientMatch) {
      sendClient(request, response, clientMatch[1]);
      return true;
    }

    sendJson(response, 404, {
      code: "AUTH_ENDPOINT_NOT_FOUND",
      message: "没有找到这个账号接口。",
    });
    return true;
  };

  return {
    applyCors,
    getBrowserAccount: (request) => {
      const activeSession = readBrowserSession(request);
      return activeSession ? publicAccount(activeSession.user) : null;
    },
    handle,
    health: () => ({
      ready: true,
      issuer,
      clientCount: clients.length,
      persistence: "file",
    }),
  };
};
