const homeStory = document.querySelector("[data-home-depth]");
const homeHero = homeStory?.querySelector(".home-hero");
const homeMotionView = document.querySelector(".home-motion-view");
const homeMotionTrack = document.querySelector(".home-motion-track");
const homeSlides = [...document.querySelectorAll(".home-motion-slide")];
const homePreviousButton = document.querySelector(".home-motion-arrow-prev");
const homeNextButton = document.querySelector(".home-motion-arrow-next");
const homeDualShowcase = document.querySelector(".home-dual-showcase");
const reduceHomeMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (homeStory && homeHero) {
  document.documentElement.classList.add("has-home-depth");

  let homeRevealFrame = 0;
  const updateHomeReveal = () => {
    homeRevealFrame = 0;
    const storyRect = homeStory.getBoundingClientRect();
    const scrollableDistance = Math.max(homeStory.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(
      Math.max(-storyRect.top / scrollableDistance, 0),
      1,
    );
    homeHero.classList.toggle("is-ready", progress > 0.12);
    homeHero.classList.toggle("is-scene-visible", true);
    homeHero.classList.toggle("is-spirit-visible", progress > 0.42);
    homeHero.classList.toggle("is-logo-visible", progress > 0.58);
    homeHero.classList.toggle("is-copy-visible", progress > 0.76);
  };

  const requestHomeRevealUpdate = () => {
    if (homeRevealFrame) return;
    homeRevealFrame = window.requestAnimationFrame(updateHomeReveal);
  };

  updateHomeReveal();
  window.addEventListener("scroll", requestHomeRevealUpdate, { passive: true });
  window.addEventListener("resize", requestHomeRevealUpdate);
}

if (homeMotionView && homeMotionTrack && homeSlides.length) {
  let activeHomeSlide = 0;

  const setHomeSlide = (index) => {
    activeHomeSlide = (index + homeSlides.length) % homeSlides.length;
    homeMotionTrack.style.setProperty("--home-slide-index", String(activeHomeSlide));
    homeSlides.forEach((slide, slideIndex) => {
      slide.setAttribute("aria-hidden", String(slideIndex !== activeHomeSlide));
    });
    homeMotionView.setAttribute(
      "aria-label",
      `自动播放且可手动切换的游戏画面，第 ${activeHomeSlide + 1} 幅，共 ${homeSlides.length} 幅`,
    );
  };

  const stepHomeSlide = (delta) => {
    setHomeSlide(activeHomeSlide + delta);
  };

  homePreviousButton?.addEventListener("click", (event) => {
    event.preventDefault();
    stepHomeSlide(-1);
  });

  homeNextButton?.addEventListener("click", (event) => {
    event.preventDefault();
    stepHomeSlide(1);
  });

  homeMotionView.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepHomeSlide(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepHomeSlide(1);
    }
  });

  setHomeSlide(0);

  window.setInterval(() => {
    stepHomeSlide(1);
  }, 4800);
}
