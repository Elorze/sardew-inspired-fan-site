const homeHero = document.querySelector("[data-home-depth]");
const homeMotionView = document.querySelector(".home-motion-view");
const homeMotionTrack = document.querySelector(".home-motion-track");
const homeSlides = [...document.querySelectorAll(".home-motion-slide")];
const homePreviousButton = document.querySelector(".home-motion-arrow-prev");
const homeNextButton = document.querySelector(".home-motion-arrow-next");
const reduceHomeMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (homeHero) {
  document.documentElement.classList.add("has-home-depth");

  let homeScrollFrame = 0;
  const updateHomeDepth = () => {
    homeScrollFrame = 0;
    const scene = homeHero.querySelector(".home-depth-scene");
    const sceneTop = scene ? parseFloat(getComputedStyle(scene).top) || 0 : 0;
    const sceneHeight = Math.max(window.innerHeight - sceneTop, 1);
    const scrollRange = Math.max(homeHero.offsetHeight - sceneHeight, 1);
    const rawProgress = (window.scrollY - homeHero.offsetTop) / scrollRange;
    const progress = Math.min(Math.max(rawProgress, 0), 1);
    const clampProgress = (value) => Math.min(Math.max(value, 0), 1);
    const easeOut = (value) => 1 - (1 - value) ** 3;
    const spiritProgress = reduceHomeMotion.matches
      ? 1
      : clampProgress((progress - 0.16) / 0.34);
    const companionsProgress = reduceHomeMotion.matches
      ? 1
      : clampProgress((progress - 0.08) / 0.34);
    const logoProgress = reduceHomeMotion.matches
      ? 1
      : clampProgress((progress - 0.5) / 0.32);
    const companionsEase = easeOut(companionsProgress);
    const spiritEase = easeOut(spiritProgress);
    const logoEase = easeOut(logoProgress);

    homeHero.style.setProperty("--home-scene-opacity", "1");
    homeHero.style.setProperty("--home-bg-y", `${progress * 5}px`);
    homeHero.style.setProperty("--home-bg-scale", String(1.005 + progress * 0.01));
    homeHero.style.setProperty(
      "--home-companions-opacity",
      String(companionsEase * 0.92),
    );
    homeHero.style.setProperty(
      "--home-companions-y",
      `${(1 - companionsEase) * 64}px`,
    );
    homeHero.style.setProperty(
      "--home-companions-scale",
      String(0.96 + companionsEase * 0.035),
    );
    homeHero.style.setProperty("--home-spirit-opacity", String(spiritEase));
    homeHero.style.setProperty(
      "--home-spirit-y",
      `${(1 - spiritEase) * 70}px`,
    );
    homeHero.style.setProperty(
      "--home-spirit-scale",
      String(0.9 + spiritEase * 0.12),
    );
    homeHero.style.setProperty("--home-logo-opacity", String(logoEase));
    homeHero.style.setProperty("--home-logo-y", `${(1 - logoEase) * 58}px`);
    homeHero.style.setProperty(
      "--home-logo-scale",
      String(0.88 + logoEase * 0.16),
    );
  };

  const requestHomeDepthUpdate = () => {
    if (homeScrollFrame || reduceHomeMotion.matches) return;
    homeScrollFrame = window.requestAnimationFrame(updateHomeDepth);
  };

  updateHomeDepth();
  window.addEventListener("scroll", requestHomeDepthUpdate, { passive: true });
  window.addEventListener("resize", requestHomeDepthUpdate);
}

if (homeMotionView && homeMotionTrack && homeSlides.length) {
  let activeHomeSlide = 0;
  let homeSwipeStartX = null;

  const syncHomeSlideState = () => {
    homeSlides.forEach((slide, slideIndex) => {
      slide.setAttribute("aria-hidden", String(slideIndex !== activeHomeSlide));
    });
    homeMotionTrack.dataset.activeSlide = String(activeHomeSlide);
    homeMotionView.setAttribute(
      "aria-label",
      `可手动切换的游戏画面，第 ${activeHomeSlide + 1} 幅，共 ${homeSlides.length} 幅`,
    );
  };

  const setHomeSlide = (index, animate = true) => {
    activeHomeSlide = (index + homeSlides.length) % homeSlides.length;
    homeMotionTrack.style.setProperty("--home-slide-index", String(activeHomeSlide));
    homeMotionTrack.style.transitionDuration =
      !animate || reduceHomeMotion.matches ? "0ms" : "";
    syncHomeSlideState();

    if (!animate && !reduceHomeMotion.matches) {
      window.requestAnimationFrame(() => {
        homeMotionTrack.style.transitionDuration = "";
      });
    }
  };

  homePreviousButton?.addEventListener("click", (event) => {
    event.preventDefault();
    setHomeSlide(activeHomeSlide - 1);
  });

  homeNextButton?.addEventListener("click", (event) => {
    event.preventDefault();
    setHomeSlide(activeHomeSlide + 1);
  });

  homeMotionView.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setHomeSlide(activeHomeSlide - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setHomeSlide(activeHomeSlide + 1);
    }
  });

  homeMotionView.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target.closest(".home-motion-arrow")) return;
      homeSwipeStartX = event.clientX;
    },
    { passive: true },
  );

  homeMotionView.addEventListener("pointerup", (event) => {
    if (homeSwipeStartX === null) return;
    const swipeDistance = event.clientX - homeSwipeStartX;
    homeSwipeStartX = null;

    if (Math.abs(swipeDistance) < 44) return;
    setHomeSlide(activeHomeSlide + (swipeDistance < 0 ? 1 : -1));
  });

  homeMotionView.addEventListener("pointercancel", () => {
    homeSwipeStartX = null;
  });

  setHomeSlide(0, false);
}
