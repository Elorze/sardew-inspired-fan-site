const requestedPost = new URLSearchParams(window.location.search).get("id") || "";
const title = document.querySelector("#forumPostTitle");
const author = document.querySelector("#forumPostAuthor");
const level = document.querySelector("#forumPostLevel");
const avatar = document.querySelector("#forumPostAvatar");
const time = document.querySelector("#forumPostTime");
const body = document.querySelector("#forumPostBody");
const forumPostActions = document.querySelector("#forumPostActions");
const forumPostLikeCount = document.querySelector("#forumPostLikeCount");
const forumPostActionStatus = document.querySelector("#forumPostActionStatus");
const forumReplyList = document.querySelector("#forumReplyList");
const forumReplyCount = document.querySelector("#forumReplyCount");
const forumReplyForm = document.querySelector("#forumReplyForm");
const forumReplyMessage = document.querySelector("#forumReplyMessage");
const forumReplyStatus = document.querySelector("#forumReplyStatus");
const forumComposerIdentity = document.querySelector("#forumComposerIdentity");
let activePost = null;
let replies = [];

const fallbackPosts = {
  welcome: { title: "先从这里认识大家", author: "种种", body: "第一次来到花园，可以留下一句自我介绍。" },
  world: { title: "今天在种种世界发现了什么？", author: "种种", body: "把你发现的地方和故事留在这里。" },
  tavern: { title: "酒馆今晚留哪一盏灯", author: "小椒", body: "最近想聊什么，就坐下来慢慢说。" },
  dandelion: { title: "蒲公英地图交换处", author: "风团", body: "留下你的地图发现和游玩记录。" },
  creative: { title: "把你的创作放到花园里", author: "花花", body: "分享你的创作与制作过程。" },
};

const session = () => window.ZhongZhongForumAuth?.getSession?.() || null;
const showStatus = (message) => {
  if (forumPostActionStatus) forumPostActionStatus.textContent = message;
  if (forumReplyStatus) forumReplyStatus.textContent = message;
};
const requestJson = async (url, options = {}) => {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "请求失败，请稍后重试。");
  return result;
};
const renderPost = (post) => {
  if (!post) return;
  activePost = post;
  if (title) title.textContent = post.title;
  if (author) author.textContent = post.author?.name || post.author || "无名旅人";
  if (level) level.textContent = "社区成员";
  if (body) {
    body.replaceChildren();
    String(post.body || "").split(/\n+/).filter(Boolean).forEach((paragraph) => {
      const node = document.createElement("p");
      node.textContent = paragraph;
      body.append(node);
    });
  }
  if (time && post.createdAt) {
    time.dateTime = post.createdAt;
    time.textContent = new Date(post.createdAt).toLocaleString("zh-CN");
  }
  if (forumPostLikeCount) forumPostLikeCount.textContent = String(post.likeCount || 0);
  document.title = `${post.title}｜种种大世界`;
  const isAuthor = session()?.id && session().id === post.author?.id;
  forumPostActions?.querySelector('[data-forum-action="edit"]')?.toggleAttribute("hidden", !isAuthor);
  forumPostActions?.querySelector('[data-forum-action="delete"]')?.toggleAttribute("hidden", !isAuthor);
};
const renderReplies = () => {
  if (!forumReplyList) return;
  forumReplyList.replaceChildren();
  if (!replies.length) {
    const empty = document.createElement("p");
    empty.className = "forum-reply-empty";
    empty.textContent = "还没有公开回复，欢迎留下第一条。";
    forumReplyList.append(empty);
  }
  replies.forEach((reply) => {
    const article = document.createElement("article");
    article.className = "forum-reply";
    article.dataset.replyId = reply.id;
    const content = document.createElement("div");
    content.className = "forum-reply-content";
    const meta = document.createElement("div");
    meta.className = "forum-reply-meta";
    const name = document.createElement("strong");
    name.textContent = reply.author?.name || reply.author || "无名旅人";
    const date = document.createElement("time");
    date.textContent = reply.createdAt ? new Date(reply.createdAt).toLocaleString("zh-CN") : "刚刚";
    meta.append(name, date);
    const text = document.createElement("p");
    text.className = "forum-reply-text";
    text.textContent = reply.body || reply.text || "";
    const actions = document.createElement("div");
    actions.className = "forum-reply-actions";
    const like = document.createElement("button");
    like.type = "button";
    like.dataset.replyAction = "like";
    like.textContent = `赞 ${reply.likeCount || 0}`;
    const report = document.createElement("button");
    report.type = "button";
    report.dataset.replyAction = "report";
    report.textContent = "举报";
    const canDelete = session()?.id && session().id === reply.author?.id;
    if (canDelete) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.replyAction = "delete";
      remove.textContent = "删除";
      actions.append(remove);
    }
    actions.prepend(like, report);
    content.append(meta, text, actions);
    article.append(content);
    forumReplyList.append(article);
  });
  if (forumReplyCount) {
    forumReplyCount.value = String(replies.length);
    forumReplyCount.textContent = replies.length ? `${replies.length} 条` : "等待第一条";
  }
};
const loadPost = async () => {
  if (!requestedPost || window.location.protocol === "file:") {
    const fallback = fallbackPosts[requestedPost] || fallbackPosts.welcome;
    renderPost(fallback);
    renderReplies();
    return;
  }
  try {
    const result = await requestJson(`/api/forum/posts/${encodeURIComponent(requestedPost)}`);
    renderPost(result.post);
    replies = result.replies || [];
    renderReplies();
  } catch (error) { showStatus(error.message); }
};
const editPostInForm = () => {
  if (!activePost || !body) return;
  const titleInput = document.createElement("input");
  titleInput.value = activePost.title || "";
  titleInput.maxLength = 120;
  titleInput.className = "forum-edit-title";
  const bodyInput = document.createElement("textarea");
  bodyInput.value = activePost.body || "";
  bodyInput.maxLength = 20000;
  bodyInput.className = "forum-edit-body";
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "保存编辑";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "取消";
  const editor = document.createElement("div");
  editor.className = "forum-post-editor";
  editor.append(titleInput, bodyInput, save, cancel);
  body.replaceChildren(editor);
  save.addEventListener("click", async () => {
    try {
      const result = await requestJson(`/api/forum/posts/${activePost.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: titleInput.value, body: bodyInput.value }) });
      renderPost(result.post);
      showStatus("帖子已更新");
    } catch (error) { showStatus(error.message); }
  });
  cancel.addEventListener("click", () => renderPost(activePost));
};

const mutatePost = async (action) => {
  if (!activePost) return;
  if (!session()) { showStatus("请先登录后再操作。"); window.ZhongZhongForumAuth?.open?.(); return; }
  if (action === "like") {
    const result = await requestJson(`/api/forum/posts/${activePost.id}/like`, { method: "POST" });
    forumPostLikeCount.textContent = String(result.likeCount || 0);
    showStatus("已点赞");
  } else if (action === "report") {
    const reason = window.prompt("请填写举报原因");
    if (reason?.trim()) { await requestJson(`/api/forum/posts/${activePost.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); showStatus("举报已提交"); }
  } else if (action === "edit") {
    editPostInForm();
  } else if (action === "delete" && window.confirm("确定删除这篇帖子吗？")) {
    await requestJson(`/api/forum/posts/${activePost.id}`, { method: "DELETE" });
    window.location.href = "forum.html";
  }
};
forumPostActions?.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-forum-action]") : null;
  if (!(button instanceof HTMLButtonElement)) return;
  try { await mutatePost(button.dataset.forumAction); } catch (error) { showStatus(error.message); }
});
forumReplyList?.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-reply-action]") : null;
  if (!(button instanceof HTMLButtonElement)) return;
  const reply = replies.find((item) => item.id === button.closest("[data-reply-id]")?.dataset.replyId);
  if (!reply) return;
  try {
    if (!session()) { showStatus("请先登录后再操作。"); window.ZhongZhongForumAuth?.open?.(); return; }
    if (button.dataset.replyAction === "like") { const result = await requestJson(`/api/forum/replies/${reply.id}/like`, { method: "POST" }); button.textContent = `赞 ${result.likeCount || 0}`; }
    if (button.dataset.replyAction === "report") { const reason = window.prompt("请填写举报原因"); if (reason?.trim()) { await requestJson(`/api/forum/replies/${reply.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); showStatus("举报已提交"); } }
    if (button.dataset.replyAction === "delete" && window.confirm("确定删除这条回复吗？")) { await requestJson(`/api/forum/replies/${reply.id}`, { method: "DELETE" }); replies = replies.filter((item) => item.id !== reply.id); renderReplies(); }
  } catch (error) { showStatus(error.message); }
});
forumReplyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session()) { showStatus("登录后才能回复。"); window.ZhongZhongForumAuth?.open?.(); return; }
  const message = forumReplyMessage?.value.trim() || "";
  if (!message) { showStatus("请输入回复内容。"); return; }
  try {
    const result = await requestJson(`/api/forum/posts/${encodeURIComponent(requestedPost)}/replies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: message }) });
    replies.push(result.reply);
    renderReplies();
    forumReplyMessage.value = "";
    showStatus("回复已发布");
  } catch (error) { showStatus(error.message); }
});
window.addEventListener("forum:sessionchange", () => { if (forumComposerIdentity) forumComposerIdentity.textContent = session()?.nickname || "访客"; renderReplies(); });
if (forumComposerIdentity) forumComposerIdentity.textContent = session()?.nickname || "访客";
void loadPost();
