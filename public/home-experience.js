const homeHero = document.querySelector("[data-home-depth]");
const homeMotionView = document.querySelector(".home-motion-view");
const homeMotionTrack = document.querySelector(".home-motion-track");
const homeSlides = [...document.querySelectorAll(".home-motion-slide")];
const homePreviousButton = document.querySelector(".home-motion-arrow-prev");
const homeNextButton = document.querySelector(".home-motion-arrow-next");
const homeDualShowcase = document.querySelector(".home-dual-showcase");
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
    const softStep = (value) => {
      const t = clampProgress(value);
      return t * t * t * (t * (t * 6 - 15) + 10);
    };
    const companionsProgress = reduceHomeMotion.matches
      ? 1
      : clampProgress((progress - 0.06) / 0.4);
    const spiritProgress = reduceHomeMotion.matches
      ? 1
      : clampProgress((progress - 0.1) / 0.32);
    const logoProgress = reduceHomeMotion.matches
      ? 1
      : softStep((progress - 0.04) / 0.54);
    const logoGrowth = reduceHomeMotion.matches
      ? 1
      : softStep(progress / 0.82);
    const fadeProgress = reduceHomeMotion.matches
      ? 0
      : softStep((progress - 0.66) / 0.34);
    const companionsEase = easeOut(companionsProgress);
    const spiritEase = easeOut(spiritProgress);
    const logoEase = easeOut(logoProgress);
    const fadeEase = fadeProgress;

    homeHero.style.setProperty("--home-landing-wash", String(fadeEase));
    homeHero.style.setProperty(
      "--home-transition-y",
      `${(1 - fadeEase) * 180}px`,
    );
    homeHero.style.setProperty("--home-scene-opacity", "1");
    homeHero.style.setProperty(
      "--home-foreground-opacity",
      String(1 - fadeEase * 0.97),
    );
    homeHero.style.setProperty("--home-bg-y", `${progress * 4}px`);
    homeHero.style.setProperty("--home-bg-scale", String(1.005 + progress * 0.018));
    homeHero.style.setProperty(
      "--home-companions-opacity",
      String(companionsEase),
    );
    homeHero.style.setProperty(
      "--home-ground-y",
      `${(1 - companionsEase) * 20}px`,
    );
    homeHero.style.setProperty(
      "--home-flying-y",
      `${(1 - companionsEase) * -13}px`,
    );
    homeHero.style.setProperty(
      "--home-spirit-opacity",
      String(spiritEase),
    );
    homeHero.style.setProperty("--home-spirit-y", `${(1 - spiritEase) * 24}px`);
    homeHero.style.setProperty(
      "--home-logo-opacity",
      String(logoEase * (1 - fadeEase)),
    );
    homeHero.style.setProperty(
      "--home-logo-y",
      `${12 + softStep(progress / 0.84) * 106}px`,
    );
    homeHero.style.setProperty(
      "--home-logo-scale",
      String(0.9 + logoGrowth * 0.31),
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
  let homeAutoTimer = 0;
  let homeMotionInView = false;
  let homePointerInside = false;
  let homeFocusInside = false;

  const clearHomeAutoplay = () => {
    window.clearTimeout(homeAutoTimer);
    homeAutoTimer = 0;
  };

  const syncHomeSlideState = () => {
    homeSlides.forEach((slide, slideIndex) => {
      slide.setAttribute("aria-hidden", String(slideIndex !== activeHomeSlide));
    });
    homeMotionTrack.dataset.activeSlide = String(activeHomeSlide);
    homeMotionView.setAttribute(
      "aria-label",
      `自动播放且可手动切换的游戏画面，第 ${activeHomeSlide + 1} 幅，共 ${homeSlides.length} 幅`,
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

  const scheduleHomeAutoplay = () => {
    clearHomeAutoplay();
    if (
      reduceHomeMotion.matches ||
      document.hidden ||
      !homeMotionInView ||
      homePointerInside ||
      homeFocusInside ||
      homeSlides.length < 2
    ) {
      return;
    }

    homeAutoTimer = window.setTimeout(() => {
      setHomeSlide(activeHomeSlide + 1);
      scheduleHomeAutoplay();
    }, 4800);
  };

  homePreviousButton?.addEventListener("click", (event) => {
    event.preventDefault();
    setHomeSlide(activeHomeSlide - 1);
    scheduleHomeAutoplay();
  });

  homeNextButton?.addEventListener("click", (event) => {
    event.preventDefault();
    setHomeSlide(activeHomeSlide + 1);
    scheduleHomeAutoplay();
  });

  homeMotionView.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setHomeSlide(activeHomeSlide - 1);
      scheduleHomeAutoplay();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setHomeSlide(activeHomeSlide + 1);
      scheduleHomeAutoplay();
    }
  });

  homeMotionView.addEventListener("pointerenter", () => {
    homePointerInside = true;
    clearHomeAutoplay();
  });

  homeMotionView.addEventListener("pointerleave", () => {
    homePointerInside = false;
    scheduleHomeAutoplay();
  });

  homeMotionView.addEventListener("focusin", () => {
    homeFocusInside = true;
    clearHomeAutoplay();
  });

  homeMotionView.addEventListener("focusout", (event) => {
    homeFocusInside = homeMotionView.contains(event.relatedTarget);
    scheduleHomeAutoplay();
  });

  homeMotionView.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target.closest(".home-motion-arrow")) return;
      clearHomeAutoplay();
      homeSwipeStartX = event.clientX;
    },
    { passive: true },
  );

  homeMotionView.addEventListener("pointerup", (event) => {
    if (homeSwipeStartX === null) return;
    const swipeDistance = event.clientX - homeSwipeStartX;
    homeSwipeStartX = null;

    if (Math.abs(swipeDistance) < 44) {
      scheduleHomeAutoplay();
      return;
    }
    setHomeSlide(activeHomeSlide + (swipeDistance < 0 ? 1 : -1));
    scheduleHomeAutoplay();
  });

  homeMotionView.addEventListener("pointercancel", () => {
    homeSwipeStartX = null;
    scheduleHomeAutoplay();
  });

  setHomeSlide(0, false);

  if (homeDualShowcase) {
    homeDualShowcase.classList.add("home-showcase-reveal");

    if ("IntersectionObserver" in window && !reduceHomeMotion.matches) {
      const homeShowcaseObserver = new IntersectionObserver(
        ([entry]) => {
          homeMotionInView = entry.isIntersecting;
          if (entry.isIntersecting) {
            homeDualShowcase.classList.add("is-visible");
          }
          scheduleHomeAutoplay();
        },
        { threshold: 0.18 },
      );
      homeShowcaseObserver.observe(homeDualShowcase);
    } else {
      homeMotionInView = true;
      homeDualShowcase.classList.add("is-visible");
      scheduleHomeAutoplay();
    }
  }

  document.addEventListener("visibilitychange", scheduleHomeAutoplay);
  reduceHomeMotion.addEventListener?.("change", () => {
    if (reduceHomeMotion.matches) {
      clearHomeAutoplay();
      homeDualShowcase?.classList.add("is-visible");
      return;
    }
    scheduleHomeAutoplay();
  });
}
