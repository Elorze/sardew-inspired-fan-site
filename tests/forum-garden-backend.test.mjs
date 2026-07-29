import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`话语花园测试服务提前退出：${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Wait until the local test server is ready.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error("话语花园测试服务没有按时启动。");
};

const stopServer = async (child) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveExit) => child.once("exit", resolveExit));
};

const startServer = async ({ port, dataDirectory }) => {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
      ACCOUNT_USERS_FILE: join(dataDirectory, "users.json"),
      ACCOUNT_STATE_FILE: join(dataDirectory, "account-state.json"),
      FORUM_GARDEN_FILE: join(dataDirectory, "forum-garden.json"),
      PAYMENT_ORDERS_FILE: join(dataDirectory, "orders.json"),
      CONTENT_SUBMISSIONS_FILE: join(dataDirectory, "submissions.json"),
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer(`http://127.0.0.1:${port}`, child);
  return child;
};

const jsonRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

test("话语花园按热度排序并持久化采摘热度", async (t) => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "zhongzhong-forum-garden-"));
  const port = await findOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = await startServer({ port, dataDirectory });

  t.after(async () => {
    await stopServer(child);
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const initial = await jsonRequest(`${baseUrl}/api/forum/garden`);
  assert.equal(initial.response.status, 200);
  assert.ok(initial.payload.phrases.length >= 5);

  const sortedHeat = initial.payload.phrases.map((phrase) => phrase.heat);
  assert.deepEqual(sortedHeat, [...sortedHeat].sort((a, b) => b - a));

  const picked = await jsonRequest(`${baseUrl}/api/forum/garden/random`, {
    method: "POST",
  });
  assert.equal(picked.response.status, 200);
  assert.ok(picked.payload.selected.id);

  const pickedAfter = picked.payload.phrases.find(
    (phrase) => phrase.id === picked.payload.selected.id,
  );
  assert.ok(pickedAfter.picks >= picked.payload.selected.picks);

  const viewed = await jsonRequest(`${baseUrl}/api/forum/garden/world/view`, {
    method: "POST",
  });
  assert.equal(viewed.response.status, 200);
  assert.equal(viewed.payload.selected.id, "world");
});
