const forumThemeStorageKey = "zhongzhong-forum-theme";
const forumThemeChoices = new Set(["sprout", "blossom", "dew"]);
const forumThemeButtons = document.querySelectorAll("[data-forum-theme-choice]");

function applyForumTheme(theme) {
  const nextTheme = forumThemeChoices.has(theme) ? theme : "sprout";
  document.body.dataset.forumTheme = nextTheme;

  forumThemeButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.forumThemeChoice === nextTheme),
    );
  });
}

let savedForumTheme = "sprout";

try {
  savedForumTheme =
    window.localStorage.getItem(forumThemeStorageKey) || savedForumTheme;
} catch {
  savedForumTheme = "sprout";
}

applyForumTheme(savedForumTheme);

forumThemeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.forumThemeChoice;
    applyForumTheme(theme);

    try {
      window.localStorage.setItem(forumThemeStorageKey, theme);
    } catch {
      // The selected theme still applies for the current page.
    }
  });
});
