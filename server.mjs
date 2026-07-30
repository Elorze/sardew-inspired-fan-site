import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { AlipaySdk } from "alipay-sdk";
import { createAccountService } from "./account-service.mjs";
import { createAnalyticsService } from "./analytics-service.mjs";
import { moderateForumReply } from "./content-moderation.mjs";
import {
  isOrderAmountEqual,
  mapAlipayTradeStatus,
  normalizeDelivery,
  normalizePaymentCart,
} from "./payment-service.mjs";

const rootDirectory = dirname(fileURLToPath(import.meta.url));
let ordersFile;
let submissionsFile;
let forumGardenFile;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const loadEnvFile = () => {
  const envPath = resolve(rootDirectory, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value.replaceAll("\\n", "\n");
  }
};

loadEnvFile();

const runtimeDataRoot = process.env.RUNTIME_DATA_ROOT?.trim()
  ? resolve(rootDirectory, process.env.RUNTIME_DATA_ROOT.trim())
  : process.env.VERCEL
    ? resolve("/tmp", "zhongzhong-world")
    : rootDirectory;

ordersFile = resolve(
  runtimeDataRoot,
  process.env.PAYMENT_ORDERS_FILE || "data/orders.json",
);
submissionsFile = resolve(
  runtimeDataRoot,
  process.env.CONTENT_SUBMISSIONS_FILE || "data/content-submissions.json",
);
forumGardenFile = resolve(
  runtimeDataRoot,
  process.env.FORUM_GARDEN_FILE || "data/forum-garden.json",
);

const port = Number.parseInt(process.env.PORT || "8000", 10);
const host =
  process.env.HOST?.trim() ||
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const accountBaseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://127.0.0.1:${port}`;

const readSecret = (inlineName, pathName) => {
  const inlineValue = process.env[inlineName]?.trim();
  if (inlineValue) return inlineValue.replaceAll("\\n", "\n");

  const configuredPath = process.env[pathName]?.trim();
  if (!configuredPath) return "";
  const absolutePath = resolve(rootDirectory, configuredPath);
  return readFileSync(absolutePath, "utf8").trim();
};

const alipayConfig = {
  appId: process.env.ALIPAY_APP_ID?.trim() || "",
  privateKey: "",
  alipayPublicKey: "",
  keyType: process.env.ALIPAY_KEY_TYPE?.trim() || "PKCS8",
  gateway:
    process.env.ALIPAY_GATEWAY?.trim() ||
    "https://openapi.alipay.com/gateway.do",
  publicBaseUrl: process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || "",
  sellerId: process.env.ALIPAY_SELLER_ID?.trim() || "",
};

try {
  alipayConfig.privateKey = readSecret(
    "ALIPAY_PRIVATE_KEY",
    "ALIPAY_PRIVATE_KEY_PATH",
  );
  alipayConfig.alipayPublicKey = readSecret(
    "ALIPAY_PUBLIC_KEY",
    "ALIPAY_PUBLIC_KEY_PATH",
  );
} catch (error) {
  console.error(`读取支付宝密钥失败：${error.message}`);
}

const isAlipayConfigured = Boolean(
  alipayConfig.appId &&
    alipayConfig.privateKey &&
    alipayConfig.alipayPublicKey &&
    /^https?:\/\//.test(alipayConfig.publicBaseUrl) &&
    (process.env.NODE_ENV !== "production" ||
      alipayConfig.publicBaseUrl.startsWith("https://")),
);

const alipaySdk = isAlipayConfigured
  ? new AlipaySdk({
      appId: alipayConfig.appId,
      privateKey: alipayConfig.privateKey,
      alipayPublicKey: alipayConfig.alipayPublicKey,
      keyType: alipayConfig.keyType,
      gateway: alipayConfig.gateway,
      signType: "RSA2",
    })
  : null;

const accountService = await createAccountService({
  rootDirectory,
  dataDirectory: runtimeDataRoot,
  localBaseUrl: accountBaseUrl,
});
const analyticsService = await createAnalyticsService({
  rootDirectory,
  dataDirectory: runtimeDataRoot,
});

let orders = {};
let persistQueue = Promise.resolve();
let contentSubmissions = [];
let persistContentQueue = Promise.resolve();
let forumGarden = {};
let persistForumGardenQueue = Promise.resolve();
const createOrderAttempts = new Map();

const defaultForumGarden = {
  welcome: {
    id: "welcome",
    postId: "welcome",
    text: "先从这里认识大家，把路标轻轻插在花园入口。",
    speaker: "种种",
    avatar: "new-lilybell.png",
    heat: 0,
    picks: 0,
  },
  world: {
    id: "world",
    postId: "world",
    text: "今天在种种世界发现了什么？叶子会替你记住路线。",
    speaker: "青芽",
    avatar: "new-clover.png",
    heat: 0,
    picks: 0,
  },
  tavern: {
    id: "tavern",
    postId: "tavern",
    text: "酒馆今晚留哪一盏灯，路过的人都可以坐一会儿。",
    speaker: "小椒",
    avatar: "new-mushroom.png",
    heat: 0,
    picks: 0,
  },
  dandelion: {
    id: "dandelion",
    postId: "dandelion",
    text: "蒲公英地图交换处，风会把新的路带回来。",
    speaker: "风团",
    avatar: "new-dandelion.png",
    heat: 0,
    picks: 0,
  },
  creative: {
    id: "creative",
    postId: "creative",
    text: "晒晒贴在手账里的种种，把小小的图案种进纸页。",
    speaker: "花花",
    avatar: "new-bluebell.png",
    heat: 0,
    picks: 0,
  },
};

const loadOrders = async () => {
  try {
    const savedOrders = JSON.parse(await readFile(ordersFile, "utf8"));
    orders =
      savedOrders && typeof savedOrders === "object" && !Array.isArray(savedOrders)
        ? savedOrders
        : {};
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`读取订单记录失败：${error.message}`);
    }
    orders = {};
  }
};

await loadOrders();

const loadContentSubmissions = async () => {
  try {
    const savedSubmissions = JSON.parse(await readFile(submissionsFile, "utf8"));
    contentSubmissions = Array.isArray(savedSubmissions) ? savedSubmissions : [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`读取投稿记录失败：${error.message}`);
    }
    contentSubmissions = [];
  }
};

await loadContentSubmissions();

const normalizeForumGarden = (value) => {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(defaultForumGarden).map(([id, fallback]) => {
      const saved = source[id] && typeof source[id] === "object" ? source[id] : {};
      return [
        id,
        {
          ...fallback,
          heat: Number.isSafeInteger(saved.heat) && saved.heat >= 0
            ? saved.heat
            : fallback.heat,
          picks: Number.isSafeInteger(saved.picks) && saved.picks >= 0
            ? saved.picks
            : fallback.picks,
        },
      ];
    }),
  );
};

const loadForumGarden = async () => {
  try {
    forumGarden = normalizeForumGarden(
      JSON.parse(await readFile(forumGardenFile, "utf8")),
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`读取话语花园失败：${error.message}`);
    }
    forumGarden = normalizeForumGarden({});
  }
};

await loadForumGarden();

const persistOrders = () => {
  persistQueue = persistQueue
    .then(async () => {
      await mkdir(dirname(ordersFile), { recursive: true });
      const temporaryFile = `${ordersFile}.tmp`;
      await writeFile(temporaryFile, JSON.stringify(orders, null, 2), "utf8");
      await rename(temporaryFile, ordersFile);
    })
    .catch((error) => {
      console.error(`保存订单记录失败：${error.message}`);
    });
  return persistQueue;
};

const persistContentSubmissions = () => {
  persistContentQueue = persistContentQueue
    .then(async () => {
      await mkdir(dirname(submissionsFile), { recursive: true });
      const temporaryFile = `${submissionsFile}.tmp`;
      await writeFile(
        temporaryFile,
        JSON.stringify(contentSubmissions, null, 2),
        "utf8",
      );
      await rename(temporaryFile, submissionsFile);
    })
    .catch((error) => {
      console.error(`保存投稿记录失败：${error.message}`);
    });
  return persistContentQueue;
};

const persistForumGarden = () => {
  persistForumGardenQueue = persistForumGardenQueue
    .then(async () => {
      await mkdir(dirname(forumGardenFile), { recursive: true });
      const temporaryFile = `${forumGardenFile}.tmp`;
      await writeFile(temporaryFile, JSON.stringify(forumGarden, null, 2), "utf8");
      await rename(temporaryFile, forumGardenFile);
    })
    .catch((error) => {
      console.error(`保存话语花园失败：${error.message}`);
    });
  return persistForumGardenQueue;
};

const publicForumGarden = () =>
  Object.values(forumGarden).sort((first, second) => {
    if (second.heat !== first.heat) return second.heat - first.heat;
    return second.picks - first.picks;
  });

const sendForumGarden = (response, selected = null) => {
  sendJson(response, 200, {
    phrases: publicForumGarden(),
    selected,
  });
};

const pickForumGardenPhrase = async (response) => {
  const phrases = publicForumGarden();
  const totalWeight = phrases.reduce(
    (total, phrase) => total + Math.max(1, phrase.heat),
    0,
  );
  let cursor = Math.random() * totalWeight;
  const picked =
    phrases.find((phrase) => {
      cursor -= Math.max(1, phrase.heat);
      return cursor <= 0;
    }) || phrases[0];
  if (picked) {
    forumGarden[picked.id].heat += 1;
    forumGarden[picked.id].picks += 1;
    await persistForumGarden();
  }
  sendForumGarden(response, picked || null);
};

const viewForumGardenPhrase = async (id, response) => {
  const phrase = forumGarden[id];
  if (!phrase) {
    sendJson(response, 404, {
      code: "FORUM_GARDEN_NOT_FOUND",
      message: "没有找到这朵话语。",
    });
    return;
  }
  phrase.heat += 1;
  await persistForumGarden();
  sendForumGarden(response, phrase);
};

const normalizeSubmissionType = (value) => {
  const type = String(value || "").trim();
  return ["blog-letter", "forum-reply", "faq-question"].includes(type)
    ? type
    : "";
};

const sanitizeText = (value, maxLength) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const createContentSubmission = async (request, response) => {
  let body;
  try {
    body = await parseJsonBody(request);
  } catch (error) {
    sendJson(response, error.message === "REQUEST_TOO_LARGE" ? 413 : 400, {
      code: error.message,
      message: "投稿内容格式不正确。",
    });
    return;
  }

  const type = normalizeSubmissionType(body.type);
  const title = sanitizeText(body.title, 120);
  const message = sanitizeText(body.message || body.details, 1200);
  const source = sanitizeText(body.source, 120);
  const visibility = body.visibility === "real" ? "real" : "anonymous";
  const account = accountService.getBrowserAccount(request);

  if (!type || !message || (type !== "forum-reply" && !title)) {
    sendJson(response, 400, {
      code: "INVALID_SUBMISSION",
      message: "请补全要刊登的内容。",
    });
    return;
  }

  if (visibility === "real" && !account) {
    sendJson(response, 401, {
      code: "LOGIN_REQUIRED",
      message: "实名刊登需要先登录种种账号。",
    });
    return;
  }

  if (type === "forum-reply") {
    const moderation = moderateForumReply(message, {
      hasSticker: /^\[表情\]/.test(message),
    });
    if (!moderation.ok) {
      sendJson(response, 422, {
        code: "MODERATION_REJECTED",
        message: moderation.reason,
      });
      return;
    }
  }

  const now = new Date().toISOString();
  const submission = {
    id: randomUUID(),
    type,
    status: "pending",
    visibility,
    publicAuthor:
      visibility === "real" && account ? account.nickname : "匿名来信",
    accountId: account?.id || null,
    accountEmail: account?.email || null,
    title,
    message,
    source,
    createdAt: now,
    updatedAt: now,
  };

  contentSubmissions.unshift(submission);
  await persistContentSubmissions();

  sendJson(response, 201, {
    submission: {
      id: submission.id,
      status: submission.status,
      publicAuthor: submission.publicAuthor,
      createdAt: submission.createdAt,
    },
  });
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const sendText = (response, statusCode, text) => {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(text);
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

const parseJsonBody = async (request) => {
  const rawBody = await readRequestBody(request);
  try {
    return JSON.parse(rawBody || "{}");
  } catch {
    throw new Error("INVALID_JSON");
  }
};

const formatAmount = (amountInCents) => (amountInCents / 100).toFixed(2);

const createTradeNumber = () => {
  const time = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `ZZ${time}${randomBytes(6).toString("hex").toUpperCase()}`;
};

const isRateLimited = (request) => {
  const forwarded = request.headers["x-forwarded-for"];
  const address = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim() || request.socket.remoteAddress || "local";
  const now = Date.now();
  const recent = (createOrderAttempts.get(address) || []).filter(
    (timestamp) => now - timestamp < 60_000,
  );
  recent.push(now);
  createOrderAttempts.set(address, recent);
  return recent.length > 10;
};

const isTrustedPaymentOrigin = (request) => {
  const origin = request.headers.origin;
  if (!origin) return true;

  try {
    const requestOrigin = new URL(
      `http://${request.headers.host || `127.0.0.1:${port}`}`,
    ).origin;
    const publicOrigin = new URL(alipayConfig.publicBaseUrl).origin;
    return origin === requestOrigin || origin === publicOrigin;
  } catch {
    return false;
  }
};

const isTrustedSiteOrigin = (request) => {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
};

const createAlipayOrder = async (request, response) => {
  if (!isTrustedPaymentOrigin(request)) {
    sendJson(response, 403, {
      code: "ORIGIN_NOT_ALLOWED",
      message: "请从种种文创超市发起结算。",
    });
    return;
  }

  if (isRateLimited(request)) {
    sendJson(response, 429, {
      code: "TOO_MANY_ORDERS",
      message: "操作太频繁，请稍后再试。",
    });
    return;
  }

  if (!alipaySdk) {
    sendJson(response, 503, {
      code: "ALIPAY_NOT_CONFIGURED",
      message: "支付宝商户参数尚未配置。",
    });
    return;
  }

  let items;
  let delivery;
  try {
    const body = await parseJsonBody(request);
    items = normalizePaymentCart(body.items);
    delivery = normalizeDelivery(body.delivery);
  } catch (error) {
    const statusCode = error.message === "REQUEST_TOO_LARGE" ? 413 : 400;
    const invalidDelivery = error.message === "INVALID_DELIVERY";
    sendJson(response, statusCode, {
      code: invalidDelivery ? "INVALID_DELIVERY" : "INVALID_CART",
      message: invalidDelivery
        ? "请检查收件人、手机号和收货地址。"
        : "购物车数据无效，请刷新后重试。",
    });
    return;
  }

  const totalInCents = items.reduce(
    (total, item) => total + item.unitPriceInCents * item.quantity,
    0,
  );
  const outTradeNo = createTradeNumber();
  const totalAmount = formatAmount(totalInCents);
  const subject =
    items.length === 1
      ? `种种文创｜${items[0].name}`
      : `种种文创｜${items.length} 类商品`;

  orders[outTradeNo] = {
    outTradeNo,
    status: "pending",
    totalAmount,
    totalInCents,
    items,
    delivery,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
  await persistOrders();

  try {
    const paymentUrl = await alipaySdk.pageExecute(
      "alipay.trade.page.pay",
      "GET",
      {
        bizContent: {
          out_trade_no: outTradeNo,
          product_code: "FAST_INSTANT_TRADE_PAY",
          subject,
          body: items
            .map((item) => `${item.name}×${item.quantity}`)
            .join("，")
            .slice(0, 128),
          total_amount: totalAmount,
          timeout_express: "15m",
        },
        returnUrl: `${alipayConfig.publicBaseUrl}/payment/alipay/return`,
        notifyUrl: `${alipayConfig.publicBaseUrl}/api/alipay/notify`,
      },
    );

    sendJson(response, 201, {
      outTradeNo,
      paymentUrl,
    });
  } catch (error) {
    orders[outTradeNo].status = "failed";
    orders[outTradeNo].failureReason = "payment_url_generation_failed";
    await persistOrders();
    console.error(`生成支付宝支付链接失败：${error.message}`);
    sendJson(response, 502, {
      code: "ALIPAY_ORDER_FAILED",
      message: "暂时无法创建支付宝订单，请稍后再试。",
    });
  }
};

const verifyAlipayPayload = (payload) => {
  if (!alipaySdk || !alipaySdk.checkNotifySignV2(payload)) return false;
  if (payload.app_id !== alipayConfig.appId) return false;
  if (alipayConfig.sellerId && payload.seller_id !== alipayConfig.sellerId) {
    return false;
  }
  return true;
};

const receiveAlipayNotification = async (request, response) => {
  if (!alipaySdk) {
    sendText(response, 503, "failure");
    return;
  }

  let payload;
  try {
    payload = Object.fromEntries(
      new URLSearchParams(await readRequestBody(request)).entries(),
    );
  } catch {
    sendText(response, 400, "failure");
    return;
  }

  if (!verifyAlipayPayload(payload)) {
    sendText(response, 400, "failure");
    return;
  }

  const order = orders[payload.out_trade_no];
  const nextStatus = mapAlipayTradeStatus(payload.trade_status);
  if (
    !order ||
    nextStatus !== "paid" ||
    !isOrderAmountEqual(order, payload.total_amount) ||
    (order.tradeNo && order.tradeNo !== payload.trade_no)
  ) {
    sendText(response, 400, "failure");
    return;
  }

  order.status = "paid";
  order.tradeNo = payload.trade_no;
  order.paidAt = payload.gmt_payment || new Date().toISOString();
  await persistOrders();
  sendText(response, 200, "success");
};

const handleAlipayReturn = (url, response) => {
  const payload = Object.fromEntries(url.searchParams.entries());
  const isVerified = verifyAlipayPayload(payload);
  const outTradeNo = payload.out_trade_no || "";
  const params = new URLSearchParams({
    payment: isVerified ? "returned" : "invalid",
  });
  if (isVerified && outTradeNo) params.set("out_trade_no", outTradeNo);
  response.writeHead(303, {
    Location: `/shop.html?${params.toString()}`,
  });
  response.end();
};

const refreshAlipayOrder = async (order) => {
  if (!alipaySdk || order.status !== "pending") return;

  const lastCheckedAt = Date.parse(order.lastCheckedAt || "");
  if (Number.isFinite(lastCheckedAt) && Date.now() - lastCheckedAt < 1800) {
    return;
  }

  order.lastCheckedAt = new Date().toISOString();
  try {
    const result = await alipaySdk.exec(
      "alipay.trade.query",
      {
        bizContent: {
          out_trade_no: order.outTradeNo,
        },
      },
      { validateSign: true },
    );

    if (result.code !== "10000") {
      if (result.subCode !== "ACQ.TRADE_NOT_EXIST") {
        order.lastQueryError = result.subCode || result.code || "QUERY_FAILED";
      }
      await persistOrders();
      return;
    }

    if (
      result.outTradeNo !== order.outTradeNo ||
      !isOrderAmountEqual(order, result.totalAmount)
    ) {
      order.status = "review";
      order.lastQueryError = "ORDER_MISMATCH";
      await persistOrders();
      return;
    }

    const nextStatus = mapAlipayTradeStatus(result.tradeStatus);
    order.status = nextStatus;
    order.tradeNo = result.tradeNo || order.tradeNo;
    if (nextStatus === "paid") {
      order.paidAt = order.paidAt || new Date().toISOString();
    }
    await persistOrders();
  } catch (error) {
    order.lastQueryError = "QUERY_UNAVAILABLE";
    console.error(`查询支付宝订单失败：${error.message}`);
    await persistOrders();
  }
};

const sendOrderStatus = async (outTradeNo, response) => {
  const order = orders[outTradeNo];
  if (!order) {
    sendJson(response, 404, {
      code: "ORDER_NOT_FOUND",
      message: "没有找到该订单。",
    });
    return;
  }

  if (order.status === "pending") {
    await refreshAlipayOrder(order);
    if (
      order.status === "pending" &&
      Date.parse(order.expiresAt || "") <= Date.now()
    ) {
      order.status = "expired";
      await persistOrders();
    }
  }

  sendJson(response, 200, {
    outTradeNo: order.outTradeNo,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
  });
};

const serveStaticFile = async (url, response) => {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const blocked =
    pathname.startsWith("/.") ||
    pathname.startsWith("/certs/") ||
    pathname.startsWith("/data/") ||
    pathname.endsWith(".mjs") ||
    ["/server.mjs", "/package.json", "/package-lock.json"].includes(pathname);
  if (blocked) {
    sendText(response, 404, "Not found");
    return;
  }

  const filePath = resolve(rootDirectory, `.${pathname}`);
  if (!filePath.startsWith(`${rootDirectory}${sep}`)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw new Error("NOT_A_FILE");
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": content.length,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    response.end(content);
  } catch {
    sendText(response, 404, "Not found");
  }
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  accountService.applyCors(request, response, url);

  try {
    if (await accountService.handle(request, response, url)) return;

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        alipayConfigured: isAlipayConfigured,
        analytics: { database: "sqlite" },
        account: accountService.health(),
      });
      return;
    }

    if (
      request.method === "POST" &&
      ["/api/analytics/view", "/api/analytics/heat"].includes(url.pathname)
    ) {
      if (!isTrustedSiteOrigin(request)) {
        sendJson(response, 403, {
          code: "ORIGIN_NOT_ALLOWED",
          message: "请从种种大世界记录互动。",
        });
        return;
      }
      let body;
      try {
        body = await parseJsonBody(request);
        const stats =
          url.pathname === "/api/analytics/view"
            ? analyticsService.recordView(request, response, body.pageKey)
            : analyticsService.stampHeat(request, response, body.pageKey);
        sendJson(response, 200, stats);
      } catch (error) {
        if (error.message !== "INVALID_PAGE_KEY") throw error;
        sendJson(response, 400, {
          code: "INVALID_PAGE_KEY",
          message: "页面标识不正确。",
        });
      }
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/analytics/stats"
    ) {
      try {
        sendJson(
          response,
          200,
          analyticsService.getStats(
            request,
            response,
            url.searchParams.get("page"),
          ),
        );
      } catch (error) {
        if (error.message !== "INVALID_PAGE_KEY") throw error;
        sendJson(response, 400, {
          code: "INVALID_PAGE_KEY",
          message: "页面标识不正确。",
        });
      }
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/analytics/summary"
    ) {
      sendJson(response, 200, { pages: analyticsService.summary() });
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/content/submissions"
    ) {
      await createContentSubmission(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/forum/garden") {
      sendForumGarden(response);
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/forum/garden/random"
    ) {
      await pickForumGardenPhrase(response);
      return;
    }

    const forumGardenMatch = url.pathname.match(
      /^\/api\/forum\/garden\/([a-z0-9_-]+)\/view$/i,
    );
    if (request.method === "POST" && forumGardenMatch) {
      await viewForumGardenPhrase(forumGardenMatch[1], response);
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/alipay/create-order"
    ) {
      await createAlipayOrder(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/alipay/notify") {
      await receiveAlipayNotification(request, response);
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/payment/alipay/return"
    ) {
      handleAlipayReturn(url, response);
      return;
    }

    const orderStatusMatch = url.pathname.match(
      /^\/api\/alipay\/orders\/([A-Z0-9]+)$/,
    );
    if (request.method === "GET" && orderStatusMatch) {
      await sendOrderStatus(orderStatusMatch[1], response);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStaticFile(url, response);
      return;
    }

    sendJson(response, 405, {
      code: "METHOD_NOT_ALLOWED",
      message: "不支持该请求方式。",
    });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, {
        code: "INTERNAL_ERROR",
        message: "服务暂时不可用。",
      });
    } else {
      response.end();
    }
  }
});

server.listen(port, host, () => {
  console.log(`种种大世界：http://127.0.0.1:${port}`);
  console.log(`统一账号：已载入 ${accountService.health().clientCount} 个产品`);
  console.log(
    isAlipayConfigured
      ? "支付宝支付：已读取配置"
      : "支付宝支付：等待 .env 商户配置",
  );
});
