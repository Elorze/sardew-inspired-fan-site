const forumReplyStoragePrefix = "zhongzhong-forum-replies-v1:";
const defaultForumSignature = "今天也在花园里慢慢生长";
const forumBoard = document.querySelector("#forumBoard");
const forumCategories = document.querySelector("#forumCategories");
const forumPagination = document.querySelector("#forumPagination");
const forumPageNumbers = document.querySelector("#forumPageNumbers");
const forumPageStatus = document.querySelector("#forumPageStatus");
let forumThreads = [];
const forumPageSize = 6;

const loadForumThreads = async () => {
  if (window.location.protocol === "file:") {
    forumThreads = window.ZhongZhongForumThreads || [];
    return;
  }
  try {
    const response = await fetch(`/api/forum/posts?page=1&pageSize=50`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("forum request failed");
    const payload = await response.json();
    forumThreads = (payload.items || []).map((post) => ({
      id: post.id,
      category: post.categoryId,
      title: post.title,
      author: post.author?.name || "无名旅人",
      level: "社区成员",
      avatar: "new-cattail.png",
      pinned: post.isPinned,
      updated: post.lastRepliedAt || post.createdAt,
      datetime: post.lastRepliedAt || post.createdAt,
      replies: post.replyCount,
    }));
  } catch {
    forumThreads = window.ZhongZhongForumThreads || [];
  }
};
const forumCategoryLabels = {
  all: "全部",
  world: "世界",
  plants: "植物",
  tavern: "酒馆",
  creative: "创作",
  help: "互助",
};
const forumUrl = new URL(window.location.href);
const requestedForumCategory = forumUrl.searchParams.get("category") || "all";
let activeForumCategory = Object.hasOwn(
  forumCategoryLabels,
  requestedForumCategory,
)
  ? requestedForumCategory
  : "all";
let activeForumPage = Math.max(
  Number.parseInt(forumUrl.searchParams.get("page") || "1", 10) || 1,
  1,
);

const savedReplyCountFor = (postId) => {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(`${forumReplyStoragePrefix}${postId}`) || "[]",
    );
    return Array.isArray(saved) ? saved.length : 0;
  } catch {
    return 0;
  }
};

const createForumRow = (thread) => {
  const customReplyCount = savedReplyCountFor(thread.id);
  const serverReplyCount = Number(thread.replies) || 0;
  const totalReplyCount = Math.max(serverReplyCount, customReplyCount);
  const row = document.createElement("a");
  row.className = `forum-row${thread.pinned ? " is-pinned" : ""}`;
  row.href = `forum-post.html?id=${encodeURIComponent(thread.id)}`;

  const avatar = document.createElement("span");
  avatar.className = "forum-avatar";
  const avatarImage = document.createElement("img");
  avatarImage.src = `assets/forum-avatars/${thread.avatar}`;
  avatarImage.alt = "";
  avatar.append(avatarImage);

  const topic = document.createElement("span");
  topic.className = "forum-topic";
  const topicTitle = document.createElement("span");
  topicTitle.className = "forum-topic-title";
  const title = document.createElement("strong");
  title.textContent = thread.title;
  topicTitle.append(title);
  if (thread.pinned) {
    const pinned = document.createElement("small");
    pinned.textContent = "置顶";
    topicTitle.append(pinned);
  }
  const topicMeta = document.createElement("span");
  topicMeta.className = "forum-topic-meta";
  const author = document.createElement("b");
  author.textContent = thread.author;
  const level = document.createElement("small");
  level.textContent = thread.level;
  topicMeta.append(author, level);
  topic.append(topicTitle, topicMeta);

  const stats = document.createElement("span");
  stats.className = "forum-thread-stats";
  const count = document.createElement("b");
  count.className = "forum-reply-count";
  if (customReplyCount > 0 && customReplyCount >= serverReplyCount) {
    count.textContent = `${customReplyCount} 条你的回复`;
  } else if (totalReplyCount > 0) {
    count.textContent = `${totalReplyCount} 回复`;
  } else {
    count.textContent = "等你来聊";
  }
  const updated = document.createElement("time");
  updated.className = "forum-updated";
  if (thread.datetime) updated.dateTime = thread.datetime;
  updated.textContent =
    customReplyCount > 0 && customReplyCount >= serverReplyCount
      ? "刚刚"
      : thread.updated;
  stats.append(count, updated);

  row.append(avatar, topic, stats);
  return row;
};

const syncForumUrl = () => {
  const nextUrl = new URL(window.location.href);
  if (activeForumCategory === "all") {
    nextUrl.searchParams.delete("category");
  } else {
    nextUrl.searchParams.set("category", activeForumCategory);
  }
  if (activeForumPage === 1) {
    nextUrl.searchParams.delete("page");
  } else {
    nextUrl.searchParams.set("page", String(activeForumPage));
  }
  window.history.replaceState(null, "", nextUrl);
};

const renderForumPages = (pageCount) => {
  if (
    !(forumPagination instanceof HTMLElement) ||
    !(forumPageNumbers instanceof HTMLElement)
  ) {
    return;
  }
  const previous = forumPagination.querySelector('[data-forum-page="previous"]');
  const next = forumPagination.querySelector('[data-forum-page="next"]');
  if (previous instanceof HTMLButtonElement) {
    previous.disabled = activeForumPage <= 1;
  }
  if (next instanceof HTMLButtonElement) {
    next.disabled = activeForumPage >= pageCount;
  }
  forumPageNumbers.replaceChildren(
    ...Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.forumPage = String(page);
      button.textContent = String(page);
      button.setAttribute("aria-label", `第 ${page} 页`);
      if (page === activeForumPage) {
        button.setAttribute("aria-current", "page");
      }
      return button;
    }),
  );
};

const renderForumBoard = ({ announce = false } = {}) => {
  if (!(forumBoard instanceof HTMLElement)) return;
  const filteredThreads =
    activeForumCategory === "all"
      ? forumThreads
      : forumThreads.filter(
          (thread) => thread.category === activeForumCategory,
        );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredThreads.length / forumPageSize),
  );
  activeForumPage = Math.min(activeForumPage, pageCount);
  const pageStart = (activeForumPage - 1) * forumPageSize;
  forumBoard.replaceChildren(
    ...filteredThreads
      .slice(pageStart, pageStart + forumPageSize)
      .map(createForumRow),
  );
  forumCategories
    ?.querySelectorAll("[data-forum-category]")
    .forEach((button) => {
      button.setAttribute(
        "aria-selected",
        String(button.dataset.forumCategory === activeForumCategory),
      );
    });
  renderForumPages(pageCount);
  syncForumUrl();
  if (announce && forumPageStatus) {
    forumPageStatus.textContent = `${forumCategoryLabels[activeForumCategory]}，第 ${activeForumPage} 页，共 ${filteredThreads.length} 个开放话题`;
  }
};

forumCategories?.addEventListener("click", (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest("[data-forum-category]")
      : null;
  if (!(button instanceof HTMLButtonElement)) return;
  const category = button.dataset.forumCategory || "all";
  if (!Object.hasOwn(forumCategoryLabels, category)) return;
  activeForumCategory = category;
  activeForumPage = 1;
  renderForumBoard({ announce: true });
});

forumPagination?.addEventListener("click", (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest("[data-forum-page]")
      : null;
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const page = button.dataset.forumPage;
  if (page === "previous") activeForumPage -= 1;
  if (page === "next") activeForumPage += 1;
  if (/^\d+$/.test(page || "")) activeForumPage = Number(page);
  renderForumBoard({ announce: true });
  forumCategories?.scrollIntoView({ behavior: "smooth", block: "start" });
});

const rewards = document.querySelector("[data-forum-rewards]");
const loginCard = document.querySelector("[data-forum-login]");
const memberName = document.querySelector("#forumMemberName");
const memberLevel = document.querySelector("#forumMemberLevel");
const pointsValue = document.querySelector("#forumPoints");
const checkInButton = document.querySelector("#forumCheckIn");
const checkInStatus = document.querySelector("#forumCheckInStatus");
const gardenBed = document.querySelector("#forumSpeechBed");
const gardenPickButton = document.querySelector("#forumGardenPick");
const gardenWaterButton = document.querySelector("#forumGardenWater");
const interactionStatus = document.querySelector("#forumInteractionStatus");
const pickedSpeech = document.querySelector("#forumPickedSpeech");
const avatarPicker = document.querySelector("#forumAvatarPicker");
const memberAvatar = document.querySelector("#forumMemberAvatar");
const waterAchievement = document.querySelector("#forumWaterAchievement");
const waterProgress = document.querySelector("#forumWaterProgress");
const waterProgressBar = document.querySelector("#forumWaterProgressBar");
const checkInStreak = document.querySelector("#forumCheckInStreak");
const checkInSteps = document.querySelector("#forumCheckInSteps");
const checkInReward = document.querySelector("#forumCheckInReward");
const gardenWaterStorageKey = "zhongzhong-forum-water-achievement-v1";
const guestAvatarStorageKey = "zhongzhong-forum-guest-avatar-v1";
const guestAvatars = [
  "new-cattail.png",
  "new-clover.png",
  "new-lilybell.png",
  "new-dandelion.png",
  "new-bluebell.png",
  "new-mushroom.png",
];
let rewardRequest = 0;
let selectedGardenPhraseId = "";
const waterAchievementTarget = 3;
const fallbackGardenPhrases = [
  {
    id: "welcome",
    postId: "welcome",
    text: "先从这里认识大家，把路标轻轻插在花园入口。",
    speaker: "种种",
    avatar: "new-lilybell.png",
    heat: 0,
  },
  {
    id: "tavern",
    postId: "tavern",
    text: "酒馆今晚留哪一盏灯，路过的人都可以坐一会儿。",
    speaker: "小椒",
    avatar: "new-mushroom.png",
    heat: 0,
  },
  {
    id: "world",
    postId: "world",
    text: "今天在种种世界发现了什么？叶子会替你记住路线。",
    speaker: "青芽",
    avatar: "new-clover.png",
    heat: 0,
  },
  {
    id: "dandelion",
    postId: "dandelion",
    text: "蒲公英地图交换处，风会把新的路带回来。",
    speaker: "风团",
    avatar: "new-dandelion.png",
    heat: 0,
  },
  {
    id: "creative",
    postId: "creative",
    text: "晒晒贴在手账里的种种，把小小的图案种进纸页。",
    speaker: "花花",
    avatar: "new-bluebell.png",
    heat: 0,
  },
];

const renderPickedSpeech = (phrase) => {
  if (!pickedSpeech || !phrase) return;
  const image = pickedSpeech.querySelector("img");
  const name = pickedSpeech.querySelector("strong");
  const copy = pickedSpeech.querySelector("p");
  const link = pickedSpeech.querySelector("a");
  if (image instanceof HTMLImageElement) {
    image.src = `assets/forum-avatars/${phrase.avatar}`;
  }
  if (name) name.textContent = phrase.speaker;
  if (copy) copy.textContent = phrase.text;
  if (link instanceof HTMLAnchorElement) {
    link.href = `forum-post.html?id=${phrase.postId}`;
  }
  pickedSpeech.hidden = false;
};

const renderSpeechGarden = (phrases = []) => {
  if (!gardenBed) return;
  gardenBed.replaceChildren(
    ...phrases.map((phrase, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "forum-speech-flower";
      button.dataset.phraseId = phrase.id;
      button.style.setProperty("--flower-rank", String(index));
      button.title = `查看${phrase.speaker}的话语`;
      button.setAttribute(
        "aria-pressed",
        String(phrase.id === selectedGardenPhraseId),
      );
      button.setAttribute(
        "aria-label",
        `查看${phrase.speaker}的话语`,
      );

      const image = document.createElement("img");
      image.src = `assets/forum-avatars/${phrase.avatar}`;
      image.alt = "";

      button.append(image);
      return button;
    }),
  );
};

const syncGardenFromResponse = (payload) => {
  if (payload.selected?.id) selectedGardenPhraseId = payload.selected.id;
  renderSpeechGarden(payload.phrases || []);
  if (payload.selected) renderPickedSpeech(payload.selected);
};

const requestSpeechGarden = async () => {
  if (window.location.protocol === "file:") {
    renderSpeechGarden(fallbackGardenPhrases);
    return;
  }

  try {
    const response = await fetch("/api/forum/garden", {
      headers: { Accept: "application/json" },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "读取失败");
    syncGardenFromResponse(payload);
  } catch {
    renderSpeechGarden(fallbackGardenPhrases);
  }
};

const mutateSpeechGarden = async (path) => {
  if (window.location.protocol === "file:") return;
  const response = await fetch(path, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "操作失败");
  syncGardenFromResponse(payload);
};

const chinaDateKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const readGuestWaterDates = () => {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(gardenWaterStorageKey) || '{"dates":[]}',
    );
    return Array.isArray(value.dates)
      ? value.dates.filter((date) => typeof date === "string")
      : [];
  } catch {
    return [];
  }
};

const renderWaterAchievement = (status = null) => {
  const guestDates = status ? [] : readGuestWaterDates();
  const achievement = status?.waterAchievement || {
    progress: Math.min(guestDates.length, waterAchievementTarget),
    target: waterAchievementTarget,
    unlocked: guestDates.length >= waterAchievementTarget,
  };
  const progress = Math.min(
    Number(achievement.progress) || 0,
    Number(achievement.target) || waterAchievementTarget,
  );
  const target = Number(achievement.target) || waterAchievementTarget;
  if (waterProgress) {
    waterProgress.textContent = achievement.unlocked
      ? "已获得"
      : `${progress} / ${target}`;
  }
  if (waterProgressBar instanceof HTMLElement) {
    waterProgressBar.style.width = `${Math.min((progress / target) * 100, 100)}%`;
  }
  waterAchievement?.classList.toggle(
    "is-unlocked",
    Boolean(achievement.unlocked),
  );
  if (gardenWaterButton instanceof HTMLButtonElement) {
    const wateredToday = status
      ? Boolean(status.wateredToday)
      : guestDates.includes(chinaDateKey());
    const label = gardenWaterButton.querySelector("span");
    if (label) label.textContent = wateredToday ? "已浇水" : "浇水";
  }
};

const renderCheckInProgress = (session, status = null) => {
  const streak = Math.max(Number(status?.streak) || 0, 0);
  const checkedInToday = Boolean(status?.checkedInToday);
  const progress = Math.min(streak, 7);

  if (checkInStreak) {
    checkInStreak.textContent = `${streak} 天`;
  }
  checkInSteps?.querySelectorAll("li").forEach((step, index) => {
    const complete = index < progress;
    step.classList.toggle("is-complete", complete);
    step.setAttribute("aria-label", `第 ${index + 1} 天${complete ? "已完成" : "未完成"}`);
  });
  if (checkInReward) {
    checkInReward.textContent = session && !status
      ? "正在同步签到记录"
      : checkedInToday
        ? "今日已领取 10 积分"
        : "今日可领取 10 积分";
  }
  checkInButton?.setAttribute("aria-pressed", String(checkedInToday));
};

const renderRewardStatus = (session, status) => {
  if (!rewards) return;
  rewards.hidden = false;
  if (loginCard) loginCard.hidden = true;
  if (!session) {
    if (memberName) memberName.textContent = "游客";
    if (memberLevel) memberLevel.textContent = "LV.0 游园";
    if (pointsValue) pointsValue.textContent = "0";
    if (checkInButton instanceof HTMLButtonElement) {
      checkInButton.hidden = false;
      checkInButton.disabled = false;
      checkInButton.querySelector("span").textContent = "签到";
    }
    if (checkInStatus) {
      checkInStatus.textContent = "";
      checkInStatus.classList.remove("is-error");
    }
    renderCheckInProgress(null);
    renderWaterAchievement();
    return;
  }

  if (memberName) memberName.textContent = session.nickname;
  if (memberLevel) memberLevel.textContent = session.level || "LV.1 发芽";
  if (pointsValue) {
    pointsValue.textContent = String(status?.points ?? session.points ?? 0);
  }
  if (checkInButton instanceof HTMLButtonElement) {
    checkInButton.hidden = false;
    checkInButton.disabled = Boolean(status?.checkedInToday);
    const label = checkInButton.querySelector("span");
    if (label) label.textContent = status?.checkedInToday ? "已签到" : "签到";
  }
  if (checkInStatus) {
    checkInStatus.textContent =
      status?.streak > 1 ? `连续 ${status.streak} 天` : "";
    checkInStatus.classList.remove("is-error");
  }
  renderCheckInProgress(session, status);
  renderWaterAchievement(status);
};

const setGuestAvatar = (avatarFile) => {
  if (!(memberAvatar instanceof HTMLImageElement)) return;
  const safeAvatar = guestAvatars.includes(avatarFile)
    ? avatarFile
    : guestAvatars[0];
  memberAvatar.src = `assets/forum-avatars/${safeAvatar}`;
  avatarPicker?.setAttribute(
    "aria-label",
    `当前游客头像，点击更换`,
  );
};

const restoreGuestAvatar = () => {
  try {
    setGuestAvatar(
      window.localStorage.getItem(guestAvatarStorageKey) || guestAvatars[0],
    );
  } catch {
    setGuestAvatar(guestAvatars[0]);
  }
};

avatarPicker?.addEventListener("click", () => {
  if (window.ZhongZhongForumAuth?.getSession()) {
    if (interactionStatus) interactionStatus.textContent = "头像跟随当前账号";
    return;
  }
  const currentFile =
    memberAvatar instanceof HTMLImageElement
      ? memberAvatar.src.split("/").pop()
      : guestAvatars[0];
  const currentIndex = Math.max(guestAvatars.indexOf(currentFile), 0);
  const nextAvatar = guestAvatars[(currentIndex + 1) % guestAvatars.length];
  setGuestAvatar(nextAvatar);
  try {
    window.localStorage.setItem(guestAvatarStorageKey, nextAvatar);
  } catch {
    // The selected avatar still applies for the current page session.
  }
  if (interactionStatus) interactionStatus.textContent = "游客头像已更换";
});

const requestRewardStatus = async (session) => {
  const currentRequest = ++rewardRequest;
  if (!session) {
    renderRewardStatus(null);
    return;
  }

  renderRewardStatus(session);
  try {
    const response = await fetch("/api/auth/forum-points", {
      headers: { Accept: "application/json" },
    });
    const status = await response.json();
    if (currentRequest !== rewardRequest) return;
    if (!response.ok) throw new Error(status.message || "积分读取失败");
    renderRewardStatus(session, status);
  } catch {
    if (currentRequest !== rewardRequest) return;
    renderRewardStatus(session);
  }
};

checkInButton?.addEventListener("click", async () => {
  const session = window.ZhongZhongForumAuth?.getSession() || null;
  if (!(checkInButton instanceof HTMLButtonElement)) return;
  if (!session) {
    window.ZhongZhongForumAuth?.open();
    return;
  }

  checkInButton.disabled = true;
  checkInButton.setAttribute("aria-busy", "true");
  const label = checkInButton.querySelector("span");
  if (label) label.textContent = "签到中";
  if (checkInStatus) checkInStatus.textContent = "";
  try {
    const response = await fetch("/api/auth/forum-check-in", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const status = await response.json();
    if (!response.ok) throw new Error(status.message || "签到失败");
    renderRewardStatus(session, status);
    if (checkInStatus && status.awarded) {
      checkInStatus.textContent = `签到成功 · +${status.awarded} 积分`;
      checkInStatus.classList.remove("is-error");
    }
  } catch (error) {
    checkInButton.disabled = false;
    if (label) label.textContent = "重试";
    if (checkInStatus) {
      checkInStatus.textContent =
        error instanceof Error ? error.message : "签到失败，请稍后重试";
      checkInStatus.classList.add("is-error");
    }
  } finally {
    checkInButton.removeAttribute("aria-busy");
  }
});

loginCard?.addEventListener("click", () => {
  window.ZhongZhongForumAuth?.open();
});

gardenPickButton?.addEventListener("click", async () => {
  if (!(gardenPickButton instanceof HTMLButtonElement)) return;
  if (window.location.protocol === "file:") {
    renderPickedSpeech(
      fallbackGardenPhrases[Math.floor(Math.random() * fallbackGardenPhrases.length)],
    );
    if (interactionStatus) interactionStatus.textContent = "采到一株话语";
    return;
  }
  gardenPickButton.disabled = true;
  try {
    await mutateSpeechGarden("/api/forum/garden/random");
    if (interactionStatus) interactionStatus.textContent = "采到一株话语";
  } catch {
    renderPickedSpeech(
      fallbackGardenPhrases[Math.floor(Math.random() * fallbackGardenPhrases.length)],
    );
    if (interactionStatus) interactionStatus.textContent = "采到一株话语";
  } finally {
    gardenPickButton.disabled = false;
  }
});

gardenWaterButton?.addEventListener("click", async () => {
  if (!(gardenWaterButton instanceof HTMLButtonElement)) return;
  gardenBed?.classList.remove("is-watered");
  window.requestAnimationFrame(() => gardenBed?.classList.add("is-watered"));
  const session = window.ZhongZhongForumAuth?.getSession() || null;
  gardenWaterButton.disabled = true;
  try {
    if (session && window.location.protocol !== "file:") {
      const response = await fetch("/api/auth/forum-water", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      const status = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(status.message || "浇水失败");
      renderRewardStatus(session, status);
      if (interactionStatus) {
        interactionStatus.textContent = status.waterAchievement?.newlyUnlocked
          ? "获得成就：晨露园丁"
          : status.awarded
            ? `花园积分 +${status.awarded}`
            : "今天已经浇过水了";
      }
    } else {
      const today = chinaDateKey();
      const waterDates = readGuestWaterDates();
      const watered = waterDates.includes(today);
      if (!watered) {
        waterDates.push(today);
        window.localStorage.setItem(
          gardenWaterStorageKey,
          JSON.stringify({ dates: waterDates.slice(-30) }),
        );
      }
      renderWaterAchievement();
      if (interactionStatus) {
        interactionStatus.textContent = watered
          ? "今天已经浇过水了"
          : "晨露园丁进度 +1";
      }
    }
  } catch {
    if (interactionStatus) interactionStatus.textContent = "浇水失败，请稍后重试";
  } finally {
    gardenWaterButton.disabled = false;
    window.setTimeout(() => gardenBed?.classList.remove("is-watered"), 900);
  }
});

gardenBed?.addEventListener("click", async (event) => {
  const button = event.target instanceof Element
    ? event.target.closest("[data-phrase-id]")
    : null;
  if (!(button instanceof HTMLButtonElement)) return;
  selectedGardenPhraseId = button.dataset.phraseId || "";
  gardenBed.querySelectorAll("[data-phrase-id]").forEach((plant) => {
    plant.setAttribute("aria-pressed", String(plant === button));
  });
  if (window.location.protocol === "file:") {
    renderPickedSpeech(
      fallbackGardenPhrases.find(
        (phrase) => phrase.id === button.dataset.phraseId,
      ),
    );
    return;
  }
  try {
    await mutateSpeechGarden(
      `/api/forum/garden/${encodeURIComponent(button.dataset.phraseId || "")}/view`,
    );
  } catch {
    renderPickedSpeech(
      fallbackGardenPhrases.find(
        (phrase) => phrase.id === button.dataset.phraseId,
      ),
    );
  }
});

window.addEventListener("forum:sessionchange", (event) => {
  void requestRewardStatus(event.detail || null);
});

window.ZhongZhongForumPersonalization = {
  getFrame: () => "leaf",
  getDensity: () => "cozy",
  getSignature: () => defaultForumSignature,
};

void requestRewardStatus(window.ZhongZhongForumAuth?.getSession() || null);
void requestSpeechGarden();
loadForumThreads().finally(() => renderForumBoard());
renderWaterAchievement();
restoreGuestAvatar();
