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
  homeStory.classList.add("is-timed-reveal");

  const revealSteps = [
    { className: "is-scene-visible", delay: 0 },
    { className: "is-ready", delay: 420 },
    { className: "is-spirit-visible", delay: 1100 },
    { className: "is-logo-visible", delay: 1680 },
    { className: "is-copy-visible", delay: 2280 },
  ];

  const revealTimers = [];

  const clearHomeRevealTimers = () => {
    while (revealTimers.length) {
      window.clearTimeout(revealTimers.pop());
    }
  };

  const applyHomeRevealStep = (className) => {
    homeHero.classList.add(className);
  };

  const revealHomeAllAtOnce = () => {
    clearHomeRevealTimers();
    revealSteps.forEach(({ className }) => applyHomeRevealStep(className));
  };

  const playHomeTimedReveal = () => {
    clearHomeRevealTimers();
    revealSteps.forEach(({ className }) => {
      homeHero.classList.remove(className);
    });

    if (reduceHomeMotion.matches) {
      revealHomeAllAtOnce();
      return;
    }

    revealSteps.forEach(({ className, delay }) => {
      revealTimers.push(
        window.setTimeout(() => applyHomeRevealStep(className), delay),
      );
    });
  };

  playHomeTimedReveal();

  if (typeof reduceHomeMotion.addEventListener === "function") {
    reduceHomeMotion.addEventListener("change", playHomeTimedReveal);
  } else if (typeof reduceHomeMotion.addListener === "function") {
    reduceHomeMotion.addListener(playHomeTimedReveal);
  }
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
