const faqReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const faqDetails = [...document.querySelectorAll(".faq-question-list details")];

faqDetails.forEach((details) => {
  const summary = details.querySelector("summary");
  const answer = details.querySelector(".faq-answer-copy");
  if (!summary || !answer) return;

  const syncExpandedState = () => {
    summary.setAttribute("aria-expanded", String(details.open));
  };

  syncExpandedState();
  details.addEventListener("toggle", syncExpandedState);

  summary.addEventListener("click", (event) => {
    event.preventDefault();
    if (details.classList.contains("is-animating")) return;

    if (faqReducedMotion.matches) {
      details.open = !details.open;
      return;
    }

    const isClosing = details.open;
    const startHeight = details.offsetHeight;
    if (!isClosing) {
      faqDetails.forEach((otherDetails) => {
        if (otherDetails === details || !otherDetails.open) return;
        otherDetails.getAnimations().forEach((animation) => animation.cancel());
        otherDetails
          .querySelector(".faq-answer-copy")
          ?.getAnimations()
          .forEach((animation) => animation.cancel());
        otherDetails.classList.remove("is-animating");
        otherDetails.style.height = "";
        otherDetails.style.overflow = "";
        otherDetails.open = false;
        otherDetails
          .querySelector("summary")
          ?.setAttribute("aria-expanded", "false");
      });
      details.open = true;
    }
    const endHeight = isClosing ? summary.offsetHeight : details.offsetHeight;

    details.classList.add("is-animating");
    details.style.overflow = "hidden";

    const panelAnimation = details.animate(
      [
        { height: `${startHeight}px` },
        { height: `${endHeight}px` },
      ],
      {
        duration: isClosing ? 210 : 360,
        easing: "cubic-bezier(0.2, 0.72, 0.18, 1)",
      },
    );

    answer.animate(
      isClosing
        ? [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(-7px)" },
          ]
        : [
            { opacity: 0, transform: "translateY(-7px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
      {
        duration: isClosing ? 150 : 320,
        easing: "cubic-bezier(0.2, 0.72, 0.18, 1)",
        fill: "both",
      },
    );

    panelAnimation.addEventListener(
      "finish",
      () => {
        if (isClosing) details.open = false;
        details.classList.remove("is-animating");
        details.style.height = "";
        details.style.overflow = "";
        answer.getAnimations().forEach((animation) => animation.cancel());
        syncExpandedState();
      },
      { once: true },
    );
  });
});
