import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
      throw new Error(`统计测试服务提前退出：${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw lastError || new Error("统计测试服务没有按时启动。");
};

const stopServer = async (child) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveExit) => child.once("exit", resolveExit));
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

test("页面浏览与踩踩写入 SQLite 并按访客去重", async (t) => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "zhongzhong-analytics-"));
  const port = await findOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      PUBLIC_BASE_URL: baseUrl,
      ACCOUNT_ISSUER: baseUrl,
      ACCOUNT_USERS_FILE: join(dataDirectory, "users.json"),
      ACCOUNT_STATE_FILE: join(dataDirectory, "account-state.json"),
      ANALYTICS_DB_FILE: join(dataDirectory, "site-analytics.sqlite"),
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    await stopServer(child);
    await rm(dataDirectory, { recursive: true, force: true });
  });
  await waitForServer(baseUrl, child);

  const firstView = await jsonRequest(`${baseUrl}/api/analytics/view`, {
    method: "POST",
    origin: baseUrl,
    body: JSON.stringify({ pageKey: "index.html" }),
  });
  assert.equal(firstView.response.status, 200);
  assert.equal(firstView.payload.views, 1);
  assert.equal(firstView.payload.visitors, 1);
  assert.equal(firstView.payload.heat, 0);
  assert.equal(firstView.payload.counted, true);
  const firstCookie = firstView.response.headers
    .get("set-cookie")
    .split(";")[0];

  const repeatedView = await jsonRequest(`${baseUrl}/api/analytics/view`, {
    method: "POST",
    origin: baseUrl,
    cookie: firstCookie,
    body: JSON.stringify({ pageKey: "index.html" }),
  });
  assert.equal(repeatedView.response.status, 200);
  assert.equal(repeatedView.payload.views, 1);
  assert.equal(repeatedView.payload.visitors, 1);
  assert.equal(repeatedView.payload.counted, false);

  const secondVisitor = await jsonRequest(`${baseUrl}/api/analytics/view`, {
    method: "POST",
    origin: baseUrl,
    body: JSON.stringify({ pageKey: "index.html" }),
  });
  assert.equal(secondVisitor.payload.views, 2);
  assert.equal(secondVisitor.payload.visitors, 2);

  const firstHeat = await jsonRequest(`${baseUrl}/api/analytics/heat`, {
    method: "POST",
    origin: baseUrl,
    cookie: firstCookie,
    body: JSON.stringify({ pageKey: "index.html" }),
  });
  assert.equal(firstHeat.response.status, 200);
  assert.equal(firstHeat.payload.heat, 1);
  assert.equal(firstHeat.payload.heated, true);
  assert.equal(firstHeat.payload.awarded, true);

  const repeatedHeat = await jsonRequest(`${baseUrl}/api/analytics/heat`, {
    method: "POST",
    origin: baseUrl,
    cookie: firstCookie,
    body: JSON.stringify({ pageKey: "index.html" }),
  });
  assert.equal(repeatedHeat.payload.heat, 1);
  assert.equal(repeatedHeat.payload.awarded, false);

  const summary = await jsonRequest(`${baseUrl}/api/analytics/summary`);
  assert.equal(summary.response.status, 200);
  assert.deepEqual(summary.payload.pages, [
    {
      pageKey: "index.html",
      views: 2,
      visitors: 2,
      heat: 1,
    },
  ]);
});
