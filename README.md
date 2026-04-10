# CF Pages Node Deployer

这是一个基于 Cloudflare Pages 和 Functions 构建的 VLESS 节点部署项目。它集成了 `edgetunnel` 的核心功能，并增加了 **Telegram 机器人控制面板**，让你可以在手机上随时随地管理你的节点。

## 🚀 部署步骤 (GitHub 自动部署)

1. **推送到 GitHub**
   将此项目的所有文件（通过左上角菜单 Export -> GitHub）推送到你的 GitHub 仓库。

2. **连接 Cloudflare Pages**
   - 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
   - 进入 **Workers & Pages** -> **Pages** -> **Connect to Git**
   - 选中你的仓库

3. **配置构建设置 (Build settings)**
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables (环境变量)**: 
     - 必须添加 `UUID` 变量（你的 VLESS 密码，例如 `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`）
     - *(可选)* 添加 `PROXYIP` 变量（用于解锁流媒体或突破 CF 限制，例如 `cdn.anycast.eu.org`）

4. **绑定 KV 命名空间 (非常重要！)**
   - 部署完成后，进入项目的 **Settings** -> **Functions** -> **KV Namespace Bindings**
   - 添加一个绑定：
     - **Variable name**: `KV`
     - **KV namespace**: 选择或创建一个新的 KV 命名空间（例如 `edgetunnel-kv`）
   - **注意：绑定 KV 后，必须返回 Deployments 页面点击 "Retry deployment" 重新部署一次才会生效。**

## 🤖 配置 Telegram 机器人控制面板

本项目内置了 Telegram 机器人 Webhook，你可以直接在 Telegram 中管理优选 IP、获取订阅链接、查看状态和修改配置。

1. 在 Telegram 中向 [@BotFather](https://t.me/BotFather) 发送 `/newbot` 创建一个机器人，获取 **Bot Token**。
2. 访问你的 Pages 域名来设置 Webhook：
   `https://<你的Pages域名>/api/bot?token=<你的Bot_Token>`
   *(如果页面返回 `{"ok":true,...}` 则说明设置成功)*
3. 在 Telegram 中找到你的机器人，发送 `/bind` 命令。
   *(第一个发送 `/bind` 的用户将被绑定为管理员，其他人无法再控制)*
4. 绑定成功后，发送 `/start` 查看所有可用命令：
   - `/sub` - 🔗 **获取订阅链接** (支持 Clash, Sing-box, V2ray 等)
   - `/status` - 📊 查看节点当前状态
   - `/updateips` - 🔄 从云端同步最新优选 IP 库
   - `/addip <ip:port#remark>` - ➕ 手动添加优选 IP
   - `/getip` - 🌐 查看当前自定义优选 IP
   - `/clearip` - 🗑️ 清空自定义优选 IP
   - `/proxyip <ip>` - 🎭 设置 ProxyIP (用于解锁流媒体或突破 CF 限制)
   - `/setuuid <uuid>` - 🔑 动态修改 UUID 密码

## ⚙️ 进阶管理

你也可以直接访问 `https://<你的Pages域名>/admin` 进入网页版控制面板进行更详细的高级配置（默认密码即为你的 UUID）。
