if (!document.querySelector('link[data-navigation-styles]')) {
  const navigationStyles = document.createElement("link");
  navigationStyles.rel = "stylesheet";
  navigationStyles.href = "navigation.css?v=20260809-menu-single";
  navigationStyles.dataset.navigationStyles = "";
  document.head.append(navigationStyles);
}

const navigationItems = [
  ["index.html", "首页"],
  ["blog.html", "博客"],
  ["forum.html", "社区"],
  ["media.html", "媒体"],
  ["products.html", "产品"],
  ["shop.html", "文创"],
  ["faq.html", "常见问题"],
  ["wiki.html", "百科"],
];

const currentPage = document.body.dataset.page || "index.html";
const navigationMarkup = navigationItems
  .map(([href, label]) => {
    const currentAttribute = href === currentPage ? ' aria-current="page"' : "";
    return `<a href="${href}"${currentAttribute}>${label}</a>`;
  })
  .join("");

const headerRoot = document.querySelector("[data-site-header]");
if (headerRoot) {
  headerRoot.outerHTML = `
    <header class="site-header">
      <nav class="site-nav" aria-label="主导航">${navigationMarkup}</nav>

      <nav class="social-links" aria-label="社交媒体平台">
        <button
          class="social-placeholder social-icon-button"
          type="button"
          aria-label="打开种种微信二维码"
          title="微信"
          aria-haspopup="dialog"
          data-wechat-trigger
        >
          <svg class="wechat-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.7 13.5c.1-.4.2-.8.2-1.2 0-3.7-3.9-6.6-8.7-6.6s-8.7 2.9-8.7 6.6c0 2 1.1 3.7 2.9 4.9l-.7 2.5 2.6-1.3c1.1.4 2.4.6 3.9.6.7 0 1.4-.1 2.1-.2" />
            <path d="M15.3 11.4c4 0 7.2 2.4 7.2 5.4 0 1.7-1 3.2-2.6 4.2l.6 2-2.2-1.1c-.9.3-1.9.5-3 .5-4 0-7.2-2.4-7.2-5.4s3.2-5.6 7.2-5.6Z" />
            <circle cx="7.2" cy="11.3" r="0.65" />
            <circle cx="12.2" cy="11.3" r="0.65" />
            <circle cx="13" cy="16.5" r="0.58" />
            <circle cx="17.4" cy="16.5" r="0.58" />
          </svg>
        </button>
        <a
          class="social-platform-link"
          href="https://www.douyin.com/search/71525248477?type=user"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="前往种种大世界的抖音"
          title="抖音"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.2 3.5v10.3a4.5 4.5 0 1 1-4.5-4.5c.4 0 .7 0 1.1.1v3.1a1.8 1.8 0 1 0 1.3 1.7V3.5h2.1Zm.9 0c.4 2 1.8 3.6 3.9 4v3.1a7.7 7.7 0 0 1-4.8-2.1v-5h.9Z" />
          </svg>
        </a>
        <a
          class="social-platform-link social-platform-xiaohongshu"
          href="https://www.xiaohongshu.com/user/profile/5c46bb600000000012028acc"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="前往种种的小红书主页"
          title="小红书"
        >
          <img class="xiaohongshu-icon" src="assets/xiaohongshu-app-icon.png" alt="" aria-hidden="true" />
        </a>
        <a href="blog.html?compose=1" aria-label="写信" title="写信">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 6.2h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm.3 2 7.2 5.1 7.2-5.1H4.8Zm14.7 8V9.8l-7.1 5a.7.7 0 0 1-.8 0l-7.1-5v6.4h15Z" />
          </svg>
        </a>
      </nav>

      <button
        class="menu-button"
        type="button"
        aria-label="打开导航"
        aria-expanded="false"
        aria-controls="siteMenuPopover"
        aria-haspopup="true"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <button
        class="site-account-trigger"
        type="button"
        aria-label="登录种种账号"
        title="登录种种账号"
        aria-haspopup="dialog"
        data-account-trigger
      >
        <span class="site-account-avatar" data-account-avatar aria-hidden="true">
          <img src="assets/wiki-potted-sprout.png" alt="" />
        </span>
        <span class="visually-hidden" data-account-label>登录</span>
      </button>

      <div class="site-menu-popover" id="siteMenuPopover" data-site-menu hidden>
        <div class="site-menu-heading">
          <span>种种大世界</span>
          <button type="button" data-menu-close aria-label="关闭菜单">×</button>
        </div>
        <nav aria-label="完整网站导航">${navigationMarkup}</nav>
        <a class="site-menu-contact" href="blog.html?compose=1">写信联系</a>
      </div>
    </header>

    <dialog class="social-contact-dialog" id="wechatContactDialog" aria-label="种种微信二维码">
      <div class="social-contact-panel">
        <button class="social-contact-close" type="button" aria-label="关闭微信二维码" data-wechat-close>×</button>
        <img
          src="assets/wechat-zhongzhong-contact.jpg"
          alt="种种微信二维码，扫码添加好友"
          width="888"
          height="1131"
        />
      </div>
    </dialog>

    <dialog class="site-account-dialog" id="siteAccountDialog" aria-labelledby="siteAccountTitle">
      <form class="site-account-panel" id="siteAccountForm" novalidate>
        <button class="site-account-close" type="button" aria-label="关闭账号窗口">×</button>

        <header class="site-account-heading">
          <h2 id="siteAccountTitle">种种账号</h2>
        </header>

        <section class="site-account-signed-out" data-account-signed-out>
          <div class="site-account-modes" role="tablist" aria-label="账号方式">
            <button type="button" role="tab" aria-selected="true" data-account-mode="login">登录</button>
            <button type="button" role="tab" aria-selected="false" data-account-mode="register">创建账号</button>
          </div>

          <div class="site-account-fields">
            <label data-account-nickname-field hidden>
              <span>名字</span>
              <input
                id="siteAccountNickname"
                name="nickname"
                type="text"
                autocomplete="nickname"
                maxlength="16"
              />
            </label>
            <label>
              <span>邮箱</span>
              <input
                id="siteAccountEmail"
                name="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                maxlength="160"
                required
              />
            </label>
            <label>
              <span>密码</span>
              <input
                id="siteAccountPassword"
                name="password"
                type="password"
                autocomplete="current-password"
                minlength="8"
                maxlength="128"
                required
              />
            </label>
          </div>

          <button class="site-account-submit" type="submit" data-account-submit>登录</button>
        </section>

        <section class="site-account-signed-in" data-account-signed-in hidden>
          <div class="site-account-profile">
            <span class="site-account-profile-avatar" data-account-profile-avatar aria-hidden="true">
              <img src="assets/wiki-potted-sprout.png" alt="" />
            </span>
            <span class="site-account-profile-copy">
              <strong data-account-profile-name></strong>
              <span data-account-profile-email></span>
            </span>
          </div>

          <div class="site-account-actions" id="siteAccountActions" data-account-actions>
            <button class="site-account-switch" type="button" data-account-switch>切换账号</button>
            <button class="site-account-signout" type="button" data-account-signout>退出登录</button>
          </div>
        </section>

        <p class="site-account-status" data-account-status role="status" aria-live="polite"></p>
      </form>
    </dialog>
  `;
}

const menuButton = document.querySelector(".menu-button");
const menuPopover = document.querySelector("[data-site-menu]");
const closeMenuButton = document.querySelector("[data-menu-close]");

const setMenuOpen = (open) => {
  if (!menuButton || !menuPopover) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  menuPopover.hidden = !open;
  document.body.classList.toggle("site-menu-popover-open", open);
};
menuButton?.addEventListener("click", () => setMenuOpen(menuPopover.hidden));
closeMenuButton?.addEventListener("click", () => setMenuOpen(false));
menuPopover?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));
document.addEventListener("click", (event) => {
  if (menuPopover?.hidden || menuPopover.contains(event.target) || menuButton?.contains(event.target)) return;
  setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});
document.querySelector("[data-account-trigger]")?.addEventListener("click", () => {
  setMenuOpen(false);
});

const wechatTrigger = document.querySelector("[data-wechat-trigger]");
const wechatDialog = document.querySelector("#wechatContactDialog");
const wechatClose = document.querySelector("[data-wechat-close]");

wechatTrigger?.addEventListener("click", () => {
  if (!wechatDialog?.open) wechatDialog?.showModal();
});

wechatClose?.addEventListener("click", () => {
  wechatDialog?.close();
});

wechatDialog?.addEventListener("click", (event) => {
  if (event.target === wechatDialog) wechatDialog.close();
});

wechatDialog?.addEventListener("close", () => {
  wechatTrigger?.focus();
});

const footerRoot = document.querySelector("[data-site-footer]");
if (footerRoot) {
  footerRoot.outerHTML = `
    <footer class="site-footer" aria-label="页面统计与版权信息">
      <div class="site-footer-inner">
        <div class="site-engagement" data-site-engagement>
          <span>
            <b data-page-views>--</b>
            <small>浏览</small>
          </span>
          <span>
            <b data-page-visitors>--</b>
            <small>来过</small>
          </span>
          <button
            type="button"
            aria-pressed="false"
            aria-label="踩踩留下脚印"
            title="点一下，留下脚印"
            data-page-heat-trigger
          >
            <span>踩踩</span>
            <b data-page-heat>--</b>
          </button>
          <output class="visually-hidden" data-page-heat-status aria-live="polite"></output>
        </div>
        <div class="footer-legal">
          <p class="footer-copyright">© 2026 种种大世界 版权所有</p>
        </div>
      </div>
    </footer>
  `;
}

const engagement = document.querySelector("[data-site-engagement]");
const pageViews = document.querySelector("[data-page-views]");
const pageVisitors = document.querySelector("[data-page-visitors]");
const pageHeat = document.querySelector("[data-page-heat]");
const pageHeatTrigger = document.querySelector("[data-page-heat-trigger]");
const pageHeatStatus = document.querySelector("[data-page-heat-status]");
const engagementPollInterval = 4000;
const engagementChannel =
  "BroadcastChannel" in window
    ? new BroadcastChannel("zhongzhong-page-engagement")
    : null;
let engagementRefreshTimer = 0;
const trackedPageKey = (() => {
  const basePage = currentPage.replace(/[^a-z0-9._-]/gi, "") || "index.html";
  const entryId = new URLSearchParams(window.location.search).get("id");
  if (!entryId) return basePage;
  const safeId = entryId.replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
  return safeId ? `${basePage}?id=${safeId}` : basePage;
})();

const renderEngagementValue = (element, value) => {
  if (!element) return;
  const nextValue = String(value ?? 0);
  if (element.textContent === nextValue) return;
  element.textContent = nextValue;
  element.classList.remove("is-updated");
  window.requestAnimationFrame(() => element.classList.add("is-updated"));
  window.setTimeout(() => element.classList.remove("is-updated"), 420);
};

const renderPageEngagement = (stats) => {
  if (!stats) return;
  renderEngagementValue(pageViews, stats.views);
  renderEngagementValue(pageVisitors, stats.visitors);
  renderEngagementValue(pageHeat, stats.heat);
  if (pageHeatTrigger instanceof HTMLButtonElement) {
    pageHeatTrigger.classList.toggle("is-stamped", Boolean(stats.heated));
    pageHeatTrigger.setAttribute("aria-pressed", String(Boolean(stats.heated)));
  }
};

const requestPageEngagement = async (path) => {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pageKey: trackedPageKey }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "统计读取失败");
  return payload;
};

const readPageEngagement = async () => {
  const response = await fetch(
    `/api/analytics/stats?page=${encodeURIComponent(trackedPageKey)}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "统计读取失败");
  return payload;
};

const scheduleEngagementRefresh = () => {
  window.clearTimeout(engagementRefreshTimer);
  if (document.hidden) return;
  engagementRefreshTimer = window.setTimeout(async () => {
    try {
      renderPageEngagement(await readPageEngagement());
    } catch {
      // Keep the last confirmed values when the network is temporarily unavailable.
    } finally {
      scheduleEngagementRefresh();
    }
  }, engagementPollInterval);
};

const refreshPageEngagement = async () => {
  if (document.hidden) return;
  try {
    renderPageEngagement(await readPageEngagement());
  } catch {
    // The next scheduled refresh can recover without replacing real values.
  }
};

if (engagement) {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    requestPageEngagement("/api/analytics/view")
      .then((stats) => {
        renderPageEngagement(stats);
        engagementChannel?.postMessage({ pageKey: trackedPageKey });
        scheduleEngagementRefresh();
      })
      .catch(() => {
        engagement.classList.add("is-unavailable");
        scheduleEngagementRefresh();
      });
  } else {
    engagement.hidden = true;
  }
}

pageHeatTrigger?.addEventListener("click", async () => {
  if (!(pageHeatTrigger instanceof HTMLButtonElement)) return;
  pageHeatTrigger.disabled = true;
  try {
    const stats = await requestPageEngagement("/api/analytics/heat");
    renderPageEngagement(stats);
    engagementChannel?.postMessage({ pageKey: trackedPageKey });
    if (pageHeatStatus) {
      pageHeatStatus.textContent = stats.awarded ? "热度增加了" : "已经踩过啦";
    }
  } catch {
    if (pageHeatStatus) pageHeatStatus.textContent = "暂时没有踩到";
  } finally {
    pageHeatTrigger.disabled = false;
  }
});

engagementChannel?.addEventListener("message", (event) => {
  if (event.data?.pageKey === trackedPageKey) refreshPageEngagement();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearTimeout(engagementRefreshTimer);
    return;
  }
  refreshPageEngagement();
  scheduleEngagementRefresh();
});

window.addEventListener("pagehide", () => {
  window.clearTimeout(engagementRefreshTimer);
  engagementChannel?.close();
});

if (!document.querySelector('link[data-account-styles]')) {
  const accountStyles = document.createElement("link");
  accountStyles.rel = "stylesheet";
  accountStyles.href = "account.css?v=20260809-flat-profile";
  accountStyles.dataset.accountStyles = "";
  document.head.append(accountStyles);
}

if (!document.querySelector('script[data-account-script]')) {
  const accountScript = document.createElement("script");
  accountScript.src = "account.js?v=20260809-flat-profile";
  accountScript.dataset.accountScript = "";
  document.body.append(accountScript);
}
