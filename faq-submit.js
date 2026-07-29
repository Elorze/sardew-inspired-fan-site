const faqSubmissionForm = document.querySelector("#faqSubmissionForm");
const faqFormStatus = document.querySelector("#faqFormStatus");

const submitContent = async (payload) => {
  const response = await fetch("/api/content/submissions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "提交失败，请稍后再试。");
  }
  return result;
};

faqSubmissionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (window.location.protocol === "file:") {
    if (faqFormStatus) faqFormStatus.textContent = "请用本地网站地址打开后提交";
    return;
  }

  const formData = new FormData(faqSubmissionForm);
  const question = String(formData.get("question") || "").trim();
  const details = String(formData.get("details") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  const visibility = String(formData.get("visibility") || "anonymous");

  if (!question) {
    if (faqFormStatus) faqFormStatus.textContent = "请先填写问题";
    return;
  }

  if (visibility === "real") {
    await Promise.resolve(window.ZhongZhongAccount?.ready);
  }

  if (visibility === "real" && !window.ZhongZhongAccount?.getSession()) {
    if (faqFormStatus) faqFormStatus.textContent = "实名刊登需要先登录";
    window.ZhongZhongAccount?.open();
    return;
  }

  if (faqFormStatus) faqFormStatus.textContent = "正在送出";

  try {
    await submitContent({
      type: "faq-question",
      title: question,
      message: details || question,
      source: contact,
      visibility,
    });
    faqSubmissionForm.reset();
    if (faqFormStatus) faqFormStatus.textContent = "已收到，审核后会刊登";
  } catch (error) {
    if (faqFormStatus) faqFormStatus.textContent = error.message;
  }
});
