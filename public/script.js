const navButton = document.querySelector(".menu-button");
const nav = document.querySelector(".site-nav");

navButton?.addEventListener("click", () => {
  const isOpen = nav?.classList.toggle("is-open") ?? false;
  navButton.setAttribute("aria-expanded", String(isOpen));
});

nav?.addEventListener("click", (event) => {
  const selectedLink = event.target instanceof Element ? event.target.closest("a") : null;
  if (selectedLink instanceof HTMLAnchorElement && nav.contains(selectedLink)) {
    nav.classList.remove("is-open");
    navButton?.setAttribute("aria-expanded", "false");
  }
});

const scenes = [...document.querySelectorAll(".scene")];
const dotsRoot = document.querySelector(".scene-dots");
let activeScene = 0;

const setScene = (index) => {
  if (!scenes.length) return;

  activeScene = (index + scenes.length) % scenes.length;
  scenes.forEach((scene, sceneIndex) => {
    scene.classList.toggle("is-active", sceneIndex === activeScene);
  });
  dotsRoot?.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.setAttribute("aria-current", String(dotIndex === activeScene));
  });
};

scenes.forEach((scene, index) => {
  const label = scene.querySelector("strong")?.textContent || `场景 ${index + 1}`;
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", label);
  dot.addEventListener("click", () => setScene(index));
  dotsRoot?.append(dot);
});

document.querySelector(".carousel-control.prev")?.addEventListener("click", () => setScene(activeScene - 1));
document.querySelector(".carousel-control.next")?.addEventListener("click", () => setScene(activeScene + 1));

setScene(0);

const letterReceiveButton = document.querySelector(".letter-receive-button");
const letterReceiveLabel = letterReceiveButton?.querySelector(
  ".letter-receive-label",
);
const letterReceiveStatus = document.querySelector(".letter-receive-status");
const incomingLetters = [...document.querySelectorAll(".journal-feed .journal-entry")];

const playIncomingLetterSound = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const startAt = audioContext.currentTime;
  const notes = [
    { frequency: 659.25, delay: 0 },
    { frequency: 783.99, delay: 0.12 },
    { frequency: 987.77, delay: 0.24 },
  ];

  notes.forEach(({ frequency, delay }) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noteStart = startAt + delay;
    const noteEnd = noteStart + 0.24;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  });

  window.setTimeout(() => audioContext.close(), 800);
};

letterReceiveButton?.addEventListener("click", () => {
  if (letterReceiveButton.classList.contains("is-receiving")) return;

  letterReceiveButton.classList.add("is-receiving");
  letterReceiveButton.disabled = true;
  playIncomingLetterSound();

  incomingLetters.forEach((letter, index) => {
    window.setTimeout(() => {
      letter.classList.add("is-arriving");
      window.setTimeout(() => letter.classList.remove("is-arriving"), 620);
    }, index * 150);
  });

  window.setTimeout(() => {
    letterReceiveButton.classList.remove("is-receiving");
    letterReceiveButton.classList.add("is-complete");
    letterReceiveButton.setAttribute("aria-pressed", "true");
    if (letterReceiveLabel) letterReceiveLabel.textContent = "来信已收取";
    if (letterReceiveStatus) {
      letterReceiveStatus.textContent = `已收到 ${incomingLetters.length} 封来信`;
    }
  }, 780);
});

const scrollRevealItems = [...document.querySelectorAll("[data-scroll-reveal]")];

if (scrollRevealItems.length && "IntersectionObserver" in window) {
  document.documentElement.classList.add("has-scroll-reveal");

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.16,
    },
  );

  scrollRevealItems.forEach((item) => revealObserver.observe(item));
}
