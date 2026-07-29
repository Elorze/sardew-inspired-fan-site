const faqEntries = {
  about: {
    question: "种种大世界是什么？",
    answer: "种种大世界汇集故事、社区、原创画面与不同体验，是认识种种旗下内容的起点。",
  },
  products: {
    question: "三款产品分别是什么？",
    answer: "种种旗下目前包含种种世界、种种酒馆和蒲公英大世界。",
  },
  visuals: {
    question: "这些画面由谁创作？",
    answer: "农场、森林、河岸与小镇画面均为种种原创视觉内容。",
  },
  contact: {
    question: "如何联系种种？",
    answer: "可以通过顶部的微信群、抖音、小红书或邮箱入口联系种种。",
  },
};

const requestedFaqEntry = new URLSearchParams(window.location.search).get("id");
const faqEntry = faqEntries[requestedFaqEntry] || faqEntries.about;
const faqQuestion = document.querySelector("#faqEntryQuestion");
const faqAnswer = document.querySelector("#faqEntryAnswer");

if (faqQuestion && faqAnswer) {
  faqQuestion.textContent = faqEntry.question;
  faqAnswer.textContent = faqEntry.answer;
  document.title = `${faqEntry.question}｜种种大世界`;
}
