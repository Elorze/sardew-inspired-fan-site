const blockedForumPatterns = [
  /https?:\/\//i,
  /www\./i,
  /加\s*(微|v|vx|qq)/i,
  /私\s*(聊|信)/i,
  /代\s*(充|刷|练)/i,
  /广告|推广|返利|兼职|贷款|办证|发票/i,
  /傻[逼比]|垃圾|滚开|去死|操你|妈的|草泥马/i,
];

const keyboardMashPattern = /(?:asdf|qwer|zxcv|hjkl|aaaa|bbbb|testtest|lorem)/i;

export const moderateForumReply = (value, { hasSticker = false } = {}) => {
  const original = String(value || "");
  const text = original.replace(/\s+/g, " ").trim();

  if (!text) {
    return hasSticker
      ? { ok: true, text }
      : { ok: false, reason: "写点内容或选一个表情。" };
  }

  const compact = text.replace(/\s+/g, "");
  const withoutPunctuation = compact.replace(/[^\p{L}\p{N}]/gu, "");
  const uniqueCharacters = new Set([...withoutPunctuation.toLowerCase()]);
  const punctuationCount = [...compact].filter((character) =>
    /[^\p{L}\p{N}]/u.test(character),
  ).length;

  if ([...withoutPunctuation].length < 4) {
    return { ok: false, reason: "内容太短了，补一句完整的话再发。" };
  }

  if (/(.)\1{5,}/u.test(compact)) {
    return { ok: false, reason: "重复字符太多，像刷屏内容。" };
  }

  if ([...withoutPunctuation].length >= 6 && uniqueCharacters.size < 3) {
    return { ok: false, reason: "内容辨识度太低，像乱码。" };
  }

  if (compact.length >= 8 && punctuationCount / compact.length > 0.55) {
    return { ok: false, reason: "符号太多，看不清楚想表达什么。" };
  }

  if (keyboardMashPattern.test(compact)) {
    return { ok: false, reason: "内容像键盘乱输，请整理后再发。" };
  }

  if (blockedForumPatterns.some((pattern) => pattern.test(text))) {
    return { ok: false, reason: "这条内容包含广告、外链或不友善表达，暂不通过。" };
  }

  return { ok: true, text };
};
