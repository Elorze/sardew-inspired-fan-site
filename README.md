# Valley Hearth

一个受 Stardew Valley 舒适农场氛围启发的非官方静态网站示例。

## 声明

本项目是非官方粉丝/学习项目，不隶属于 ConcernedApe、Stardew Valley 或其发行相关方。页面没有复制 Stardew Valley 官方网站源码、官方 logo、官方图片或官方长文案。Stardew Valley 名称仅用于说明灵感来源。

## 内容

- `index.html`：首页结构与内容。
- `styles.css`：响应式像素风视觉样式。
- `script.js`：移动导航与原创场景轮播。
- `assets/`：本项目生成的原创 PNG 素材。

## 本地预览

直接用浏览器打开 `index.html` 即可预览。也可以使用任意静态服务器托管整个目录。

## GitHub Pages

1. 在 GitHub 创建仓库 `stardew-inspired-fan-site`，不要勾选初始化 README。
2. 推送本地仓库到 GitHub。
3. 在仓库 `Settings > Pages` 中选择 `Deploy from branch`，分支选择 `main`，目录选择 `/root`。

## 本地 Git 状态

本目录已经初始化为 Git 仓库，默认分支为 `main`。如果你的 GitHub 用户名是 `lbasei`，创建空远程仓库后执行：

```powershell
git remote add origin https://github.com/lbasei/stardew-inspired-fan-site.git
git push -u origin main
```

如果 `origin` 已经存在，只执行：

```powershell
git push -u origin main
```
