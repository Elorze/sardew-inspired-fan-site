const forumPosts = {
  welcome: {
    title: "先从这里认识大家",
    author: "种种",
    level: "LV.7 结果",
    avatar: "new-lilybell.png",
    signature: "把每一颗小芽照顾好",
    achievement: "园丁",
    datetime: "2026-07-28T10:32:00+08:00",
    time: "2026-07-28 10:32",
    paragraphs: [
      "这里收录与种种世界、种种酒馆、蒲公英大世界和文创有关的讨论。",
      "请直接进入对应主题，留下你的想法。",
    ],
  },
  world: {
    title: "今天在种种世界发现了什么？",
    author: "青芽",
    level: "LV.3 展叶",
    avatar: "new-clover.png",
    signature: "慢慢走，叶子会告诉你方向",
    achievement: "寻路",
    datetime: "2026-07-28T09:14:00+08:00",
    time: "2026-07-28 09:14",
    paragraphs: ["最近在种种世界里遇到了什么？把你的发现和记录留在这里。"],
  },
  tavern: {
    title: "酒馆今晚留哪一盏灯",
    author: "小椒",
    level: "LV.5 含苞",
    avatar: "new-mushroom.png",
    signature: "晚一点也没关系，灯还亮着",
    achievement: "夜话",
    datetime: "2026-07-27T21:18:00+08:00",
    time: "2026-07-27 21:18",
    paragraphs: ["最近在酒馆里听到了什么故事？把想聊的话题留在这里。"],
  },
  dandelion: {
    title: "蒲公英地图交换处",
    author: "风团",
    level: "LV.4 抽枝",
    avatar: "new-dandelion.png",
    signature: "风停下来时，我就落在这里",
    achievement: "远行",
    datetime: "2026-07-27T19:46:00+08:00",
    time: "2026-07-27 19:46",
    paragraphs: ["留下你的地图发现、游玩记录和建议。"],
  },
  creative: {
    title: "晒晒贴在手账里的种种",
    author: "花花",
    level: "LV.6 开花",
    avatar: "new-bluebell.png",
    signature: "今天也留下了一点颜色",
    achievement: "手作",
    datetime: "2026-07-26T16:05:00+08:00",
    time: "2026-07-26 16:05",
    paragraphs: ["分享你喜欢的文创作品与使用照片。"],
  },
};

const requestedPost = new URLSearchParams(window.location.search).get("id");
const post = forumPosts[requestedPost] || forumPosts.welcome;
const title = document.querySelector("#forumPostTitle");
const author = document.querySelector("#forumPostAuthor");
const level = document.querySelector("#forumPostLevel");
const avatar = document.querySelector("#forumPostAvatar");
const time = document.querySelector("#forumPostTime");
const body = document.querySelector("#forumPostBody");

if (
  title &&
  author &&
  level &&
  avatar instanceof HTMLImageElement &&
  time &&
  body
) {
  title.textContent = post.title;
  author.textContent = post.author;
  level.textContent = post.level;
  avatar.src = `assets/forum-avatars/${post.avatar}`;
  time.dateTime = post.datetime;
  time.textContent = post.time;
  document.title = `${post.title}｜种种大世界`;

  post.paragraphs.forEach((paragraph) => {
    const line = document.createElement("p");
    line.textContent = paragraph;
    body.append(line);
  });
}

const forumStickers = [
  ["lotus", "铃花点头", "new-lilybell.png"],
  ["cattail", "蒲草抱抱", "new-cattail.png"],
  ["clover", "三叶惊喜", "new-clover.png"],
  ["sprout", "蒲公英出发", "new-dandelion.png"],
  ["bluebell", "蓝铃害羞", "new-bluebell.png"],
  ["spiky", "蘑菇晚安", "new-mushroom.png"],
];

const forumStickerNames = Object.fromEntries(
  forumStickers.map(([stickerId, stickerName]) => [stickerId, stickerName]),
);
const forumStickerFiles = Object.fromEntries(
  forumStickers.map(([stickerId, , stickerFile]) => [stickerId, stickerFile]),
);
forumStickerNames.flying = "蒲公英出发";
forumStickerFiles.flying = "new-dandelion.png";
const forumMemberProfiles = {
  种种: ["new-lilybell.png", "把每一颗小芽照顾好", "园丁"],
  青芽: ["new-clover.png", "慢慢走，叶子会告诉你方向", "寻路"],
  小椒: ["new-mushroom.png", "晚一点也没关系，灯还亮着", "夜话"],
  风团: ["new-dandelion.png", "风停下来时，我就落在这里", "远行"],
  花花: ["new-bluebell.png", "今天也留下了一点颜色", "手作"],
  露珠: ["new-lilybell.png", "清晨第一滴露水", "晨露"],
  莓果: ["new-bluebell.png", "口袋里有一颗甜果子", "采集"],
  藤藤: ["new-clover.png", "沿着旧墙慢慢爬", "展叶"],
  小满: ["new-cattail.png", "水边坐一会儿", "浇水"],
  晚灯: ["new-mushroom.png", "最后离开的人会关灯", "夜话"],
  辛香: ["new-mushroom.png", "今天也有一点热气", "调味"],
  风铃: ["new-dandelion.png", "听风经过叶尖", "远行"],
  团子: ["new-cattail.png", "滚到柔软的草地上", "扎营"],
  纸叶: ["new-bluebell.png", "把喜欢的颜色收进本子", "手作"],
};

const fallbackForumProfiles = [
  ["new-cattail.png", "今天也在花园里慢慢生长", "新芽"],
  ["new-clover.png", "沿着叶脉去散步", "展叶"],
  ["new-lilybell.png", "在池塘边等一朵花开", "晨露"],
];

const getForumMemberProfile = (reply) => {
  if (reply.avatar) {
    return [
      reply.avatar,
      reply.signature || "今天也在花园里慢慢生长",
      reply.achievement || "新芽",
    ];
  }

  if (forumMemberProfiles[reply.author]) return forumMemberProfiles[reply.author];
  const seed = [...reply.author].reduce((total, character) => {
    return total + character.codePointAt(0);
  }, 0);
  return fallbackForumProfiles[seed % fallbackForumProfiles.length];
};

const seededForumReplies = {
  welcome: [
    {
      id: "welcome-seed-1",
      author: "露珠",
      level: "LV.2 生根",
      time: "07-28 11:06",
      text: "收到，已经先去种种世界转了一圈。",
      sticker: "clover",
    },
    {
      id: "welcome-seed-2",
      author: "莓果",
      level: "LV.4 抽枝",
      time: "07-28 13:42",
      text: "花园广场终于开门了，来放一颗小芽。",
      sticker: "sprout",
    },
  ],
  world: [
    {
      id: "world-seed-1",
      author: "露珠",
      level: "LV.2 生根",
      time: "今天 08:47",
      text: "我在花园池塘边发现了新的小花，绕过去的时候还听见了水声。",
      sticker: "lotus",
    },
    {
      id: "world-seed-2",
      author: "藤藤",
      level: "LV.3 展叶",
      time: "今天 09:03",
      text: "想知道树屋后面的空地以后会不会开放。",
      sticker: "clover",
    },
    {
      id: "world-seed-3",
      author: "小满",
      level: "LV.5 含苞",
      time: "今天 09:18",
      text: "浇水动作很可爱，我在那里停了好一会儿。",
      sticker: "flying",
    },
  ],
  tavern: [
    {
      id: "tavern-seed-1",
      author: "晚灯",
      level: "LV.4 抽枝",
      time: "昨天 22:10",
      text: "角落那张小桌子很适合听大家聊天。",
      sticker: "bluebell",
    },
    {
      id: "tavern-seed-2",
      author: "辛香",
      level: "LV.6 开花",
      time: "今天 00:26",
      text: "下一次还想听三位伙伴继续讲下去。",
      sticker: "cattail",
    },
  ],
  dandelion: [
    {
      id: "dandelion-seed-1",
      author: "风铃",
      level: "LV.3 展叶",
      time: "昨天 21:37",
      text: "地图东边那条小路很好看，我差点错过入口。",
      sticker: "flying",
    },
    {
      id: "dandelion-seed-2",
      author: "团子",
      level: "LV.2 生根",
      time: "昨天 23:15",
      text: "想在地图上多留几个可以停下来的小角落。",
      sticker: "spiky",
    },
  ],
  creative: [
    {
      id: "creative-seed-1",
      author: "纸叶",
      level: "LV.5 含苞",
      time: "昨天 18:24",
      text: "异形贴纸贴在透明本上会很好看。",
      sticker: "clover",
    },
    {
      id: "creative-seed-2",
      author: "花花",
      level: "LV.6 开花",
      time: "昨天 20:40",
      text: "地图贴纸也可以拿来标记旅行路线。",
      sticker: "lotus",
    },
  ],
};

const activeForumPostId = requestedPost && forumPosts[requestedPost]
  ? requestedPost
  : "welcome";
const forumReplyStorageKey = `zhongzhong-forum-replies-v1:${activeForumPostId}`;
const forumReplyList = document.querySelector("#forumReplyList");
const forumReplyCount = document.querySelector("#forumReplyCount");
const forumReplyForm = document.querySelector("#forumReplyForm");
const forumReplyMessage = document.querySelector("#forumReplyMessage");
const forumReplyStatus = document.querySelector("#forumReplyStatus");
const forumComposerIdentity = document.querySelector("#forumComposerIdentity");
const forumStickerToggle = document.querySelector("#forumStickerToggle");
const forumStickerPicker = document.querySelector("#forumStickerPicker");
let selectedForumSticker = "";

const readSavedForumReplies = () => {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(forumReplyStorageKey) || "[]",
    );
    return Array.isArray(saved)
      ? saved.filter(
          (reply) =>
            reply &&
            typeof reply.author === "string" &&
            typeof reply.text === "string" &&
            (!reply.sticker || forumStickerNames[reply.sticker]),
        )
      : [];
  } catch {
    return [];
  }
};

let savedForumReplies = readSavedForumReplies();

const createForumSticker = (stickerId) => {
  const sticker = document.createElement("img");
  sticker.className = `forum-sticker forum-sticker-${stickerId}`;
  sticker.src = `assets/forum-avatars/${forumStickerFiles[stickerId]}`;
  sticker.alt = forumStickerNames[stickerId];
  sticker.decoding = "async";
  return sticker;
};

const createForumReply = (reply, isNew = false) => {
  const article = document.createElement("article");
  article.className = `forum-reply${isNew ? " is-new" : ""}`;
  article.dataset.replyId = reply.id;

  const [avatarFile] = getForumMemberProfile(reply);
  const avatar = document.createElement("span");
  avatar.className = "forum-reply-avatar";
  const avatarImage = document.createElement("img");
  avatarImage.src = `assets/forum-avatars/${avatarFile}`;
  avatarImage.alt = "";
  avatar.append(avatarImage);

  const content = document.createElement("div");
  content.className = "forum-reply-content";

  const meta = document.createElement("div");
  meta.className = "forum-reply-meta";

  const replyAuthor = document.createElement("strong");
  replyAuthor.textContent = reply.author;
  const replyLevel = document.createElement("span");
  replyLevel.className = "forum-reply-level";
  replyLevel.textContent = reply.level || "LV.1 发芽";
  const replyTime = document.createElement("time");
  replyTime.textContent = reply.time || "刚刚";
  if (reply.datetime) replyTime.dateTime = reply.datetime;
  meta.append(replyAuthor, replyLevel, replyTime);
  content.append(meta);

  if (reply.text) {
    const replyText = document.createElement("p");
    replyText.className = "forum-reply-text";
    replyText.textContent = reply.text;
    content.append(replyText);
  }

  if (reply.sticker && forumStickerNames[reply.sticker]) {
    const stickerWrap = document.createElement("div");
    stickerWrap.className = "forum-reply-sticker";
    stickerWrap.append(createForumSticker(reply.sticker));
    content.append(stickerWrap);
  }

  const actions = document.createElement("div");
  actions.className = "forum-reply-actions";
  const mentionButton = document.createElement("button");
  mentionButton.type = "button";
  mentionButton.className = "forum-reply-mention";
  mentionButton.dataset.replyTo = reply.author;
  mentionButton.textContent = "回复";
  actions.append(mentionButton);
  content.append(actions);
  article.append(avatar, content);
  return article;
};

const renderForumReplies = (newReplyId = "") => {
  if (!forumReplyList || !forumReplyCount) return;

  const replies = [
    ...(seededForumReplies[activeForumPostId] || []),
    ...savedForumReplies,
  ];
  forumReplyList.replaceChildren(
    ...replies.map((reply) => createForumReply(reply, reply.id === newReplyId)),
  );
  forumReplyCount.value = String(replies.length);
  forumReplyCount.textContent = `${replies.length} 条`;
};

const updateSelectedForumSticker = (stickerId = "") => {
  selectedForumSticker = stickerId;
  forumStickerPicker?.querySelectorAll("button").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.stickerId === selectedForumSticker),
    );
  });
  forumStickerToggle?.classList.toggle(
    "has-selection",
    Boolean(selectedForumSticker),
  );
  forumStickerToggle?.setAttribute(
    "aria-label",
    selectedForumSticker
      ? `已选择${forumStickerNames[selectedForumSticker]}，点击更换`
      : "选择表情",
  );
};

forumStickers.forEach(([stickerId, stickerName]) => {
  if (!forumStickerPicker) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "forum-sticker-choice";
  button.dataset.stickerId = stickerId;
  button.setAttribute("aria-label", stickerName);
  button.setAttribute("aria-pressed", "false");
  button.append(createForumSticker(stickerId));
  button.addEventListener("click", () => {
    updateSelectedForumSticker(
      selectedForumSticker === stickerId ? "" : stickerId,
    );
    forumStickerPicker.hidden = true;
    forumStickerToggle?.setAttribute("aria-expanded", "false");
    forumReplyMessage?.focus();
  });
  forumStickerPicker.append(button);
});

forumStickerToggle?.addEventListener("click", () => {
  if (!forumStickerPicker) return;
  const shouldOpen = forumStickerPicker.hidden;
  forumStickerPicker.hidden = !shouldOpen;
  forumStickerToggle.setAttribute("aria-expanded", String(shouldOpen));
});

forumReplyList?.addEventListener("click", (event) => {
  const button = event.target instanceof Element
    ? event.target.closest("[data-reply-to]")
    : null;
  if (!(button instanceof HTMLButtonElement) || !forumReplyMessage) return;

  const mention = `@${button.dataset.replyTo} `;
  forumReplyMessage.value = `${mention}${forumReplyMessage.value}`.slice(0, 500);
  forumReplyMessage.focus();
  forumReplyMessage.setSelectionRange(
    forumReplyMessage.value.length,
    forumReplyMessage.value.length,
  );
});

const syncForumComposerSession = () => {
  const session = window.ZhongZhongForumAuth?.getSession() || null;
  if (forumComposerIdentity) {
    forumComposerIdentity.textContent = session?.nickname || "访客";
  }
};

window.addEventListener("forum:sessionchange", syncForumComposerSession);
syncForumComposerSession();

forumReplyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(forumReplyForm);
  const visibility = String(formData.get("visibility") || "anonymous");
  if (visibility === "real") {
    await Promise.resolve(window.ZhongZhongAccount?.ready);
  }
  const session = window.ZhongZhongForumAuth?.getSession() || null;
  const message = forumReplyMessage?.value.trim() || "";

  if (visibility === "real" && !session) {
    if (forumReplyStatus) forumReplyStatus.textContent = "实名回复需要先登录";
    window.ZhongZhongForumAuth?.open();
    return;
  }

  if (!message && !selectedForumSticker) {
    if (forumReplyStatus) forumReplyStatus.textContent = "写点内容或选一个表情";
    forumReplyMessage?.focus();
    return;
  }

  const now = new Date();
  const publicAuthor = visibility === "real" && session ? session.nickname : "匿名来访者";
  const reply = {
    id: window.crypto?.randomUUID?.() || `reply-${Date.now()}`,
    author: publicAuthor,
    level: visibility === "real" && session ? session.level : "匿名",
    datetime: now.toISOString(),
    time: "刚刚",
    text: message,
    sticker: selectedForumSticker,
    avatar: visibility === "real" ? "new-cattail.png" : "new-clover.png",
    signature:
      visibility === "real"
        ? window.ZhongZhongForumPersonalization?.getSignature() ||
          "今天也在花园里慢慢生长"
        : "匿名留在花园里的纸条",
    achievement: visibility === "real" ? "新芽" : "匿名",
  };

  if (window.location.protocol !== "file:") {
    try {
      const response = await fetch("/api/content/submissions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "forum-reply",
          title: post.title,
          message: message || `[表情] ${selectedForumSticker || ""}`,
          source: activeForumPostId,
          visibility,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "发送失败，请稍后再试。");
      }
    } catch (error) {
      if (forumReplyStatus) forumReplyStatus.textContent = error.message;
      return;
    }
  }

  savedForumReplies.push(reply);

  try {
    window.localStorage.setItem(
      forumReplyStorageKey,
      JSON.stringify(savedForumReplies),
    );
  } catch {
    // The reply still appears for the current page session.
  }

  renderForumReplies(reply.id);
  if (forumReplyMessage) forumReplyMessage.value = "";
  updateSelectedForumSticker("");
  if (forumStickerPicker) forumStickerPicker.hidden = true;
  forumStickerToggle?.setAttribute("aria-expanded", "false");
  if (forumReplyStatus) forumReplyStatus.textContent = "回复已发送";
  forumReplyList?.lastElementChild?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
});

renderForumReplies();
