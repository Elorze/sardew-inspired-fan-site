import { createClient } from "@supabase/supabase-js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase().slice(0, 254);

const readEnv = (name) => String(process.env[name] || "").trim();

const getSupabaseConfig = () => {
  const url = readEnv("SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { url, anonKey, serviceRoleKey };
};

let adminClient = null;

const getAdminClient = () => {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return adminClient;
};

const getUserByEmail = async (email) => {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) return null;
  const response = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  const users = Array.isArray(data.users) ? data.users : [];
  return users.find((user) => normalizeEmail(user.email) === email) || null;
};

const createSession = async (userId, token, expiresAt) => {
  const admin = getAdminClient();
  const { error } = await admin.from("sessions").upsert(
    {
      token,
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(expiresAt).toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) throw error;
};

const upsertProfile = async ({ id, email, nickname }) => {
  const admin = getAdminClient();
  const displayName = String(nickname || "").trim();
  const name = displayName || email.split("@")[0] || "无名旅人";
  const { error } = await admin.from("users").upsert(
    {
      id,
      email,
      name,
      display_name: displayName || name,
      gender: "neutral",
      location_label: "远方",
      coords: null,
      invite_code: "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
};

export const createRemoteAccountService = () => {
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  const ready = Boolean(url && anonKey && serviceRoleKey);

  const login = async ({ email, password, nickname }) => {
    if (!ready) {
      return { ok: false, error: "SUPABASE_NOT_CONFIGURED", message: "统一账号服务未配置。" };
    }
    const normalizedEmail = normalizeEmail(email);
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      return { ok: false, error: "INVALID_CREDENTIALS", message: data.error_description || data.error || "邮箱或密码不正确。" };
    }

    const userId = data.user?.id;
    const userEmail = normalizeEmail(data.user?.email || normalizedEmail);
    if (!userId) {
      return { ok: false, error: "AUTH_FAILED", message: "登录失败。" };
    }

    await upsertProfile({ id: userId, email: userEmail, nickname });
    return { ok: true, userId, email: userEmail };
  };

  const register = async ({ email, password, nickname }) => {
    if (!ready) {
      return { ok: false, error: "SUPABASE_NOT_CONFIGURED", message: "统一账号服务未配置。" };
    }
    const normalizedEmail = normalizeEmail(email);
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      const loginResult = await login({ email: normalizedEmail, password, nickname });
      return loginResult.ok
        ? { ...loginResult, created: false }
        : { ok: false, error: "INVALID_CREDENTIALS", message: "邮箱或密码不正确。" };
    }

    const admin = getAdminClient();
    const created = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    if (created.error) {
      return { ok: false, error: "AUTH_FAILED", message: created.error.message || "注册失败。" };
    }
    const userId = created.data?.user?.id;
    if (!userId) {
      return { ok: false, error: "AUTH_FAILED", message: "注册失败。" };
    }
    await upsertProfile({ id: userId, email: normalizedEmail, nickname });
    return { ok: true, created: true, userId, email: normalizedEmail };
  };

  const changePassword = async ({ userId, newPassword }) => {
    if (!ready) {
      return { ok: false, error: "SUPABASE_NOT_CONFIGURED" };
    }
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) {
      return { ok: false, error: "AUTH_FAILED", message: error.message || "修改密码失败。" };
    }
    return { ok: true };
  };

  const createBrowserSession = async ({ userId, token, expiresAt }) => {
    if (!ready) throw new Error("SUPABASE_NOT_CONFIGURED");
    await createSession(userId, token, expiresAt);
  };

  return { ready, login, register, changePassword, createBrowserSession };
};
