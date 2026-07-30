import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import {
  amountToCents,
  isOrderAmountEqual,
  mapAlipayTradeStatus,
  normalizeDelivery,
  normalizePaymentCart,
  paymentCatalog,
} from "../payment-service.mjs";

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
      throw new Error(`支付测试服务提前退出：${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Wait until the local test server is ready.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error("支付测试服务没有按时启动。");
};

test("服务端按完整商品目录计价并校验收货信息", () => {
  assert.equal(Object.keys(paymentCatalog).length, 20);
  const items = normalizePaymentCart([
    { productId: "merch-04", quantity: 2, price: 0.01 },
    { productId: "merch-14", quantity: 1, price: 9999 },
  ]);
  assert.deepEqual(
    items.map(({ productId, quantity, unitPriceInCents }) => ({
      productId,
      quantity,
      unitPriceInCents,
    })),
    [
      { productId: "merch-04", quantity: 2, unitPriceInCents: 3200 },
      { productId: "merch-14", quantity: 1, unitPriceInCents: 1200 },
    ],
  );
  assert.equal(paymentCatalog["merch-15"].priceInCents, 6800);
  assert.equal(paymentCatalog["merch-16"].priceInCents, 2400);
  assert.equal(paymentCatalog["merch-17"].priceInCents, 3200);
  assert.equal(paymentCatalog["merch-20"].priceInCents, 2000);
  assert.throws(
    () => normalizePaymentCart([{ productId: "unknown", quantity: 1 }]),
    /INVALID_CART/,
  );

  assert.deepEqual(
    normalizeDelivery({
      recipientName: "  种种  ",
      phone: "138 0000 0000",
      address: "重庆市   某某区 花园路 8 号",
    }),
    {
      recipientName: "种种",
      phone: "138 0000 0000",
      address: "重庆市 某某区 花园路 8 号",
    },
  );
  assert.throws(
    () =>
      normalizeDelivery({
        recipientName: "种",
        phone: "123",
        address: "短",
      }),
    /INVALID_DELIVERY/,
  );
});

test("支付宝金额和交易状态使用精确规则处理", () => {
  assert.equal(amountToCents("18"), 1800);
  assert.equal(amountToCents("18.00"), 1800);
  assert.equal(amountToCents("18.001"), null);
  assert.equal(isOrderAmountEqual({ totalInCents: 1800 }, "18.00"), true);
  assert.equal(isOrderAmountEqual({ totalAmount: "18.00" }, "18.00"), true);
  assert.equal(isOrderAmountEqual({ totalInCents: 1800 }, "18.01"), false);
  assert.equal(mapAlipayTradeStatus("TRADE_SUCCESS"), "paid");
  assert.equal(mapAlipayTradeStatus("TRADE_FINISHED"), "paid");
  assert.equal(mapAlipayTradeStatus("TRADE_CLOSED"), "closed");
  assert.equal(mapAlipayTradeStatus("WAIT_BUYER_PAY"), "pending");
});

test("没有商户密钥时后端拒绝创建真实订单", async (t) => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "zhongzhong-payment-"));
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
      PAYMENT_ORDERS_FILE: join(dataDirectory, "orders.json"),
      ALIPAY_APP_ID: "",
      ALIPAY_PRIVATE_KEY: "",
      ALIPAY_PRIVATE_KEY_PATH: "",
      ALIPAY_PUBLIC_KEY: "",
      ALIPAY_PUBLIC_KEY_PATH: "",
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolveExit) => child.once("exit", resolveExit));
    }
    await rm(dataDirectory, { recursive: true, force: true });
  });

  await waitForServer(baseUrl, child);
  const health = await fetch(`${baseUrl}/api/health`).then((response) =>
    response.json(),
  );
  assert.equal(health.alipayConfigured, false);

  const response = await fetch(`${baseUrl}/api/alipay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "merch-01", quantity: 1 }],
      delivery: {
        recipientName: "测试收件人",
        phone: "13800000000",
        address: "重庆市测试区测试路 1 号",
      },
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.code, "ALIPAY_NOT_CONFIGURED");

  const crossSiteResponse = await fetch(
    `${baseUrl}/api/alipay/create-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://untrusted.example",
      },
      body: JSON.stringify({
        items: [{ productId: "merch-01", quantity: 1 }],
        delivery: {
          recipientName: "测试收件人",
          phone: "13800000000",
          address: "重庆市测试区测试路 1 号",
        },
      }),
    },
  );
  assert.equal(crossSiteResponse.status, 403);

  const privateOrderFile = await fetch(`${baseUrl}/data/orders.json`);
  assert.equal(privateOrderFile.status, 404);
});
