const accountDialog = document.querySelector("#siteAccountDialog");
const accountForm = document.querySelector("#siteAccountForm");
const accountTriggers = document.querySelectorAll("[data-account-trigger]");
const accountClose = document.querySelector(".site-account-close");
const accountModeButtons = document.querySelectorAll("[data-account-mode]");
const accountNicknameField = document.querySelector(
  "[data-account-nickname-field]",
);
const accountNickname = document.querySelector("#siteAccountNickname");
const accountEmail = document.querySelector("#siteAccountEmail");
const accountPassword = document.querySelector("#siteAccountPassword");
const accountSubmit = document.querySelector("[data-account-submit]");
const accountSignout = document.querySelector("[data-account-signout]");
const accountSwitch = document.querySelector("[data-account-switch]");
const accountSignedOut = document.querySelector("[data-account-signed-out]");
const accountSignedIn = document.querySelector("[data-account-signed-in]");
const accountStatus = document.querySelector("[data-account-status]");
const accountLabels = document.querySelectorAll("[data-account-label]");
const accountAvatars = document.querySelectorAll("[data-account-avatar]");
const accountProfileAvatar = document.querySelector(
  "[data-account-profile-avatar]",
);
const accountActions = document.querySelector("[data-account-actions]");
const accountProfileName = document.querySelector("[data-account-profile-name]");
const accountProfileEmail = document.querySelector(
  "[data-account-profile-email]",
);

let accountMode = "login";
let accountSession = null;
let accountPending = false;
const isFilePreview = window.location.protocol === "file:";
const accountSearchParams = new URLSearchParams(window.location.search);
const accountIntent = accountSearchParams.get("account");
const requestedReturnTo = accountSearchParams.get("return_to") || "";

const getSafeReturnTo = (value) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  try {
    const target = new URL(value, window.location.origin);
    return target.origin === window.location.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : "";
  } catch {
    return "";
  }
};

const accountReturnTo = getSafeReturnTo(requestedReturnTo);

const dispatchAccountChange = () => {
  window.dispatchEvent(
    new CustomEvent("zhongzhong:accountchange", {
      detail: accountSession,
    }),
  );
};

const syncAccountView = () => {
  const signedIn = Boolean(accountSession);
  if (accountSignedOut) accountSignedOut.hidden = signedIn;
  if (accountSignedIn) accountSignedIn.hidden = !signedIn;
  if (accountActions) accountActions.hidden = !signedIn;

  accountLabels.forEach((label) => {
    label.textContent = signedIn ? accountSession.nickname : "登录";
  });
  accountAvatars.forEach((avatar) => {
    avatar.dataset.signedIn = signedIn ? "true" : "false";
  });
  accountTriggers.forEach((trigger) => {
    trigger.setAttribute(
      "aria-label",
      signedIn ? `管理${accountSession.nickname}的种种账号` : "登录种种账号",
    );
    trigger.title = signedIn ? accountSession.nickname : "登录种种账号";
  });

  if (accountProfileAvatar) {
    accountProfileAvatar.dataset.signedIn = signedIn ? "true" : "false";
  }
  if (accountProfileName) {
    accountProfileName.textContent = accountSession?.nickname || "";
  }
  if (accountProfileEmail) {
    accountProfileEmail.textContent = accountSession?.email || "";
  }

  dispatchAccountChange();
};

const setAccountStatus = (message = "") => {
  if (accountStatus) accountStatus.textContent = message;
};

const setAccountPending = (pending) => {
  accountPending = pending;
  if (accountSubmit) accountSubmit.disabled = pending;
  if (accountSwitch) accountSwitch.disabled = pending;
  if (accountSignout) accountSignout.disabled = pending;
};

const setAccountMode = (mode) => {
  accountMode = mode === "register" ? "register" : "login";
  accountModeButtons.forEach((button) => {
    const selected = button.dataset.accountMode === accountMode;
    button.setAttribute("aria-selected", String(selected));
  });
  if (accountNicknameField) {
    accountNicknameField.hidden = accountMode !== "register";
  }
  if (accountNickname) {
    accountNickname.required = accountMode === "register";
  }
  if (accountPassword) {
    accountPassword.autocomplete =
      accountMode === "register" ? "new-password" : "current-password";
  }
  if (accountSubmit) {
    accountSubmit.textContent =
      accountMode === "register" ? "创建并登录" : "登录";
  }
  setAccountStatus("");
};

const requestAccount = async (pathname, options = {}) => {
  const response = await fetch(pathname, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "账号服务暂时不可用。");
  }
  return result;
};

const openAccountDialog = () => {
  syncAccountView();
  setAccountStatus(isFilePreview ? "请用本地网站地址登录。" : "");
  if (!accountDialog) return;

  if (typeof accountDialog.showModal === "function") {
    accountDialog.showModal();
  } else {
    accountDialog.setAttribute("open", "");
  }

  if (!accountSession) accountEmail?.focus();
};

const closeAccountDialog = () => {
  if (!accountDialog) return;
  if (typeof accountDialog.close === "function") {
    accountDialog.close();
  } else {
    accountDialog.removeAttribute("open");
  }
};

accountTriggers.forEach((trigger) => {
  trigger.addEventListener("click", openAccountDialog);
});

accountClose?.addEventListener("click", closeAccountDialog);

accountDialog?.addEventListener("click", (event) => {
  if (event.target === accountDialog) closeAccountDialog();
});

accountModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAccountMode(button.dataset.accountMode);
    if (accountMode === "register") {
      accountNickname?.focus();
    } else {
      accountEmail?.focus();
    }
  });
});

accountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (accountPending) return;

  if (isFilePreview) {
    const page = window.location.pathname.split("/").pop() || "index.html";
    window.location.href = `http://127.0.0.1:8000/${page}${window.location.search}${window.location.hash}`;
    return;
  }

  const email = accountEmail?.value.trim() || "";
  const password = accountPassword?.value || "";
  const nickname = accountNickname?.value.trim() || "";

  if (!email || !accountEmail?.validity.valid) {
    setAccountStatus("请填写有效的邮箱地址。");
    accountEmail?.focus();
    return;
  }
  if (password.length < 8) {
    setAccountStatus("密码至少需要 8 位。");
    accountPassword?.focus();
    return;
  }
  if (accountMode === "register" && [...nickname].length < 2) {
    setAccountStatus("名字至少需要 2 个字。");
    accountNickname?.focus();
    return;
  }

  setAccountPending(true);
  setAccountStatus(accountMode === "register" ? "正在创建账号…" : "正在登录…");

  try {
    const result = await requestAccount(`/api/auth/${accountMode}`, {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    });
    accountSession = result.account || null;
    if (accountPassword) accountPassword.value = "";
    syncAccountView();
    setAccountStatus("");
    if (accountReturnTo) {
      window.location.assign(accountReturnTo);
      return;
    }
  } catch (error) {
    setAccountStatus(error.message);
  } finally {
    setAccountPending(false);
  }
});

accountSwitch?.addEventListener("click", async () => {
  if (accountPending || isFilePreview) return;
  setAccountPending(true);
  setAccountStatus("正在切换账号…");
  try {
    await requestAccount("/api/auth/logout", {
      method: "POST",
      body: "{}",
    });
    accountSession = null;
    setAccountMode("login");
    syncAccountView();
    if (accountEmail) accountEmail.value = "";
    if (accountPassword) accountPassword.value = "";
    setAccountStatus("");
    accountEmail?.focus();
  } catch (error) {
    setAccountStatus(error.message);
  } finally {
    setAccountPending(false);
  }
});

accountSignout?.addEventListener("click", async () => {
  if (accountPending || isFilePreview) return;
  setAccountPending(true);
  setAccountStatus("正在退出…");
  try {
    await requestAccount("/api/auth/logout", {
      method: "POST",
      body: "{}",
    });
    accountSession = null;
    setAccountMode("login");
    syncAccountView();
    closeAccountDialog();
  } catch (error) {
    setAccountStatus(error.message);
  } finally {
    setAccountPending(false);
  }
});

const accountReady = (async () => {
  setAccountMode("login");
  if (!isFilePreview) {
    try {
      const result = await requestAccount("/api/auth/session");
      accountSession = result.account || null;
    } catch {
      accountSession = null;
    }
  }
  syncAccountView();
  if (accountSession && accountReturnTo) {
    window.location.replace(accountReturnTo);
  } else if (accountIntent === "login") {
    queueMicrotask(openAccountDialog);
  }
  return accountSession;
})();

window.ZhongZhongAccount = {
  getSession: () => accountSession,
  open: openAccountDialog,
  ready: accountReady,
};
