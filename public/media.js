const mediaSeriesPlayer = document.querySelector("#mediaSeriesPlayer");
const mediaPrimaryVideo = document.querySelector("#mediaPrimaryVideo");
const mediaSecondaryVideo = document.querySelector("#mediaSecondaryVideo");
const mediaLightPull = document.querySelector(".media-light-pull");

const mediaVideos = [mediaPrimaryVideo, mediaSecondaryVideo].filter(
  (video) => video instanceof HTMLVideoElement,
);

const playMediaVideo = (video) => {
  if (!(video instanceof HTMLVideoElement)) return;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.play().catch(() => {});
};

const getMediaOrientation = (video) => {
  if (!(video instanceof HTMLVideoElement) || !video.videoWidth) return null;
  return video.videoWidth > video.videoHeight ? "landscape" : "portrait";
};

const applyMediaGeometry = (video) => {
  const screen = video.closest(".media-screen");
  const orientation = getMediaOrientation(video);
  if (!screen || !orientation) return;

  screen.dataset.orientation = orientation;
  screen.style.setProperty(
    "--media-video-aspect",
    `${video.videoWidth} / ${video.videoHeight}`,
  );
  screen.style.setProperty("--media-natural-width", `${video.videoWidth}px`);
};

const syncMediaPlayback = () => {
  mediaVideos.forEach((video) => {
    const screen = video.closest(".media-screen");
    const visible = screen && !screen.hidden;
    if (document.hidden || !visible) {
      video.pause();
      return;
    }
    playMediaVideo(video);
  });
};

const syncMediaOrientation = () => {
  if (!mediaSeriesPlayer) return;

  mediaVideos.forEach(applyMediaGeometry);

  const primaryOrientation = getMediaOrientation(mediaPrimaryVideo);
  const secondaryOrientation = getMediaOrientation(mediaSecondaryVideo);
  const landscape = primaryOrientation === "landscape";
  const primaryScreen = mediaPrimaryVideo?.closest(".media-screen");
  const secondaryScreen = mediaSecondaryVideo?.closest(".media-screen");

  if (primaryScreen) primaryScreen.hidden = false;
  if (secondaryScreen) {
    secondaryScreen.hidden =
      landscape || secondaryOrientation === "landscape";
  }

  mediaSeriesPlayer.classList.toggle("is-landscape", landscape);
  mediaSeriesPlayer.classList.toggle("is-portrait", !landscape);
  mediaSeriesPlayer.classList.toggle(
    "has-single",
    !landscape && Boolean(secondaryScreen?.hidden),
  );

  syncMediaPlayback();
};

mediaVideos.forEach((video) => {
  video.addEventListener("canplay", () => playMediaVideo(video));
  video.addEventListener("loadedmetadata", () => {
    syncMediaOrientation();
    playMediaVideo(video);
  });
});

window.addEventListener("pageshow", syncMediaPlayback);
document.addEventListener("visibilitychange", syncMediaPlayback);

mediaLightPull?.addEventListener("click", () => {
  const dark = !document.body.classList.contains("is-cinema-dark");
  document.body.classList.toggle("is-cinema-dark", dark);
  mediaLightPull.setAttribute("aria-pressed", String(dark));
  mediaLightPull.setAttribute("aria-label", dark ? "开灯" : "关灯观影");
});

syncMediaOrientation();
