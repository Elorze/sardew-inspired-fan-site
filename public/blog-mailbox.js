const mailboxMessages = {
  devlog: {
    category: "开发日记",
    date: "2026-07-28",
    displayDate: "2026 年 7 月 28 日",
    title: "把三扇门安到同一条路上",
    greeting: "你好，见信好：",
    summary:
      "今天我们把种种世界、种种酒馆和蒲公英大世界的入口重新摆了一遍。现在从首页出发，每扇门都有自己的方向。",
    body: [
      "三个世界的入口重新摆好了。花园更轻，酒馆更暖，蒲公英的路留了一点风。",
    ],
    paper: "sprout",
    image: "assets/product-world-thumb.png",
    avatar: "assets/forum-avatars/new-clover.png",
    alt: "种种世界花园全景",
    material: "实机画面 01 · 花园入口",
    stamp: "07·28",
    href: "blog-post.html?id=devlog",
  },
  manuscript: {
    category: "创作手记",
    date: "2026-07-27",
    displayDate: "2026 年 7 月 27 日",
    title: "蒲公英地图又长出一条小路",
    greeting: "你好，今天也有风：",
    summary:
      "一边画地图，一边决定哪条路值得绕远，哪片空地应该留给风。新路不是捷径，只是想让旅途多一点意外。",
    body: [
      "地图又长出一条路。它不是捷径，只想让旅途遇见一点风和蒲公英。",
    ],
    paper: "dandelion",
    image: "assets/product-dandelion-thumb.png",
    avatar: "assets/forum-avatars/new-dandelion.png",
    alt: "蒲公英大世界地图全景",
    material: "地图手稿 02 · 新路试画",
    stamp: "07·27",
    href: "blog-post.html?id=manuscript",
  },
  npc: {
    category: "角色记录",
    date: "2026-07-26",
    displayDate: "2026 年 7 月 26 日",
    title: "今天，三位新朋友开口了",
    greeting: "你好，酒馆刚刚亮灯：",
    summary:
      "我们先写下三位新朋友会怎样打招呼，再慢慢补上性格、关系和秘密。现在，他们终于有了各自的第一句话。",
    body: [
      "三位新朋友有了第一句话。有人谈天气，有人惦记晚饭，还有人把秘密留到最后。",
    ],
    paper: "tavern",
    image: "assets/gameplay-tavern.png",
    avatar: "assets/forum-avatars/new-bluebell.png",
    alt: "种种酒馆的三位伙伴",
    material: "角色记录 03 · 酒馆灯光",
    stamp: "07·26",
    href: "blog-post.html?id=npc",
  },
};

const mailItems = [...document.querySelectorAll(".mail-list-item")];
const readingPane = document.querySelector(".mail-reading-pane");
const composePane = document.querySelector(".mail-compose-pane");
const composeButton = document.querySelector(".compose-mail-button");
const sendEntryButton = document.querySelector(".send-mail-entry-button");
const composeClose = document.querySelector(".mail-compose-close");
const receiveButton = document.querySelector(".receive-mail-button");
const receiveCount = receiveButton?.querySelector("output");
const liveStatus = document.querySelector(".mailbox-live-status");
const mailSendButton = composePane?.querySelector(".mail-send-button");
const imageViewer = document.querySelector(".mail-image-viewer");
const imageViewerImage = imageViewer?.querySelector("img");
const imageViewerClose = imageViewer?.querySelector(".mail-image-viewer-close");

const readingTime = readingPane?.querySelector(".mail-reading-header time");
const readingTitle = readingPane?.querySelector("h2");
const readingImage = readingPane?.querySelector(".mail-attachment img");
const readingAvatar = readingPane?.querySelector(".mail-reading-avatar");
const readingSummary = readingPane?.querySelector(".mail-reading-summary");
const readingStamp = readingPane?.querySelector(".mail-stamp");
const readingLink = readingPane?.querySelector(".mail-reading-footer a");

const updateUnreadNotice = () => {
  const unreadCount = mailItems.filter((item) =>
    item.classList.contains("is-unread"),
  ).length;
  if (receiveCount) receiveCount.textContent = String(unreadCount);
  receiveButton?.classList.toggle("is-complete", unreadCount === 0);
};

const showReadingPane = () => {
  if (!readingPane || !composePane || !composeButton) return;
  composePane.hidden = true;
  readingPane.hidden = false;
  readingPane.classList.remove("is-opening");
  window.requestAnimationFrame(() => {
    readingPane.classList.add("is-opening");
  });
  receiveButton?.setAttribute("aria-pressed", "true");
  composeButton.setAttribute("aria-pressed", "false");
  sendEntryButton?.setAttribute("aria-pressed", "false");
};

const showComposePane = (activeButton = composeButton) => {
  if (!readingPane || !composePane || !composeButton) return;
  readingPane.hidden = true;
  composePane.hidden = false;
  composePane.classList.remove("is-sent");
  receiveButton?.setAttribute("aria-pressed", "false");
  composeButton.setAttribute(
    "aria-pressed",
    String(activeButton === composeButton),
  );
  sendEntryButton?.setAttribute(
    "aria-pressed",
    String(activeButton === sendEntryButton),
  );
  composePane.classList.remove("is-opening");
  window.requestAnimationFrame(() => {
    composePane.classList.add("is-opening");
    composePane.querySelector('input[name="subject"]')?.focus();
  });
};

let renderSequence = 0;

const renderMessage = (messageId) => {
  const message = mailboxMessages[messageId];
  if (
    !message ||
    !readingPane ||
    !readingTime ||
    !readingTitle ||
    !readingImage ||
    !readingStamp ||
    !readingLink
  ) {
    return;
  }

  const sequence = ++renderSequence;
  readingPane.classList.remove("is-opening");
  readingPane.classList.add("is-closing");

  window.setTimeout(() => {
    if (sequence !== renderSequence) return;
    readingTime.dateTime = message.date;
    readingTime.textContent = message.displayDate
      .replaceAll(" 年 ", ".")
      .replace(" 月 ", ".")
      .replace(" 日", "");
    readingTitle.textContent = message.title;
    readingPane.dataset.paper = message.paper;
    readingImage.src = message.image;
    readingImage.alt = message.alt;
    if (readingAvatar) {
      readingAvatar.src = message.avatar;
      readingAvatar.alt = "";
    }
    if (readingSummary) readingSummary.textContent = message.summary;
    readingStamp.textContent = message.stamp;
    readingLink.href = message.href;
    readingPane.classList.remove("is-closing");
    showReadingPane();
  }, 140);
};

const openImageViewer = (sourceImage) => {
  if (!imageViewer || !imageViewerImage || !sourceImage) return;
  imageViewerImage.src = sourceImage.currentSrc || sourceImage.src;
  imageViewerImage.alt = sourceImage.alt || "放大的信件图片";
  imageViewer.showModal();
  window.requestAnimationFrame(() => imageViewer.classList.add("is-visible"));
};

document
  .querySelectorAll(".mail-attachment img, .mail-reading-avatar")
  .forEach((image) => {
    image.addEventListener("dblclick", () => openImageViewer(image));
    image.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openImageViewer(image);
    });
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${image.alt || "信件图片"}，双击放大`);
  });

const closeImageViewer = () => {
  if (!imageViewer?.open) return;
  imageViewer.classList.remove("is-visible");
  window.setTimeout(() => imageViewer.close(), 180);
};

imageViewerClose?.addEventListener("click", closeImageViewer);
imageViewer?.addEventListener("click", (event) => {
  if (event.target === imageViewer) closeImageViewer();
});
imageViewer?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeImageViewer();
});

mailItems.forEach((item) => {
  item.addEventListener("click", () => {
    mailItems.forEach((candidate) => {
      candidate.classList.remove("is-active");
      candidate.setAttribute("aria-pressed", "false");
    });
    item.classList.add("is-active");
    item.setAttribute("aria-pressed", "true");
    item.classList.remove("is-unread");
    updateUnreadNotice();
    item.classList.add("is-opening-letter");
    window.setTimeout(() => item.classList.remove("is-opening-letter"), 620);
    renderMessage(item.dataset.mailId);
  });
});

composeButton?.addEventListener("click", () => {
  if (!readingPane || !composePane) return;
  const shouldOpen = composePane.hidden;
  if (shouldOpen) {
    showComposePane(composeButton);
  } else {
    showReadingPane();
  }
});

sendEntryButton?.addEventListener("click", () => showComposePane(sendEntryButton));

composeClose?.addEventListener("click", showReadingPane);

const playIncomingLetterSound = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const startAt = audioContext.currentTime;
  [
    { frequency: 659.25, delay: 0 },
    { frequency: 783.99, delay: 0.12 },
    { frequency: 987.77, delay: 0.24 },
  ].forEach(({ frequency, delay }) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noteStart = startAt + delay;
    const noteEnd = noteStart + 0.22;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.055, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  });

  window.setTimeout(() => audioContext.close(), 700);
};

receiveButton?.addEventListener("click", () => {
  if (receiveButton.classList.contains("is-receiving")) return;

  showReadingPane();
  receiveButton.classList.add("is-receiving");
  receiveButton.disabled = true;
  playIncomingLetterSound();

  mailItems.forEach((item, index) => {
    window.setTimeout(() => {
      item.classList.add("is-arriving", "is-unread");
      window.setTimeout(() => item.classList.remove("is-arriving"), 600);
    }, index * 130);
  });

  window.setTimeout(() => {
    receiveButton.classList.remove("is-receiving");
    receiveButton.disabled = false;
    updateUnreadNotice();
    if (liveStatus) liveStatus.textContent = "已收到 3 封来信";
  }, 720);
});

composePane?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(composePane);
  const subject = String(form.get("subject") || "").trim();
  const message = String(form.get("message") || "").trim();
  const visibility = String(form.get("visibility") || "anonymous");
  const status = composePane.querySelector(".mail-send-status");

  if (!subject || !message) {
    if (status) status.textContent = "请先写完整主题和正文";
    return;
  }

  if (window.location.protocol === "file:") {
    if (status) status.textContent = "请用本地网站地址打开后寄信";
    return;
  }

  if (visibility === "real") {
    await Promise.resolve(window.ZhongZhongAccount?.ready);
  }

  if (visibility === "real" && !window.ZhongZhongAccount?.getSession()) {
    if (status) status.textContent = "实名刊登需要先登录";
    window.ZhongZhongAccount?.open();
    return;
  }

  composePane.classList.add("is-sealing");
  if (mailSendButton) mailSendButton.disabled = true;
  if (status) status.textContent = "正在盖章，准备寄出……";
  window.setTimeout(async () => {
    try {
      const response = await fetch("/api/content/submissions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blog-letter",
          title: subject,
          message,
          visibility,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "寄出失败，请稍后再试。");
      }
      composePane.reset();
      composePane.classList.add("is-sent");
      if (status) status.textContent = "已收到，审核后会刊登";
      window.setTimeout(() => composePane.classList.remove("is-sent"), 2200);
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      composePane.classList.remove("is-sealing");
      if (mailSendButton) mailSendButton.disabled = false;
    }
  }, 520);
});

if (new URLSearchParams(window.location.search).get("compose") === "1") {
  showComposePane(composeButton);
}
