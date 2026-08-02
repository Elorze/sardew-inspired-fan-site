const blogPosts = {
  devlog: {
    category: "开发日记",
    date: "2026-07-28",
    displayDate: "7 月 28 日",
    title: "把三扇门安到同一条路上",
    image: "assets/product-world-thumb.png",
    alt: "种种世界花园全景",
    paper: "sprout",
    material: "实机画面 01 · 花园入口",
    stamp: "07·28",
    paragraphs: [
      "三个世界的入口重新摆好了。花园更轻，酒馆更暖，蒲公英的路则留了一点风。",
      "我们想让每扇门都有自己的方向，也让你第一眼就知道自己正要走进哪里。",
    ],
  },
  manuscript: {
    category: "创作手记",
    date: "2026-07-27",
    displayDate: "7 月 27 日",
    title: "蒲公英地图又长出一条小路",
    image: "assets/product-dandelion-thumb.png",
    alt: "蒲公英大世界地图全景",
    paper: "dandelion",
    material: "地图手稿 02 · 新路试画",
    stamp: "07·27",
    paragraphs: [
      "地图又长出一条路。它不是捷径，走过去会遇见一点风、几株植物和一处适合停下来的空地。",
      "下一次打开手稿时，这条路也许还会改变。世界本来就是边走边长出来的。",
    ],
  },
  npc: {
    category: "角色记录",
    date: "2026-07-26",
    displayDate: "7 月 26 日",
    title: "今天，三位新朋友开口了",
    image: "assets/gameplay-tavern.png",
    alt: "种种酒馆的三位伙伴",
    paper: "tavern",
    material: "角色记录 03 · 酒馆灯光",
    stamp: "07·26",
    paragraphs: [
      "三位新朋友有了第一句话。有人见面先问天气，有人只关心晚饭，还有一个人总把真正想说的话留到最后。",
      "等名字、关系和秘密慢慢长齐，他们就不再只是设定表里的一行字。",
    ],
  },
};

const requestedBlogPost = new URLSearchParams(window.location.search).get("id");
const blogPost = blogPosts[requestedBlogPost] || blogPosts.devlog;
const blogMeta = document.querySelector("#blogPostMeta");
const blogTitle = document.querySelector("#blogPostTitle");
const blogImage = document.querySelector("#blogPostImage");
const blogBody = document.querySelector("#blogPostBody");
const blogMaterial = document.querySelector("#blogPostMaterial");
const blogLetter = document.querySelector(".blog-letter-detail");
const blogStamp = blogLetter?.querySelector(".mail-stamp");

if (blogMeta && blogTitle && blogImage && blogBody && blogMaterial && blogLetter) {
  blogMeta.textContent = `${blogPost.category} · ${blogPost.displayDate}`;
  blogTitle.textContent = blogPost.title;
  blogImage.src = blogPost.image;
  blogImage.alt = blogPost.alt;
  blogMaterial.textContent = blogPost.material;
  blogLetter.dataset.paper = blogPost.paper;
  if (blogStamp) blogStamp.textContent = blogPost.stamp;
  document.title = `${blogPost.title}｜种种大世界`;

  blogPost.paragraphs.forEach((paragraph) => {
    const line = document.createElement("p");
    line.textContent = paragraph;
    blogBody.append(line);
  });
}

const detailImageViewer = document.querySelector(".mail-image-viewer");
const detailViewerImage = detailImageViewer?.querySelector("img");
const detailViewerClose = detailImageViewer?.querySelector(
  ".mail-image-viewer-close",
);

const openDetailImageViewer = () => {
  if (!detailImageViewer || !detailViewerImage || !blogImage?.src) return;
  detailViewerImage.src = blogImage.currentSrc || blogImage.src;
  detailViewerImage.alt = blogImage.alt || "放大的信件图片";
  detailImageViewer.showModal();
  window.requestAnimationFrame(() =>
    detailImageViewer.classList.add("is-visible"),
  );
};

const closeDetailImageViewer = () => {
  if (!detailImageViewer?.open) return;
  detailImageViewer.classList.remove("is-visible");
  window.setTimeout(() => detailImageViewer.close(), 180);
};

if (blogImage) {
  blogImage.tabIndex = 0;
  blogImage.setAttribute("role", "button");
  blogImage.setAttribute("title", "双击放大");
  blogImage.setAttribute("aria-label", `${blogImage.alt}，双击放大`);
  blogImage.addEventListener("dblclick", openDetailImageViewer);
  blogImage.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDetailImageViewer();
  });
}

detailViewerClose?.addEventListener("click", closeDetailImageViewer);
detailImageViewer?.addEventListener("click", (event) => {
  if (event.target === detailImageViewer) closeDetailImageViewer();
});
detailImageViewer?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDetailImageViewer();
});
