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
        <a href="#" aria-label="微信群" title="微信群">
          <svg class="wechat-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.1 5C6 5 2.8 7.5 2.8 10.6c0 1.7 1 3.2 2.5 4.2l-.5 2 2.2-1.1c.9.3 1.9.5 3.1.5 4 0 7.3-2.5 7.3-5.6S14.1 5 10.1 5Z" />
            <path d="M14.2 10.4c3.9.2 7 2.5 7 5.4 0 1.5-.9 2.9-2.4 3.8l.4 1.6-2-1c-.8.3-1.7.4-2.7.4-2.8 0-5.2-1.2-6.3-3" />
            <circle cx="7.6" cy="9.5" r="0.7" />
            <circle cx="12.2" cy="9.5" r="0.7" />
            <circle cx="13.1" cy="15" r="0.6" />
            <circle cx="17.1" cy="15" r="0.6" />
          </svg>
        </a>
        <a href="#" aria-label="抖音" title="抖音">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.2 3.5v10.3a4.5 4.5 0 1 1-4.5-4.5c.4 0 .7 0 1.1.1v3.1a1.8 1.8 0 1 0 1.3 1.7V3.5h2.1Zm.9 0c.4 2 1.8 3.6 3.9 4v3.1a7.7 7.7 0 0 1-4.8-2.1v-5h.9Z" />
          </svg>
        </a>
        <a href="#" aria-label="小红书" title="小红书">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4.5h14a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8H5a1.8 1.8 0 0 1-1.8-1.8V6.3A1.8 1.8 0 0 1 5 4.5Zm2.2 3v3h2.1v-3H7.2Zm7.5 0v3h2.1v-3h-2.1Zm-6.6 5.4c.6 2 2 3.1 3.9 3.1s3.3-1.1 3.9-3.1l-1.7-.6c-.4 1.2-1.1 1.8-2.2 1.8s-1.8-.6-2.2-1.8l-1.7.6Z" />
          </svg>
        </a>
        <a href="mailto:hello@example.com" aria-label="邮箱" title="邮箱">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 6.2h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm.3 2 7.2 5.1 7.2-5.1H4.8Zm14.7 8V9.8l-7.1 5a.7.7 0 0 1-.8 0l-7.1-5v6.4h15Z" />
          </svg>
        </a>
      </nav>

      <button class="menu-button" type="button" aria-label="打开导航" aria-expanded="false">
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
    </header>

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
          <span class="site-account-profile-avatar" data-account-profile-avatar aria-hidden="true">
            <img src="assets/wiki-potted-sprout.png" alt="" />
          </span>
          <strong data-account-profile-name></strong>
          <span data-account-profile-email></span>
          <button class="site-account-signout" type="button" data-account-signout>退出登录</button>
        </section>

        <p class="site-account-status" data-account-status role="status" aria-live="polite"></p>
      </form>
    </dialog>
  `;
}

const footerRoot = document.querySelector("[data-site-footer]");
if (footerRoot) {
  footerRoot.outerHTML = `
    <footer class="site-footer" aria-label="版权信息">
      <div class="footer-legal">
        <p class="footer-copyright">© 2026 种种大世界 版权所有</p>
      </div>
    </footer>
  `;
}

if (!document.querySelector('link[data-account-styles]')) {
  const accountStyles = document.createElement("link");
  accountStyles.rel = "stylesheet";
  accountStyles.href = "account.css?v=20260730-sprout-icon";
  accountStyles.dataset.accountStyles = "";
  document.head.append(accountStyles);
}

if (!document.querySelector('script[data-account-script]')) {
  const accountScript = document.createElement("script");
  accountScript.src = "account.js?v=20260730-sprout-icon";
  accountScript.dataset.accountScript = "";
  document.body.append(accountScript);
}
