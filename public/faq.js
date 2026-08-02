const faqDetails = [...document.querySelectorAll(".faq-question-list details")];
const faqSubmitAfter = document.querySelector("#faqSubmitAfter");
const faqOpenedQuestions = new Set();

const revealFaqSubmit = () => {
  if (!faqSubmitAfter || !faqSubmitAfter.hidden) return;
  faqSubmitAfter.hidden = false;
  window.requestAnimationFrame(() => {
    faqSubmitAfter.classList.add("is-visible");
  });
};

faqDetails.forEach((details, index) => {
  const summary = details.querySelector("summary");
  if (!summary) return;

  summary.setAttribute("aria-expanded", String(details.open));

  details.addEventListener("toggle", () => {
    summary.setAttribute("aria-expanded", String(details.open));
    if (!details.open) return;

    faqOpenedQuestions.add(details);
    faqDetails.forEach((otherDetails) => {
      if (otherDetails !== details) otherDetails.open = false;
    });

    if (faqOpenedQuestions.size === faqDetails.length) {
      revealFaqSubmit();
    }
  });
});
