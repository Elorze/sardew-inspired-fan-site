const wikiSearch = document.querySelector("#wikiSearch");
const wikiSearchControl = document.querySelector("#wikiSearchControl");
const wikiSearchToggle = document.querySelector("#wikiSearchToggle");
const wikiFilterButtons = [...document.querySelectorAll("[data-wiki-filter]")];
const wikiIndexEntries = [...document.querySelectorAll("[data-wiki-entry]")];
const wikiEntryGroups = [...document.querySelectorAll("[data-wiki-group]")];
const wikiSearchStatus = document.querySelector("#wikiSearchStatus");
const wikiScrollArea = document.querySelector(".wiki-garden-index");
let activeWikiFilter = "all";

const resetWikiScroll = () => {
  wikiScrollArea?.scrollTo({ top: 0, behavior: "smooth" });
};

const updateWikiEntries = ({ resetScroll = false } = {}) => {
  const query = wikiSearch?.value.trim().toLocaleLowerCase("zh-CN") || "";
  let visibleCount = 0;

  wikiIndexEntries.forEach((entry) => {
    const categoryMatches =
      activeWikiFilter === "all" || entry.dataset.category === activeWikiFilter;
    const searchText = entry.dataset.search?.toLocaleLowerCase("zh-CN") || "";
    const queryMatches = !query || searchText.includes(query);
    const isVisible = categoryMatches && queryMatches;
    entry.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  wikiEntryGroups.forEach((group) => {
    const entries = [...group.querySelectorAll("[data-wiki-entry]")];
    group.hidden = !entries.some((entry) => !entry.hidden);
  });

  if (wikiSearchStatus) {
    wikiSearchStatus.textContent = visibleCount
      ? `${visibleCount} 个词条`
      : "没有找到词条";
  }
  if (resetScroll) resetWikiScroll();
};

wikiSearch?.addEventListener("input", () => {
  updateWikiEntries({ resetScroll: true });
});

wikiSearch?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (wikiSearch.value) {
    wikiSearch.value = "";
    updateWikiEntries({ resetScroll: true });
    return;
  }
  wikiSearchControl?.classList.remove("is-open");
  wikiSearchToggle?.setAttribute("aria-expanded", "false");
  wikiSearchToggle?.focus();
});

wikiSearchToggle?.addEventListener("click", () => {
  const open = !wikiSearchControl?.classList.contains("is-open");
  wikiSearchControl?.classList.toggle("is-open", open);
  wikiSearchToggle.setAttribute("aria-expanded", String(open));
  if (open) window.requestAnimationFrame(() => wikiSearch?.focus());
});

wikiSearch?.addEventListener("blur", () => {
  if (wikiSearch.value) return;
  window.setTimeout(() => {
    if (wikiSearchControl?.matches(":focus-within")) return;
    wikiSearchControl?.classList.remove("is-open");
    wikiSearchToggle?.setAttribute("aria-expanded", "false");
  }, 100);
});

wikiFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeWikiFilter = button.dataset.wikiFilter || "all";
    wikiFilterButtons.forEach((filterButton) => {
      filterButton.setAttribute(
        "aria-pressed",
        String(filterButton.dataset.wikiFilter === activeWikiFilter),
      );
    });
    updateWikiEntries({ resetScroll: true });
  });
});

wikiIndexEntries.forEach((entry) => {
  let startX = 0;
  let startY = 0;

  entry.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    startX = event.clientX;
    startY = event.clientY;
  });

  entry.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse") return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (deltaX < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    window.location.href = entry.href;
  });
});

updateWikiEntries();
