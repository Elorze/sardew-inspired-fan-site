# 种种统一账号接入

账号服务由 `account-service.mjs` 提供。账号密码只提交给账号服务，产品端不得保存密码，也不得把会话 Cookie 或访问令牌放进跳转链接。

## 已提供的后端能力

- 邮箱注册、登录、退出和全部设备退出。
- scrypt 密码哈希与随机盐。
- 持久化 HttpOnly 会话，服务重启后仍然有效。
- 资料更新、修改密码和登录设备列表。
- OAuth 2.0 授权码思路的 PKCE 产品授权。
- 一次性授权码、短期访问令牌、用户信息和令牌撤销。
- 来源白名单、请求体上限、登录限流和过期凭据清理。

## 部署配置

复制 `.env.example` 为 `.env`，至少填写：

```dotenv
PUBLIC_BASE_URL=https://account.example.com
ACCOUNT_ISSUER=https://account.example.com
ACCOUNT_USERS_FILE=data/users.json
ACCOUNT_STATE_FILE=data/account-state.json
ACCOUNT_CLIENTS_FILE=config/account-clients.json
```

生产环境必须使用 HTTPS，并为 `data/` 挂载持久化磁盘。Vercel Functions 等临时文件系统不能直接保存正式账号数据；此服务应部署到有持久化卷的 Node 主机，或在迁移到数据库适配器后再使用无状态平台。

`config/account-clients.json` 已登记：

- `zhongzhong-world`
- `zhongzhong-tavern`
- `dandelion-world`

每个产品的来源和回调地址必须精确匹配登记内容。

## 同域产品

与官网同源的页面可以直接读取 Cookie 会话：

```js
const response = await fetch("/api/auth/session", {
  credentials: "include",
});
const { account } = await response.json();
```

## 独立域名产品

静态产品可以加载通用 PKCE 客户端：

```html
<script
  src="https://account.example.com/product-account.js"
  data-account-client="zhongzhong-world"
  data-account-issuer="https://account.example.com"
  data-account-redirect="https://product.example.com/"
></script>
```

调用登录：

```js
await window.ZhongZhongProductAccount.login();
```

读取登录结果：

```js
const account = await window.ZhongZhongProductAccount.ready;
```

产品有自己的后端时，应由产品后端完成 `/api/auth/token` 交换，并为产品创建自己的 HttpOnly 会话；不要把访问令牌长期写入 `localStorage`。

## 接口

| 方法 | 地址 | 用途 |
| --- | --- | --- |
| `GET` | `/api/auth/session` | 官网 Cookie 会话 |
| `POST` | `/api/auth/register` | 注册 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 当前设备退出 |
| `POST` | `/api/auth/logout-all` | 全部设备退出 |
| `PATCH` | `/api/auth/profile` | 修改昵称 |
| `POST` | `/api/auth/change-password` | 修改密码 |
| `GET` | `/api/auth/sessions` | 登录设备 |
| `GET` | `/api/auth/authorize` | 发起 PKCE 授权 |
| `POST` | `/api/auth/token` | 使用一次性授权码换令牌 |
| `GET` | `/api/auth/userinfo` | Bearer 令牌读取账号 |
| `POST` | `/api/auth/revoke` | 撤销访问令牌 |
| `GET` | `/.well-known/zhongzhong-account` | 服务发现 |

运行 `npm test` 会验证注册、会话重启持久化、PKCE 授权、授权码单次使用和令牌撤销。
