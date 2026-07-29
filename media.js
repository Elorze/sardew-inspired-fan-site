const mediaPlayer = document.querySelector(".media-video-player");
const mediaVideo = document.querySelector("#mediaVideo");
const mediaPlayToggle = document.querySelector(".media-play-toggle");
const mediaPlayIcon = mediaPlayToggle?.querySelector("[aria-hidden]");
const mediaPausedIndicator = document.querySelector(".media-paused-indicator");
const mediaSeek = document.querySelector("#mediaSeek");
const mediaTime = document.querySelector(".media-time");
const mediaMuteToggle = document.querySelector(".media-mute-toggle");
const mediaMuteIcon = mediaMuteToggle?.querySelector("[aria-hidden]");
const mediaFullscreenToggle = document.querySelector(".media-fullscreen-toggle");
let mediaControlsTimer;
let mediaProgressFrame;
let mediaWasPlayingBeforeSeek = false;

const formatMediaTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
};

const updateMediaTime = () => {
  if (!mediaVideo || !mediaSeek || !mediaTime) return;

  const duration = Number.isFinite(mediaVideo.duration) ? mediaVideo.duration : 0;
  const progress = duration ? mediaVideo.currentTime / duration : 0;
  const rangeValue = Math.round(progress * 1000);
  mediaSeek.value = String(rangeValue);
  mediaSeek.style.setProperty("--media-progress", `${progress * 100}%`);
  mediaTime.textContent = `${formatMediaTime(mediaVideo.currentTime)} / ${formatMediaTime(duration)}`;
};

const stopMediaProgressLoop = () => {
  window.cancelAnimationFrame(mediaProgressFrame);
  mediaProgressFrame = undefined;
};

const runMediaProgressLoop = () => {
  stopMediaProgressLoop();
  const tick = () => {
    updateMediaTime();
    if (mediaVideo && !mediaVideo.paused) {
      mediaProgressFrame = window.requestAnimationFrame(tick);
    }
  };
  tick();
};

const updateMediaPlayState = () => {
  if (!mediaVideo || !mediaPlayer || !mediaPlayToggle || !mediaPlayIcon) return;

  const isPaused = mediaVideo.paused;
  mediaPlayer.classList.toggle("is-paused", isPaused);
  mediaPlayToggle.setAttribute("aria-label", isPaused ? "播放" : "暂停");
  mediaPlayIcon.textContent = isPaused ? "▶" : "Ⅱ";

  if (isPaused) stopMediaProgressLoop();
  else runMediaProgressLoop();
};

const updateMediaMuteState = () => {
  if (!mediaVideo || !mediaMuteToggle || !mediaMuteIcon) return;

  const isMuted = mediaVideo.muted || mediaVideo.volume === 0;
  mediaMuteToggle.setAttribute("aria-label", isMuted ? "打开声音" : "静音");
  mediaMuteIcon.textContent = isMuted ? "🔇" : "🔊";
};

const showMediaControls = () => {
  if (!mediaPlayer) return;

  window.clearTimeout(mediaControlsTimer);
  mediaPlayer.classList.add("is-controls-visible");
  mediaPlayer.classList.remove("is-controls-hidden");

  if (mediaVideo?.paused) return;
  mediaControlsTimer = window.setTimeout(() => {
    if (mediaPlayer.matches(":focus-within")) return;
    mediaPlayer.classList.remove("is-controls-visible");
    mediaPlayer.classList.add("is-controls-hidden");
  }, 2200);
};

const hideMediaControls = () => {
  window.clearTimeout(mediaControlsTimer);
  if (!mediaPlayer || mediaVideo?.paused || mediaPlayer.matches(":focus-within")) return;
  mediaPlayer.classList.remove("is-controls-visible");
  mediaPlayer.classList.add("is-controls-hidden");
};

const toggleMediaPlayback = async () => {
  if (!mediaVideo) return;

  if (mediaVideo.paused) {
    try {
      await mediaVideo.play();
    } catch {
      mediaPlayer?.classList.add("is-paused");
    }
  } else {
    mediaVideo.pause();
  }

  showMediaControls();
};

mediaVideo?.addEventListener("loadedmetadata", updateMediaTime);
mediaVideo?.addEventListener("durationchange", updateMediaTime);
mediaVideo?.addEventListener("play", () => {
  updateMediaPlayState();
  showMediaControls();
});
mediaVideo?.addEventListener("pause", () => {
  updateMediaPlayState();
  showMediaControls();
});
mediaVideo?.addEventListener("volumechange", updateMediaMuteState);
mediaVideo?.addEventListener("click", toggleMediaPlayback);
mediaPlayToggle?.addEventListener("click", toggleMediaPlayback);
mediaPausedIndicator?.addEventListener("click", toggleMediaPlayback);

mediaSeek?.addEventListener("pointerdown", () => {
  if (!mediaVideo) return;
  mediaWasPlayingBeforeSeek = !mediaVideo.paused;
  mediaVideo.pause();
});

mediaSeek?.addEventListener("input", () => {
  if (!mediaVideo || !mediaSeek || !Number.isFinite(mediaVideo.duration)) return;
  mediaVideo.currentTime = (Number(mediaSeek.value) / 1000) * mediaVideo.duration;
  updateMediaTime();
});

mediaSeek?.addEventListener("change", async () => {
  if (mediaWasPlayingBeforeSeek) {
    try {
      await mediaVideo?.play();
    } catch {
      updateMediaPlayState();
    }
  }
  mediaWasPlayingBeforeSeek = false;
  showMediaControls();
});

mediaMuteToggle?.addEventListener("click", () => {
  if (!mediaVideo) return;
  mediaVideo.muted = !mediaVideo.muted;
  if (!mediaVideo.muted && mediaVideo.volume === 0) mediaVideo.volume = 1;
  showMediaControls();
});

mediaFullscreenToggle?.addEventListener("click", async () => {
  if (!mediaPlayer) return;

  if (document.fullscreenElement) {
    await document.exitFullscreen?.();
  } else {
    await mediaPlayer.requestFullscreen?.();
  }
  showMediaControls();
});

document.addEventListener("fullscreenchange", () => {
  mediaFullscreenToggle?.setAttribute(
    "aria-label",
    document.fullscreenElement ? "退出全屏" : "进入全屏",
  );
});

mediaPlayer?.addEventListener("pointermove", showMediaControls);
mediaPlayer?.addEventListener("pointerdown", showMediaControls);
mediaPlayer?.addEventListener("pointerleave", hideMediaControls);
mediaPlayer?.addEventListener("focusin", showMediaControls);
mediaPlayer?.addEventListener("focusout", showMediaControls);

mediaPlayer?.addEventListener("keydown", (event) => {
  if (!mediaVideo) return;

  if (event.key === " " || event.key === "k") {
    event.preventDefault();
    toggleMediaPlayback();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    mediaVideo.currentTime = Math.max(0, mediaVideo.currentTime - 5);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    mediaVideo.currentTime = Math.min(mediaVideo.duration || 0, mediaVideo.currentTime + 5);
  } else if (event.key.toLowerCase() === "m") {
    event.preventDefault();
    mediaVideo.muted = !mediaVideo.muted;
  } else if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    mediaFullscreenToggle?.click();
  } else {
    return;
  }

  updateMediaTime();
  showMediaControls();
});

mediaVideo
  ?.play()
  .catch(() => mediaPlayer?.classList.add("is-paused"))
  .finally(() => {
    updateMediaPlayState();
    updateMediaMuteState();
    updateMediaTime();
    showMediaControls();
  });
