const productsRail = document.querySelector(".products-direct-grid");
const productSlides = [...document.querySelectorAll(".product-portal")];
const productDetailPanel = document.querySelector(".products-detail-panel");
const productDetailKicker = document.querySelector(".products-detail-kicker");
const productDetailTitle = document.querySelector(".products-detail-panel h2");
const productDetailSummary = document.querySelector(".products-detail-summary");
const productDetailFacts = document.querySelector(".products-detail-facts");
const productDetailLink = document.querySelector(".products-detail-link");
const productDetailClose = document.querySelector(".products-detail-close");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const productDetails = {
  world: {
    kicker: "Garden / Plant / Daily Record",
    title: "种种世界",
    summary:
      "以植物、观察和日常养成为核心的主世界。适合放置植物资料、成长记录、互动地图、图鉴收集和轻量任务，也可以作为种种账号体系里的长期家园入口。",
    facts: [
      ["内容", "植物养成、图鉴、地图、日常记录"],
      ["状态", "线上展示"],
      ["适合", "玩家入口、资料沉淀、长期更新"],
    ],
  },
  tavern: {
    kicker: "Tavern / Social / Event",
    title: "种种酒馆",
    summary:
      "偏社区与活动的聚合空间，用来承载来访、交流、活动公告和轻松内容。它不需要解释太多规则，访客进入后能直接感受到是一个可以停留、聊天、看更新的地方。",
    facts: [
      ["内容", "来访入口、活动、交流、公告"],
      ["状态", "线上展示"],
      ["适合", "社群运营、活动页、轻内容发布"],
    ],
  },
  dandelion: {
    kicker: "Dandelion / Island / Prototype",
    title: "蒲公英大世界",
    summary:
      "更偏实验与场景探索的大世界项目，承载岛屿、地形、角色行动和地图扩展。它适合展示测试画面、玩法方向和仍在生长中的系统雏形。",
    facts: [
      ["内容", "岛屿地形、探索、测试版本"],
      ["状态", "开发演示"],
      ["适合", "实机展示、玩法验证、版本迭代"],
    ],
  },
};

let activeProductSlide = 0;
let autoplayTimer = 0;
let scrollIdleTimer = 0;
let scrollFrame = 0;
let draggedPointerId = null;
let dragStartX = 0;
let dragStartScrollLeft = 0;
let dragMoved = false;
let suppressLinkUntil = 0;
let selectedProductSlide = -1;
let detailHideTimer = 0;

const updateProductState = () => {
  productSlides.forEach((slide, index) => {
    const isActive = index === activeProductSlide;
    slide.classList.toggle("is-active", isActive);
    slide.classList.toggle("is-selected", index === selectedProductSlide);
    slide.setAttribute("aria-current", String(isActive));
  });

};

const renderProductDetail = (slide, index) => {
  const id = slide.dataset.productId;
  const detail = productDetails[id];
  if (
    !detail ||
    !productDetailPanel ||
    !productDetailKicker ||
    !productDetailTitle ||
    !productDetailSummary ||
    !productDetailFacts ||
    !productDetailLink
  ) {
    return;
  }

  selectedProductSlide = index;
  activeProductSlide = index;
  updateProductState();

  productDetailKicker.textContent = detail.kicker;
  productDetailTitle.textContent = detail.title;
  productDetailSummary.textContent = detail.summary;
  productDetailFacts.replaceChildren(
    ...detail.facts.map(([term, description]) => {
      const item = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = description;
      item.append(dt, dd);
      return item;
    }),
  );
  productDetailLink.href = slide.href;
  productDetailLink.setAttribute("aria-label", `进入${detail.title}`);
  window.clearTimeout(detailHideTimer);
  productDetailPanel.hidden = false;
  window.requestAnimationFrame(() => {
    productDetailPanel.classList.add("is-visible");
  });
};

const hideProductDetail = () => {
  selectedProductSlide = -1;
  if (!productDetailPanel) return;
  productDetailPanel.classList.remove("is-visible");
  window.clearTimeout(detailHideTimer);
  detailHideTimer = window.setTimeout(() => {
    productDetailPanel.hidden = true;
  }, 220);
  updateProductState();
};

const findNearestProductSlide = () => {
  if (!productsRail || !productSlides.length) return 0;

  const railCenter = productsRail.scrollLeft + productsRail.clientWidth / 2;
  return productSlides.reduce((closestIndex, slide, index) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const closestSlide = productSlides[closestIndex];
    const closestCenter = closestSlide.offsetLeft + closestSlide.offsetWidth / 2;
    return Math.abs(slideCenter - railCenter) < Math.abs(closestCenter - railCenter)
      ? index
      : closestIndex;
  }, 0);
};

const stopAutoplay = () => {
  window.clearTimeout(autoplayTimer);
  autoplayTimer = 0;
};

const canAutoplay = () =>
  productsRail &&
  !reducedMotionQuery.matches &&
  !document.hidden &&
  !productsRail.matches(":hover") &&
  !productsRail.contains(document.activeElement) &&
  draggedPointerId === null;

const scheduleAutoplay = () => {
  stopAutoplay();
  if (!canAutoplay()) return;

  autoplayTimer = window.setTimeout(() => {
    showProductSlide(activeProductSlide + 1);
  }, 5200);
};

const showProductSlide = (index, behavior = "smooth") => {
  if (!productsRail || !productSlides.length) return;

  const targetProductSlide =
    (index + productSlides.length) % productSlides.length;
  const slide = productSlides[targetProductSlide];
  const centeredLeft =
    slide.offsetLeft - (productsRail.clientWidth - slide.offsetWidth) / 2;

  stopAutoplay();
  productsRail.scrollTo({
    left: centeredLeft,
    behavior: reducedMotionQuery.matches ? "auto" : behavior,
  });

  window.clearTimeout(scrollIdleTimer);
  scrollIdleTimer = window.setTimeout(() => {
    activeProductSlide = findNearestProductSlide();
    updateProductState();
    scheduleAutoplay();
  }, 520);
};

productsRail?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showProductSlide(activeProductSlide - 1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    showProductSlide(activeProductSlide + 1);
  }
});

productsRail?.addEventListener(
  "wheel",
  (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    stopAutoplay();
    productsRail.scrollLeft += event.deltaY;
  },
  { passive: false },
);

productsRail?.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;

  draggedPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartScrollLeft = productsRail.scrollLeft;
  dragMoved = false;
  productsRail.classList.add("is-dragging");
  productsRail.setPointerCapture(event.pointerId);
  stopAutoplay();
});

productsRail?.addEventListener("pointermove", (event) => {
  if (event.pointerId !== draggedPointerId) return;

  const distance = event.clientX - dragStartX;
  if (Math.abs(distance) > 5) dragMoved = true;
  productsRail.scrollLeft = dragStartScrollLeft - distance;
  event.preventDefault();
});

const finishProductDrag = (event) => {
  if (event.pointerId !== draggedPointerId) return;

  productsRail?.classList.remove("is-dragging");
  if (productsRail?.hasPointerCapture(event.pointerId)) {
    productsRail.releasePointerCapture(event.pointerId);
  }

  draggedPointerId = null;
  if (dragMoved) suppressLinkUntil = Date.now() + 300;
  activeProductSlide = findNearestProductSlide();
  showProductSlide(activeProductSlide);
};

productsRail?.addEventListener("pointerup", finishProductDrag);
productsRail?.addEventListener("pointercancel", finishProductDrag);

productsRail?.addEventListener(
  "click",
  (event) => {
    const clickedSlide = event.target.closest(".product-portal");
    if (!clickedSlide || !productsRail.contains(clickedSlide)) return;

    event.preventDefault();
    event.stopPropagation();
    if (Date.now() <= suppressLinkUntil) return;

    const clickedIndex = productSlides.indexOf(clickedSlide);
    if (clickedIndex < 0) return;
    stopAutoplay();
    showProductSlide(clickedIndex);
    renderProductDetail(clickedSlide, clickedIndex);
  },
  true,
);

productDetailClose?.addEventListener("click", hideProductDetail);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && productDetailPanel && !productDetailPanel.hidden) {
    hideProductDetail();
  }
});

productsRail?.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

productsRail?.addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        activeProductSlide = findNearestProductSlide();
        updateProductState();
      });
    }

    window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(scheduleAutoplay, 360);
  },
  { passive: true },
);

productsRail?.addEventListener("pointerenter", stopAutoplay);
productsRail?.addEventListener("pointerleave", scheduleAutoplay);
productsRail?.addEventListener("focusin", stopAutoplay);
productsRail?.addEventListener("focusout", scheduleAutoplay);

document.addEventListener("visibilitychange", scheduleAutoplay);
reducedMotionQuery.addEventListener("change", scheduleAutoplay);
window.addEventListener("resize", () => {
  showProductSlide(activeProductSlide, "auto");
});

if (productsRail) {
  productsRail.scrollLeft = 0;
  window.requestAnimationFrame(() => {
    productsRail.scrollLeft = 0;
    activeProductSlide = 0;
    updateProductState();
    scheduleAutoplay();
  });
} else {
  updateProductState();
}
