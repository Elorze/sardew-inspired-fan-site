let forumSession = null;

const accountToForumSession = (account) =>
  account
    ? {
        id: account.id,
        nickname: account.nickname,
        level: account.level || "LV.1 发芽",
        points: Number.isFinite(account.points) ? account.points : 0,
      }
    : null;

const syncForumSession = (account = window.ZhongZhongAccount?.getSession()) => {
  forumSession = accountToForumSession(account);
  document.body.dataset.forumSignedIn = String(Boolean(forumSession));
  window.dispatchEvent(
    new CustomEvent("forum:sessionchange", { detail: forumSession }),
  );
};

const openForumLogin = () => {
  window.ZhongZhongAccount?.open();
};

window.addEventListener("zhongzhong:accountchange", (event) => {
  syncForumSession(event.detail);
});

window.ZhongZhongForumAuth = {
  getSession: () => forumSession,
  open: openForumLogin,
};

Promise.resolve(window.ZhongZhongAccount?.ready).then(() => {
  syncForumSession();
});
