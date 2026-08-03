import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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
import { getSupabaseAdminClient } from "./supabase-client.mjs";

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(rootDirectory, "..");
const publicDirectory = resolve(projectRoot, "public");
let ordersFile;

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
  const envPath = resolve(projectRoot, ".env");
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
  ? resolve(projectRoot, process.env.RUNTIME_DATA_ROOT.trim())
  : process.env.VERCEL
    ? resolve("/tmp", "zhongzhong-world")
    : projectRoot;

ordersFile = resolve(
  runtimeDataRoot,
  process.env.PAYMENT_ORDERS_FILE || "data/orders.json",
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
  const absolutePath = resolve(projectRoot, configuredPath);
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
  rootDirectory: projectRoot,
  dataDirectory: runtimeDataRoot,
  localBaseUrl: accountBaseUrl,
});
const analyticsService = await createAnalyticsService({
  rootDirectory: projectRoot,
  dataDirectory: runtimeDataRoot,
});

let orders = {};
let persistQueue = Promise.resolve();
const createOrderAttempts = new Map();
const forumMutationAttempts = new Map();

const isForumRateLimited = (request, action, limit = 10) => {
  const address = request.socket.remoteAddress || "local";
  const key = `${action}:${address}`;
  const now = Date.now();
  const recent = (forumMutationAttempts.get(key) || []).filter((time) => now - time < 60_000);
  recent.push(now);
  forumMutationAttempts.set(key, recent);
  return recent.length > limit;
};

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

const seedForumGarden = async () => {
  try {
    const supabase = getSupabaseAdminClient();
    const rows = Object.values(defaultForumGarden).map((phrase) => ({
      id: phrase.id,
      post_id: phrase.postId,
      text: phrase.text,
      speaker: phrase.speaker,
      avatar: phrase.avatar,
      heat: 0,
      picks: 0,
    }));
    const { error } = await supabase
      .from("zz_forum_garden_phrases")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
  } catch (error) {
    console.error(`初始化话语花园失败：${error.message}`);
  }
};

const loadForumGarden = async () => {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("zz_forum_garden_phrases")
      .select("*");
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (error.message === "SUPABASE_NOT_CONFIGURED") {
      console.error("话语花园：等待 Supabase 配置");
    } else {
      console.error(`读取话语花园失败：${error.message}`);
    }
    return [];
  }
};

await seedForumGarden();

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

const mapGardenRow = (row) => ({
  id: row.id,
  postId: row.post_id,
  text: row.text,
  speaker: row.speaker,
  avatar: row.avatar,
  heat: row.heat,
  picks: row.picks,
});

const publicForumGarden = async () => {
  const rows = await loadForumGarden();
  return rows.map(mapGardenRow).sort((first, second) => {
    if (second.heat !== first.heat) return second.heat - first.heat;
    return second.picks - first.picks;
  });
};

const sendForumGarden = async (response, selected = null) => {
  sendJson(response, 200, {
    phrases: await publicForumGarden(),
    selected,
  });
};

const pickForumGardenPhrase = async (response) => {
  const phrases = await publicForumGarden();
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
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.rpc("increment_garden_heat", {
        phrase_id: picked.id,
      });
      if (error) throw error;
    } catch (error) {
      console.error(`更新话语花园热度失败：${error.message}`);
    }
  }
  sendForumGarden(response, picked || null);
};

const viewForumGardenPhrase = async (id, response) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("zz_forum_garden_phrases")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      sendJson(response, 404, {
        code: "FORUM_GARDEN_NOT_FOUND",
        message: "没有找到这朵话语。",
      });
      return;
    }
    const { error: updateError } = await supabase.rpc("increment_garden_heat", {
      phrase_id: id,
    });
    if (updateError) throw updateError;
    sendForumGarden(response, mapGardenRow(data));
  } catch (error) {
    console.error(`查看话语花园失败：${error.message}`);
    sendJson(response, 500, {
      code: "INTERNAL_ERROR",
      message: "服务暂时不可用。",
    });
  }
};

const normalizeSubmissionType = (value) => {
  const type = String(value || "").trim();
  return ["blog-letter", "forum-reply", "faq-question"].includes(type)
    ? type
    : "";
};

const mapForumAuthor = (user) => ({
  id: user?.id || null,
  name: user?.display_name || user?.name || "无名旅人",
});

const mapForumPost = (row) => ({
  id: row.id,
  categoryId: row.category_id,
  title: row.title,
  body: row.body,
  status: row.status,
  isPinned: row.is_pinned,
  isLocked: row.is_locked,
  replyCount: row.reply_count,
  likeCount: row.like_count,
  likedByMe: Boolean(row.liked_by_me),
  lastRepliedAt: row.last_replied_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: mapForumAuthor(row.author),
});

const mapForumReply = (row) => ({
  id: row.id,
  postId: row.post_id,
  parentId: row.parent_id,
  body: row.body,
  status: row.status,
  likeCount: row.like_count,
  likedByMe: Boolean(row.liked_by_me),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: mapForumAuthor(row.author),
});

const forumUserId = (request) => accountService.getBrowserAccount(request)?.id || null;

const applyForumLike = async (request, response, targetType, targetId, shouldLike) => {
  const account = requireForumAccount(request, response);
  if (!account) return;
  const supabase = getSupabaseAdminClient();
  const table = targetType === "post" ? "zz_forum_post_likes" : "zz_forum_reply_likes";
  const key = targetType === "post" ? "post_id" : "reply_id";
  const countTable = targetType === "post" ? "zz_forum_posts" : "zz_forum_replies";
  const { error } = shouldLike
    ? await supabase.from(table).upsert({ [key]: targetId, user_id: account.id }, { onConflict: `${key},user_id` })
    : await supabase.from(table).delete().eq(key, targetId).eq("user_id", account.id);
  if (error) throw error;
  const { count, error: countError } = await supabase.from(table).select(key, { count: "exact", head: true }).eq(key, targetId);
  if (countError) throw countError;
  const { error: updateError } = await supabase.from(countTable).update({ like_count: count || 0 }).eq("id", targetId);
  if (updateError) throw updateError;
  sendJson(response, 200, { liked: shouldLike, likeCount: count || 0 });
};

const createForumReport = async (request, response, targetType, targetId) => {
  const account = requireForumAccount(request, response);
  if (!account) return;
  let body;
  try { body = await parseJsonBody(request); } catch { sendJson(response, 400, { code: "INVALID_JSON", message: "举报信息格式不正确。" }); return; }
  const reason = sanitizeText(body.reason, 500);
  if (!reason) { sendJson(response, 400, { code: "INVALID_REPORT", message: "请填写举报原因。" }); return; }
  const supabase = getSupabaseAdminClient();
  const payload = { reporter_id: account.id, reason, ...(targetType === "post" ? { post_id: targetId } : { reply_id: targetId }) };
  const { error } = await supabase.from("zz_forum_reports").insert(payload);
  if (error) throw error;
  sendJson(response, 201, { reported: true });
};

const sendForumCategories = async (response) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("zz_forum_categories")
    .select("id, slug, name, description, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  sendJson(response, 200, { categories: data || [] });
};

const sendForumPosts = async (url, response) => {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") || "20", 10) || 20));
  const category = String(url.searchParams.get("category") || "").trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("zz_forum_posts")
    .select("*, author:users!zz_forum_posts_author_id_fkey(id, name, display_name)", { count: "exact" })
    .eq("status", "published");
  if (category) query = query.eq("category_id", category);
  const { data, error, count } = await query
    .order("is_pinned", { ascending: false })
    .order("last_replied_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  sendJson(response, 200, {
    items: (data || []).map(mapForumPost),
    page,
    pageSize,
    total: count || 0,
  });
};

const applyForumLikeV2 = async (request, response, kind, targetId, shouldLike) =>{
  const account = requireForumAccount(request, response);
  if (!account) return;
  const supabase = getSupabaseAdminClient();
  const table = kind === "post" ? "zz_forum_post_likes" : "zz_forum_reply_likes";
  const targetColumn = kind === "post" ? "post_id" : "reply_id";
  const countTable = kind === "post" ? "zz_forum_posts" : "zz_forum_replies";
  if (shouldLike) {
    const { error } = await supabase.from(table).upsert({ [targetColumn]: targetId, user_id: account.id }, { onConflict: `${targetColumn},user_id` });
    if (error) throw error;
  } else {
    const { error } = await supabase.from(table).delete().eq(targetColumn, targetId).eq("user_id", account.id);
    if (error) throw error;
  }
  const { count, error: countError } = await supabase.from(table).select(targetColumn, { count: "exact", head: true }).eq(targetColumn, targetId);
  if (countError) throw countError;
  const { error: updateError } = await supabase.from(countTable).update({ like_count: count || 0 }).eq("id", targetId);
  if (updateError) throw updateError;
  sendJson(response, 200, { liked: shouldLike, likeCount: count || 0 });
};

const createForumReportV2 = async (request, response, kind, targetId) =>{
  const account = requireForumAccount(request, response);
  if (!account) return;
  let body;
  try { body = await parseJsonBody(request); } catch { sendJson(response, 400, { code: "INVALID_JSON", message: "举报格式不正确。" }); return; }
  const reason = sanitizeText(body.reason, 500);
  if (!reason) { sendJson(response, 400, { code: "INVALID_REPORT", message: "请填写举报原因。" }); return; }
  const supabase = getSupabaseAdminClient();
  const payload = { reporter_id: account.id, reason, [kind === "post" ? "post_id" : "reply_id"]: targetId };
  const { data, error } = await supabase.from("zz_forum_reports").insert(payload).select("id, status, created_at").single();
  if (error) throw error;
  sendJson(response, 201, { report: data });
};

const requireForumAccount = (request, response) => {
  const account = accountService.getBrowserAccount(request);
  if (account) return account;
  sendJson(response, 401, {
    code: "LOGIN_REQUIRED",
    message: "请先登录后再参与社区。",
  });
  return null;
};

const createForumPost = async (request, response) => {
  if (isForumRateLimited(request, "post", 5)) { sendJson(response, 429, { code: "TOO_MANY_FORUM_REQUESTS", message: "发帖太频繁，请稍后再试。" }); return; }
  const account = requireForumAccount(request, response);
  if (!account) return;

  let body;
  try {
    body = await parseJsonBody(request);
  } catch (error) {
    sendJson(response, error.message === "REQUEST_TOO_LARGE" ? 413 : 400, {
      code: error.message,
      message: "帖子内容格式不正确。",
    });
    return;
  }

  const categoryId = String(body.categoryId || "").trim();
  const title = sanitizeText(body.title, 120);
  const content = sanitizeText(body.body, 20000);
  if (!categoryId || !title || !content) {
    sendJson(response, 400, {
      code: "INVALID_FORUM_POST",
      message: "请填写分区、标题和正文。",
    });
    return;
  }

  const moderation = moderateForumReply(content, { hasSticker: false });
  if (!moderation.ok) {
    sendJson(response, 422, {
      code: "MODERATION_REJECTED",
      message: moderation.reason,
    });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: category, error: categoryError } = await supabase
      .from("zz_forum_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("is_active", true)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) {
      sendJson(response, 400, {
        code: "INVALID_FORUM_CATEGORY",
        message: "这个社区分区不存在。",
      });
      return;
    }

    const { data, error } = await supabase
      .from("zz_forum_posts")
      .insert({ category_id: categoryId, author_id: account.id, title, body: content })
      .select("*, author:users!zz_forum_posts_author_id_fkey(id, name, display_name)")
      .single();
    if (error) throw error;
    sendJson(response, 201, { post: mapForumPost(data) });
  } catch (error) {
    console.error(`创建社区帖子失败：${error.message}`);
    sendJson(response, 500, {
      code: "INTERNAL_ERROR",
      message: "帖子暂时无法发布。",
    });
  }
};

const createForumReply = async (postId, request, response) => {
  if (isForumRateLimited(request, "reply", 20)) { sendJson(response, 429, { code: "TOO_MANY_FORUM_REQUESTS", message: "回复太频繁，请稍后再试。" }); return; }
  const account = requireForumAccount(request, response);
  if (!account) return;

  let body;
  try {
    body = await parseJsonBody(request);
  } catch (error) {
    sendJson(response, error.message === "REQUEST_TOO_LARGE" ? 413 : 400, {
      code: error.message,
      message: "回复内容格式不正确。",
    });
    return;
  }

  const content = sanitizeText(body.body, 20000);
  const parentId = String(body.parentId || "").trim() || null;
  if (!content) {
    sendJson(response, 400, {
      code: "INVALID_FORUM_REPLY",
      message: "请输入回复内容。",
    });
    return;
  }
  const moderation = moderateForumReply(content, { hasSticker: false });
  if (!moderation.ok) {
    sendJson(response, 422, {
      code: "MODERATION_REJECTED",
      message: moderation.reason,
    });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: post, error: postError } = await supabase
      .from("zz_forum_posts")
      .select("id, is_locked, status")
      .eq("id", postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!post || post.status !== "published") {
      sendJson(response, 404, { code: "FORUM_POST_NOT_FOUND", message: "没有找到这篇帖子。" });
      return;
    }
    if (post.is_locked) {
      sendJson(response, 409, { code: "FORUM_POST_LOCKED", message: "这篇帖子已经锁定，暂时不能回复。" });
      return;
    }
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from("zz_forum_replies")
        .select("id")
        .eq("id", parentId)
        .eq("post_id", postId)
        .eq("status", "published")
        .maybeSingle();
      if (parentError) throw parentError;
      if (!parent) {
        sendJson(response, 400, { code: "INVALID_PARENT_REPLY", message: "引用的回复不存在。" });
        return;
      }
    }

    const { data, error } = await supabase
      .from("zz_forum_replies")
      .insert({ post_id: postId, author_id: account.id, parent_id: parentId, body: content })
      .select("*, author:users!zz_forum_replies_author_id_fkey(id, name, display_name)")
      .single();
    if (error) throw error;

    const { count, error: countError } = await supabase
      .from("zz_forum_replies")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("status", "published");
    if (countError) throw countError;
    const { error: updateError } = await supabase
      .from("zz_forum_posts")
      .update({ reply_count: count || 0, last_replied_at: data.created_at, updated_at: data.created_at })
      .eq("id", postId);
    if (updateError) throw updateError;

    sendJson(response, 201, { reply: mapForumReply(data) });
  } catch (error) {
    console.error(`创建社区回复失败：${error.message}`);
    sendJson(response, 500, {
      code: "INTERNAL_ERROR",
      message: "回复暂时无法发布。",
    });
  }
};

const requireForumAdmin = async (request, response) => {
  const account = requireForumAccount(request, response);
  if (!account) return null;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", account.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    sendJson(response, 403, { code: "ADMIN_REQUIRED", message: "需要管理员权限。" });
    return null;
  }
  return { account, role: data.role };
};

const updateForumPost = async (postId, request, response) => {
  const account = requireForumAccount(request, response);
  if (!account) return;
  let body;
  try { body = await parseJsonBody(request); } catch { sendJson(response, 400, { code: "INVALID_JSON", message: "请求格式不正确。" }); return; }
  const updates = {};
  if (body.title !== undefined) updates.title = sanitizeText(body.title, 120);
  if (body.body !== undefined) updates.body = sanitizeText(body.body, 20000);
  if (!updates.title && !updates.body) { sendJson(response, 400, { code: "INVALID_FORUM_POST", message: "没有可更新的内容。" }); return; }
  const supabase = getSupabaseAdminClient();
  const { data: post, error: postError } = await supabase.from("zz_forum_posts").select("author_id").eq("id", postId).maybeSingle();
  if (postError) throw postError;
  if (!post) { sendJson(response, 404, { code: "FORUM_POST_NOT_FOUND", message: "没有找到这篇帖子。" }); return; }
  if (post.author_id !== account.id) { sendJson(response, 403, { code: "FORUM_AUTHOR_REQUIRED", message: "只能修改自己的帖子。" }); return; }
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from("zz_forum_posts").update(updates).eq("id", postId).select("*, author:users!zz_forum_posts_author_id_fkey(id, name, display_name)").single();
  if (error) throw error;
  sendJson(response, 200, { post: mapForumPost(data) });
};

const deleteForumPost = async (postId, request, response) => {
  const account = requireForumAccount(request, response);
  if (!account) return;
  const supabase = getSupabaseAdminClient();
  const { data: post, error } = await supabase.from("zz_forum_posts").select("author_id").eq("id", postId).maybeSingle();
  if (error) throw error;
  if (!post) { sendJson(response, 404, { code: "FORUM_POST_NOT_FOUND", message: "没有找到这篇帖子。" }); return; }
  if (post.author_id !== account.id) { sendJson(response, 403, { code: "FORUM_AUTHOR_REQUIRED", message: "只能删除自己的帖子。" }); return; }
  const { error: updateError } = await supabase.from("zz_forum_posts").update({ status: "deleted", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", postId);
  if (updateError) throw updateError;
  sendJson(response, 200, { deleted: true });
};

const deleteForumReply = async (replyId, request, response) => {
  const account = requireForumAccount(request, response);
  if (!account) return;
  const supabase = getSupabaseAdminClient();
  const { data: reply, error } = await supabase.from("zz_forum_replies").select("author_id, post_id").eq("id", replyId).maybeSingle();
  if (error) throw error;
  if (!reply) { sendJson(response, 404, { code: "FORUM_REPLY_NOT_FOUND", message: "没有找到这条回复。" }); return; }
  if (reply.author_id !== account.id) { sendJson(response, 403, { code: "FORUM_AUTHOR_REQUIRED", message: "只能删除自己的回复。" }); return; }
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from("zz_forum_replies").update({ status: "deleted", deleted_at: now, updated_at: now }).eq("id", replyId);
  if (updateError) throw updateError;
  const { count } = await supabase.from("zz_forum_replies").select("id", { count: "exact", head: true }).eq("post_id", reply.post_id).eq("status", "published");
  await supabase.from("zz_forum_posts").update({ reply_count: count || 0, updated_at: now }).eq("id", reply.post_id);
  sendJson(response, 200, { deleted: true });
};

const updateForumAdmin = async (kind, targetId, request, response) => {
  if (!await requireForumAdmin(request, response)) return;
  let body;
  try { body = await parseJsonBody(request); } catch { sendJson(response, 400, { code: "INVALID_JSON", message: "请求格式不正确。" }); return; }
  const updates = {};
  if (kind === "post") {
    for (const field of ["is_pinned", "is_locked"]) if (typeof body[field] === "boolean") updates[field] = body[field];
    if (["published", "hidden", "deleted"].includes(body.status)) updates.status = body.status;
    if (!Object.keys(updates).length) { sendJson(response, 400, { code: "INVALID_ADMIN_UPDATE", message: "没有可更新的管理状态。" }); return; }
    updates.updated_at = new Date().toISOString();
    const { error } = await getSupabaseAdminClient().from("zz_forum_posts").update(updates).eq("id", targetId);
    if (error) throw error;
  } else {
    if (!["published", "hidden", "deleted"].includes(body.status)) { sendJson(response, 400, { code: "INVALID_ADMIN_UPDATE", message: "回复状态不正确。" }); return; }
    const { error } = await getSupabaseAdminClient().from("zz_forum_replies").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", targetId);
    if (error) throw error;
  }
  sendJson(response, 200, { updated: true });
};

const sendForumPost = async (postId, response) => {
  const supabase = getSupabaseAdminClient();
  const { data: post, error: postError } = await supabase
    .from("zz_forum_posts")
    .select("*, author:users!zz_forum_posts_author_id_fkey(id, name, display_name)")
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();
  if (postError) throw postError;
  if (!post) {
    sendJson(response, 404, { code: "FORUM_POST_NOT_FOUND", message: "没有找到这篇帖子。" });
    return;
  }
  const { data: replies, error: replyError } = await supabase
    .from("zz_forum_replies")
    .select("*, author:users!zz_forum_replies_author_id_fkey(id, name, display_name)")
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (replyError) throw replyError;
  sendJson(response, 200, { post: mapForumPost(post), replies: (replies || []).map(mapForumReply) });
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
    type,
    status: "pending",
    visibility,
    public_author:
      visibility === "real" && account ? account.nickname : "匿名来信",
    account_id: account?.id || null,
    account_email: account?.email || null,
    title,
    message,
    source,
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("zz_content_submissions")
      .insert({
        ...submission,
        created_at: now,
        updated_at: now,
      })
      .select("id, status, public_author, created_at")
      .single();
    if (error) throw error;
    sendJson(response, 201, {
      submission: {
        id: data.id,
        status: data.status,
        publicAuthor: data.public_author,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error(`创建投稿失败：${error.message}`);
    sendJson(response, 500, {
      code: "INTERNAL_ERROR",
      message: "服务暂时不可用。",
    });
  }
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

  const filePath = resolve(publicDirectory, `.${pathname}`);
  if (!filePath.startsWith(`${publicDirectory}${sep}`)) {
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

    if (request.method === "GET" && url.pathname === "/api/forum/categories") {
      await sendForumCategories(response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/forum/posts") {
      await sendForumPosts(url, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/forum/posts") {
      await createForumPost(request, response);
      return;
    }

    const forumReplyMatch = url.pathname.match(/^\/api\/forum\/posts\/([a-f0-9-]+)\/replies$/i);
    if (request.method === "POST" && forumReplyMatch) {
      await createForumReply(forumReplyMatch[1], request, response);
      return;
    }

    const forumAdminPostMatch = url.pathname.match(/^\/api\/forum\/admin\/posts\/([a-f0-9-]+)$/i);
    if (["PATCH"].includes(request.method) && forumAdminPostMatch) {
      await updateForumAdmin("post", forumAdminPostMatch[1], request, response);
      return;
    }
    const forumAdminReplyMatch = url.pathname.match(/^\/api\/forum\/admin\/replies\/([a-f0-9-]+)$/i);
    if (request.method === "PATCH" && forumAdminReplyMatch) {
      await updateForumAdmin("reply", forumAdminReplyMatch[1], request, response);
      return;
    }
    const forumEditMatch = url.pathname.match(/^\/api\/forum\/posts\/([a-f0-9-]+)$/i);
    if (request.method === "PATCH" && forumEditMatch) {
      await updateForumPost(forumEditMatch[1], request, response);
      return;
    }
    const forumDeletePostMatch = url.pathname.match(/^\/api\/forum\/posts\/([a-f0-9-]+)$/i);
    if (request.method === "DELETE" && forumDeletePostMatch) {
      await deleteForumPost(forumDeletePostMatch[1], request, response);
      return;
    }
    const forumDeleteReplyMatch = url.pathname.match(/^\/api\/forum\/replies\/([a-f0-9-]+)$/i);
    if (request.method === "DELETE" && forumDeleteReplyMatch) {
      await deleteForumReply(forumDeleteReplyMatch[1], request, response);
      return;
    }

    const forumLikeMatch = url.pathname.match(/^\/api\/forum\/(posts|replies)\/([a-f0-9-]+)\/like$/i);
    if (forumLikeMatch && ["POST", "DELETE"].includes(request.method)) {
      await applyForumLike(request, response, forumLikeMatch[1] === "posts" ? "post" : "reply", forumLikeMatch[2], request.method === "POST");
      return;
    }

    const forumReportMatch = url.pathname.match(/^\/api\/forum\/(posts|replies)\/([a-f0-9-]+)\/report$/i);
    if (request.method === "POST" && forumReportMatch) {
      await createForumReport(request, response, forumReportMatch[1] === "posts" ? "post" : "reply", forumReportMatch[2]);
      return;
    }

    const forumPostMatch = url.pathname.match(/^\/api\/forum\/posts\/([a-f0-9-]+)$/i);
    if (request.method === "GET" && forumPostMatch) {
      await sendForumPost(forumPostMatch[1], response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/forum/garden") {
      await sendForumGarden(response);
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
