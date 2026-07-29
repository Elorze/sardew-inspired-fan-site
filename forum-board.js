const forumReplyStoragePrefix = "zhongzhong-forum-replies-v1:";
const defaultForumSignature = "今天也在花园里慢慢生长";

document.querySelectorAll(".forum-row").forEach((row) => {
  const link = row instanceof HTMLAnchorElement ? row : null;
  const count = row.querySelector(".forum-reply-count");
  if (!link || !count) return;

  const postId = new URL(link.href).searchParams.get("id");
  if (!postId) return;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(`${forumReplyStoragePrefix}${postId}`) || "[]",
    );
    const customReplyCount = Array.isArray(saved) ? saved.length : 0;
    count.textContent = String(
      Number.parseInt(count.textContent || "0", 10) + customReplyCount,
    );
    if (customReplyCount) {
      const updated = row.querySelector(".forum-updated");
      if (updated) updated.textContent = "刚刚";
    }
  } catch {
    // Static counts remain available when local storage is unavailable.
  }
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
const pickedSpeech = document.querySelector("#forumPickedSpeech");
let rewardRequest = 0;
const fallbackGardenPhrases = [
  {
    id: "welcome",
    postId: "welcome",
    text: "先从这里认识大家，把路标轻轻插在花园入口。",
    speaker: "种种",
    avatar: "new-lilybell.png",
    heat: 42,
  },
  {
    id: "tavern",
    postId: "tavern",
    text: "酒馆今晚留哪一盏灯，路过的人都可以坐一会儿。",
    speaker: "小椒",
    avatar: "new-mushroom.png",
    heat: 38,
  },
  {
    id: "world",
    postId: "world",
    text: "今天在种种世界发现了什么？叶子会替你记住路线。",
    speaker: "青芽",
    avatar: "new-clover.png",
    heat: 31,
  },
  {
    id: "dandelion",
    postId: "dandelion",
    text: "蒲公英地图交换处，风会把新的路带回来。",
    speaker: "风团",
    avatar: "new-dandelion.png",
    heat: 27,
  },
  {
    id: "creative",
    postId: "creative",
    text: "晒晒贴在手账里的种种，把小小的图案种进纸页。",
    speaker: "花花",
    avatar: "new-bluebell.png",
    heat: 24,
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
      button.setAttribute(
        "aria-label",
        `查看${phrase.speaker}的话语，热度 ${phrase.heat}`,
      );

      const image = document.createElement("img");
      image.src = `assets/forum-avatars/${phrase.avatar}`;
      image.alt = "";

      const text = document.createElement("span");
      text.textContent = phrase.text;

      const heat = document.createElement("small");
      heat.textContent = `热度 ${phrase.heat}`;

      button.append(image, text, heat);
      return button;
    }),
  );
};

const syncGardenFromResponse = (payload) => {
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
    renderSpeechGarden([]);
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

const renderRewardStatus = (session, status) => {
  if (!rewards) return;
  rewards.hidden = !session;
  if (loginCard) loginCard.hidden = Boolean(session);
  if (!session) return;

  if (memberName) memberName.textContent = session.nickname;
  if (memberLevel) memberLevel.textContent = session.level || "LV.1 发芽";
  if (pointsValue) {
    pointsValue.textContent = String(status?.points ?? session.points ?? 0);
  }
  if (checkInButton instanceof HTMLButtonElement) {
    checkInButton.disabled = Boolean(status?.checkedInToday);
    checkInButton.textContent = status?.checkedInToday ? "已签到" : "签到";
  }
  if (checkInStatus) {
    checkInStatus.textContent =
      status?.streak > 1 ? `连续 ${status.streak} 天` : "";
  }
};

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
  if (!session || !(checkInButton instanceof HTMLButtonElement)) return;

  checkInButton.disabled = true;
  checkInButton.textContent = "...";
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
      checkInStatus.textContent = `+${status.awarded}`;
    }
  } catch {
    checkInButton.disabled = false;
    checkInButton.textContent = "重试";
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
    return;
  }
  gardenPickButton.disabled = true;
  try {
    await mutateSpeechGarden("/api/forum/garden/random");
  } catch {
    // The garden remains readable even when the local backend is not running.
  } finally {
    gardenPickButton.disabled = false;
  }
});

gardenBed?.addEventListener("click", async (event) => {
  const button = event.target instanceof Element
    ? event.target.closest("[data-phrase-id]")
    : null;
  if (!(button instanceof HTMLButtonElement)) return;
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
    // Keep the static fallback calm if the API is unavailable.
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
