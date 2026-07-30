import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");

const findOpenPort = async () =>
  new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => resolvePort(address.port));
    });
  });

const waitForServer = async (baseUrl, child) => {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`账号测试服务提前退出：${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw lastError || new Error("账号测试服务没有按时启动。");
};

const stopServer = async (child) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveExit) => child.once("exit", resolveExit));
};

const startServer = async ({ port, dataDirectory, clientsFile }) => {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
      ACCOUNT_ISSUER: `http://127.0.0.1:${port}`,
      ACCOUNT_USERS_FILE: join(dataDirectory, "users.json"),
      ACCOUNT_STATE_FILE: join(dataDirectory, "account-state.json"),
      ACCOUNT_CLIENTS_FILE: clientsFile,
      ANALYTICS_DB_FILE: join(dataDirectory, "site-analytics.sqlite"),
      ACCOUNT_ALLOWED_ORIGINS: "http://127.0.0.1:9100",
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer(`http://127.0.0.1:${port}`, child);
  return child;
};

const jsonRequest = async (url, { cookie = "", origin = "", ...options } = {}) => {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set("Cookie", cookie);
  if (origin) headers.set("Origin", origin);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

test("统一账号持久化会话并完成 PKCE 产品授权", async (t) => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "zhongzhong-account-"));
  const clientsFile = join(dataDirectory, "clients.json");
  const port = await findOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const productOrigin = "http://127.0.0.1:9100";
  const redirectUri = `${productOrigin}/callback`;
  await writeFile(
    clientsFile,
    JSON.stringify([
      {
        id: "test-product",
        name: "测试产品",
        origins: [productOrigin],
        redirectUris: [redirectUri],
      },
    ]),
  );

  let child = await startServer({ port, dataDirectory, clientsFile });
  t.after(async () => {
    await stopServer(child);
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const registration = await jsonRequest(`${baseUrl}/api/auth/register`, {
    method: "POST",
    origin: baseUrl,
    body: JSON.stringify({
      email: "backend-test@zhongzhong.local",
      nickname: "测试芽",
      password: "backend-pass-2026",
    }),
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.payload.account.nickname, "测试芽");
  assert.equal(registration.payload.account.points, 0);
  const cookie = registration.response.headers.get("set-cookie").split(";")[0];

  const pointsBeforeCheckIn = await jsonRequest(
    `${baseUrl}/api/auth/forum-points`,
    { cookie },
  );
  assert.equal(pointsBeforeCheckIn.response.status, 200);
  assert.equal(pointsBeforeCheckIn.payload.points, 0);
  assert.equal(pointsBeforeCheckIn.payload.checkedInToday, false);
  assert.equal(pointsBeforeCheckIn.payload.wateredToday, false);
  assert.equal(pointsBeforeCheckIn.payload.waterCount, 0);
  assert.deepEqual(pointsBeforeCheckIn.payload.waterAchievement, {
    id: "morning-dew-gardener",
    title: "晨露园丁",
    progress: 0,
    target: 3,
    unlocked: false,
    newlyUnlocked: false,
  });

  const firstCheckIn = await jsonRequest(
    `${baseUrl}/api/auth/forum-check-in`,
    {
      method: "POST",
      cookie,
      origin: baseUrl,
      body: "{}",
    },
  );
  assert.equal(firstCheckIn.response.status, 200);
  assert.equal(firstCheckIn.payload.points, 10);
  assert.equal(firstCheckIn.payload.awarded, 10);
  assert.equal(firstCheckIn.payload.checkedInToday, true);
  assert.equal(firstCheckIn.payload.streak, 1);

  const repeatedCheckIn = await jsonRequest(
    `${baseUrl}/api/auth/forum-check-in`,
    {
      method: "POST",
      cookie,
      origin: baseUrl,
      body: "{}",
    },
  );
  assert.equal(repeatedCheckIn.response.status, 200);
  assert.equal(repeatedCheckIn.payload.points, 10);
  assert.equal(repeatedCheckIn.payload.awarded, 0);

  const firstWater = await jsonRequest(
    `${baseUrl}/api/auth/forum-water`,
    {
      method: "POST",
      cookie,
      origin: baseUrl,
      body: "{}",
    },
  );
  assert.equal(firstWater.response.status, 200);
  assert.equal(firstWater.payload.points, 13);
  assert.equal(firstWater.payload.awarded, 3);
  assert.equal(firstWater.payload.wateredToday, true);
  assert.equal(firstWater.payload.waterCount, 1);
  assert.equal(firstWater.payload.waterAchievement.progress, 1);
  assert.equal(firstWater.payload.waterAchievement.target, 3);
  assert.equal(firstWater.payload.waterAchievement.unlocked, false);

  const repeatedWater = await jsonRequest(
    `${baseUrl}/api/auth/forum-water`,
    {
      method: "POST",
      cookie,
      origin: baseUrl,
      body: "{}",
    },
  );
  assert.equal(repeatedWater.response.status, 200);
  assert.equal(repeatedWater.payload.points, 13);
  assert.equal(repeatedWater.payload.awarded, 0);
  assert.equal(repeatedWater.payload.waterCount, 1);

  const sessionBeforeRestart = await jsonRequest(
    `${baseUrl}/api/auth/session`,
    { cookie },
  );
  assert.equal(sessionBeforeRestart.payload.account.email, "backend-test@zhongzhong.local");
  assert.equal(sessionBeforeRestart.payload.account.points, 13);

  await stopServer(child);
  child = await startServer({ port, dataDirectory, clientsFile });

  const sessionAfterRestart = await jsonRequest(
    `${baseUrl}/api/auth/session`,
    { cookie },
  );
  assert.equal(sessionAfterRestart.payload.account.nickname, "测试芽");
  assert.equal(sessionAfterRestart.payload.account.points, 13);

  const profileUpdate = await jsonRequest(`${baseUrl}/api/auth/profile`, {
    method: "PATCH",
    cookie,
    origin: baseUrl,
    body: JSON.stringify({ nickname: "测试新芽" }),
  });
  assert.equal(profileUpdate.response.status, 200);
  assert.equal(profileUpdate.payload.account.nickname, "测试新芽");

  const passwordChange = await jsonRequest(
    `${baseUrl}/api/auth/change-password`,
    {
      method: "POST",
      cookie,
      origin: baseUrl,
      body: JSON.stringify({
        currentPassword: "backend-pass-2026",
        newPassword: "backend-pass-2026-new",
      }),
    },
  );
  assert.equal(passwordChange.response.status, 200);

  const oldPasswordLogin = await jsonRequest(`${baseUrl}/api/auth/login`, {
    method: "POST",
    origin: baseUrl,
    body: JSON.stringify({
      email: "backend-test@zhongzhong.local",
      password: "backend-pass-2026",
    }),
  });
  assert.equal(oldPasswordLogin.response.status, 401);

  const newPasswordLogin = await jsonRequest(`${baseUrl}/api/auth/login`, {
    method: "POST",
    origin: baseUrl,
    body: JSON.stringify({
      email: "backend-test@zhongzhong.local",
      password: "backend-pass-2026-new",
    }),
  });
  assert.equal(newPasswordLogin.response.status, 200);

  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const authorizeUrl = new URL("/api/auth/authorize", baseUrl);
  authorizeUrl.searchParams.set("client_id", "test-product");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", "state-test-2026");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const authorization = await fetch(authorizeUrl, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  assert.equal(authorization.status, 303);
  const callback = new URL(authorization.headers.get("location"));
  assert.equal(callback.origin, productOrigin);
  assert.equal(callback.searchParams.get("state"), "state-test-2026");
  const code = callback.searchParams.get("code");
  assert.ok(code);

  const exchange = await jsonRequest(`${baseUrl}/api/auth/token`, {
    method: "POST",
    origin: productOrigin,
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: "test-product",
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  assert.equal(exchange.response.status, 200);
  assert.equal(exchange.payload.token_type, "Bearer");
  assert.equal(exchange.payload.account.nickname, "测试新芽");

  const repeatedExchange = await jsonRequest(`${baseUrl}/api/auth/token`, {
    method: "POST",
    origin: productOrigin,
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: "test-product",
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  assert.equal(repeatedExchange.response.status, 400);
  assert.equal(repeatedExchange.payload.error, "invalid_grant");

  const userInfo = await jsonRequest(`${baseUrl}/api/auth/userinfo`, {
    headers: { Authorization: `Bearer ${exchange.payload.access_token}` },
    origin: productOrigin,
  });
  assert.equal(userInfo.response.status, 200);
  assert.equal(userInfo.payload.account.id, registration.payload.account.id);

  const revoke = await jsonRequest(`${baseUrl}/api/auth/revoke`, {
    method: "POST",
    origin: productOrigin,
    headers: { Authorization: `Bearer ${exchange.payload.access_token}` },
    body: "{}",
  });
  assert.equal(revoke.response.status, 200);

  const revokedUserInfo = await jsonRequest(`${baseUrl}/api/auth/userinfo`, {
    headers: { Authorization: `Bearer ${exchange.payload.access_token}` },
    origin: productOrigin,
  });
  assert.equal(revokedUserInfo.response.status, 401);

  const logoutAll = await jsonRequest(`${baseUrl}/api/auth/logout-all`, {
    method: "POST",
    cookie,
    origin: baseUrl,
    body: "{}",
  });
  assert.equal(logoutAll.response.status, 200);

  const loggedOutSession = await jsonRequest(`${baseUrl}/api/auth/session`, {
    cookie,
  });
  assert.equal(loggedOutSession.payload.account, null);
});
