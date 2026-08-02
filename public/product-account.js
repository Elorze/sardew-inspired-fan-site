(() => {
  const currentScript = document.currentScript;
  const clientId = currentScript?.dataset.accountClient || "";
  const issuer = String(
    currentScript?.dataset.accountIssuer || currentScript?.src || "",
  )
    .replace(/\/product-account\.js(?:\?.*)?$/, "")
    .replace(/\/+$/, "");
  const configuredRedirect = currentScript?.dataset.accountRedirect || "";
  const redirectUri =
    configuredRedirect || `${window.location.origin}${window.location.pathname}`;
  const storagePrefix = `zz-product-account:${clientId}`;
  const tokenKey = `${storagePrefix}:token`;
  const verifierKey = `${storagePrefix}:verifier`;
  const stateKey = `${storagePrefix}:state`;

  const encodeBase64Url = (bytes) =>
    btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");

  const randomValue = (size = 32) => {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return encodeBase64Url(bytes);
  };

  const createChallenge = async (verifier) => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier),
    );
    return encodeBase64Url(new Uint8Array(digest));
  };

  const request = async (pathname, options = {}) => {
    const response = await fetch(`${issuer}${pathname}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        result.error_description ||
          result.message ||
          "种种账号服务暂时不可用。",
      );
    }
    return result;
  };

  const readAccount = async () => {
    const token = sessionStorage.getItem(tokenKey);
    if (!token) return null;
    try {
      const result = await request("/api/auth/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return result.account || null;
    } catch {
      sessionStorage.removeItem(tokenKey);
      return null;
    }
  };

  const login = async () => {
    if (!clientId || !issuer) {
      throw new Error("这个产品还没有配置种种账号参数。");
    }
    const verifier = randomValue(48);
    const state = randomValue(24);
    sessionStorage.setItem(verifierKey, verifier);
    sessionStorage.setItem(stateKey, state);
    const authorizeUrl = new URL("/api/auth/authorize", issuer);
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set(
      "code_challenge",
      await createChallenge(verifier),
    );
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    window.location.assign(authorizeUrl);
  };

  const finishAuthorization = async () => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    if (!code && !returnedState) return readAccount();

    const expectedState = sessionStorage.getItem(stateKey);
    const verifier = sessionStorage.getItem(verifierKey);
    sessionStorage.removeItem(stateKey);
    sessionStorage.removeItem(verifierKey);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

    if (!code || !verifier || !expectedState || returnedState !== expectedState) {
      throw new Error("种种账号登录状态校验失败，请重新登录。");
    }

    const result = await request("/api/auth/token", {
      method: "POST",
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      }),
    });
    sessionStorage.setItem(tokenKey, result.access_token);
    return result.account || null;
  };

  const logout = async () => {
    const token = sessionStorage.getItem(tokenKey);
    sessionStorage.removeItem(tokenKey);
    if (token) {
      await request("/api/auth/revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: "{}",
      }).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("zhongzhong:product-accountchange", {
        detail: null,
      }),
    );
  };

  const ready = finishAuthorization()
    .then((account) => {
      window.dispatchEvent(
        new CustomEvent("zhongzhong:product-accountchange", {
          detail: account,
        }),
      );
      return account;
    })
    .catch((error) => {
      window.dispatchEvent(
        new CustomEvent("zhongzhong:product-accounterror", {
          detail: error,
        }),
      );
      throw error;
    });

  window.ZhongZhongProductAccount = {
    getAccount: readAccount,
    login,
    logout,
    ready,
  };
})();
