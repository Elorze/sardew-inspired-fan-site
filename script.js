const navButton = document.querySelector(".menu-button");
const nav = document.querySelector(".site-nav");

navButton?.addEventListener("click", () => {
  const isOpen = nav?.classList.toggle("is-open") ?? false;
  navButton.setAttribute("aria-expanded", String(isOpen));
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("is-open");
    navButton?.setAttribute("aria-expanded", "false");
  }
});

const scenes = [...document.querySelectorAll(".scene")];
const dotsRoot = document.querySelector(".scene-dots");
let activeScene = 0;

const setScene = (index) => {
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
