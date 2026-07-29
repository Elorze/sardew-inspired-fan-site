# 种种大世界

种种大世界的多页面官方网站，汇集种种世界、种种酒馆和蒲公英大世界三款产品。

## 内容

- `index.html`：品牌首页与栏目总入口。
- `blog.html`：开发日记、创作手记与角色记录。
- `blog-post.html`：博客文章页面。
- `forum.html`：论坛主题列表。
- `forum-post.html`：论坛帖子页面。
- `wiki.html`：角色、地点与世界资料。
- `wiki-entry.html`：百科资料页面。
- `media.html`：原创视频播放器。
- `products.html`：三款产品介绍与真实入口。
- `faq.html`：可展开的问题与回答。
- `faq-submit.html`：提交问题页面。
- `shop.html`：文创商品与购物车。
- `site-shell.js`：所有页面共用的导航与版权页尾。
- `styles.css`：响应式像素风视觉样式。
- `script.js`：移动导航与原创场景轮播。
- `assets/`：本项目生成的原创 PNG 素材。

## 本地预览

页面内容可以直接打开浏览，但登录、统一账号和支付必须通过 Node 服务访问：

文创商店的支付宝结算需要使用本项目的 Node 服务：

```bash
npm install
npm run dev
```

默认地址为 `http://127.0.0.1:8000`。

## 统一账号

统一账号后端包含持久化会话和跨产品 PKCE 授权。产品登记位于 `config/account-clients.json`，完整部署与接入方式见 `ACCOUNT_INTEGRATION.md`。

```bash
npm test
```

测试会覆盖服务重启后的登录状态和跨产品授权码交换。

## 支付宝支付

支付服务使用支付宝官方 Node SDK 和 `alipay.trade.page.pay` 电脑网站支付接口。服务端会依据商品表重新计算金额，并在异步通知中完成 RSA2 验签、应用 ID、商家 ID 和订单金额核对。

1. 在支付宝开放平台创建应用并签约电脑网站支付。
2. 按 `.env.example` 创建 `.env`。
3. 将应用私钥和支付宝公钥放入 `certs/`，不要提交到仓库。
4. 将 `PUBLIC_BASE_URL` 设置为可被支付宝访问的 HTTPS 域名。
5. 使用 `npm run dev` 启动站点。

没有完整商户参数时，结算接口会返回 `503`，不会生成假订单。支付完成以支付宝异步通知或服务端主动查单为准；同步返回参数仅验签并触发查单，不直接判定付款成功。

订单写入 `PAYMENT_ORDERS_FILE`，其中包含履约所需的收货信息。正式部署时必须将该文件放在受访问控制的持久化磁盘中，并纳入备份与隐私数据管理；它不会通过静态文件服务公开。

## GitHub Pages

1. 在 GitHub 创建仓库 `stardew-inspired-fan-site`，不要勾选初始化 README。
2. 推送本地仓库到 GitHub。
3. 在仓库 `Settings > Pages` 中选择 `Deploy from branch`，分支选择 `main`，目录选择 `/root`。

GitHub Pages 只能托管静态文件，不能运行支付宝签名和回调服务。正式收款时必须把 `server.mjs` 部署到支持 Node.js 和 HTTPS 的服务环境。

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
