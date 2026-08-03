const forumPostForm = document.querySelector("#forumPostForm");
const forumPostCategory = document.querySelector("#forumPostCategory");
const forumPostFormStatus = document.querySelector("#forumPostFormStatus");
const forumPostSession = () => window.ZhongZhongForumAuth?.getSession?.() || null;

const loadForumCategoriesForForm = async () => {
  if (!forumPostCategory || window.location.protocol === "file:") return;
  try {
    const response = await fetch("/api/forum/categories", { headers: { Accept: "application/json" } });
    const result = await response.json();
    forumPostCategory.replaceChildren(...(result.categories || []).map((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      return option;
    }));
  } catch {
    if (forumPostFormStatus) forumPostFormStatus.textContent = "分区读取失败，请稍后重试。";
  }
};

forumPostForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!forumPostSession()) {
    if (forumPostFormStatus) forumPostFormStatus.textContent = "登录后才能发帖。";
    window.ZhongZhongForumAuth?.open?.();
    return;
  }
  const formData = new FormData(forumPostForm);
  const payload = {
    categoryId: String(formData.get("categoryId") || ""),
    title: String(formData.get("title") || "").trim(),
    body: String(formData.get("body") || "").trim(),
  };
  if (!payload.title || !payload.body) {
    if (forumPostFormStatus) forumPostFormStatus.textContent = "请填写标题和正文。";
    return;
  }
  try {
    const response = await fetch("/api/forum/posts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "发帖失败，请稍后重试。");
    window.location.href = `forum-post.html?id=${encodeURIComponent(result.post.id)}`;
  } catch (error) {
    if (forumPostFormStatus) forumPostFormStatus.textContent = error.message;
  }
});

window.addEventListener("forum:sessionchange", () => {
  if (forumPostFormStatus && forumPostSession()) forumPostFormStatus.textContent = "可以发布新话题了。";
});
void loadForumCategoriesForForm();
