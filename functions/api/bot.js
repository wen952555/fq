let globalTgConfig = null;
let globalTgConfigTime = 0;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || env.TG_BOT_TOKEN;

  if (!token) {
    return new Response("Please provide ?token=YOUR_BOT_TOKEN or set TG_BOT_TOKEN env var to setup webhook.", { status: 400 });
  }

  // Generate a secret token for Telegram Webhook to prevent unauthorized POST requests (KV abuse protection)
  const secretToken = token.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 256);
  const webhookUrl = `${url.origin}/api/bot`;
  const tgUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${secretToken}`;

  try {
    const res = await fetch(tgUrl);
    const data = await res.json();
    
    // If successful, also save the token to KV if available
    if (data.ok && env.KV) {
      let tgConfig = { BotToken: token, ChatID: env.TG_CHAT_ID || null };
      try {
        const tgTxt = await env.KV.get('tg.json');
        if (tgTxt) {
          const parsed = JSON.parse(tgTxt);
          tgConfig = { ...parsed, BotToken: token };
        }
      } catch (e) {}
      await env.KV.put('tg.json', JSON.stringify(tgConfig, null, 2));
      
      // Update memory cache
      globalTgConfig = tgConfig;
      globalTgConfigTime = Date.now();
    }

    return new Response(JSON.stringify({
      message: "Webhook setup result",
      webhookUrl: webhookUrl,
      telegramResponse: data,
      security: "Enabled X-Telegram-Bot-Api-Secret-Token to prevent KV abuse.",
      note: "Please send /bind to your bot in Telegram to bind your Chat ID."
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. In-memory cache to prevent KV read abuse (Saves 100k free tier limits)
  if (!globalTgConfig || Date.now() - globalTgConfigTime > 60000) {
    if (env.KV) {
      try {
        const tgTxt = await env.KV.get('tg.json');
        if (tgTxt) globalTgConfig = JSON.parse(tgTxt);
        globalTgConfigTime = Date.now();
      } catch (e) {}
    }
  }

  const botToken = env.TG_BOT_TOKEN || (globalTgConfig && globalTgConfig.BotToken);
  if (!botToken) {
    return new Response("Bot token not configured", { status: 403 });
  }

  // 2. Verify Telegram Secret Token (Zero KV read cost for invalid requests)
  const expectedSecret = botToken.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 256);
  const providedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (providedSecret !== expectedSecret) {
    console.warn("Unauthorized webhook attempt blocked by Secret Token.");
    return new Response("Unauthorized", { status: 403 });
  }

  let update;
  try {
    update = await request.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = update.message;
  if (!message || !message.text) {
    return new Response("OK");
  }

  const chatId = message.chat.id.toString();
  const tgConfig = globalTgConfig || { BotToken: botToken, ChatID: env.TG_CHAT_ID };

  if (tgConfig.ChatID && chatId !== tgConfig.ChatID.toString() && message.text.trim() !== '/bind') {
    console.log(`Unauthorized access attempt from chat ID: ${chatId}`);
    return new Response("Unauthorized", { status: 403 });
  }

  const text = message.text.trim();
  let replyText = "未知命令。发送 /start 查看帮助。";

  try {
    if (text.startsWith('/start')) {
      replyText = "🤖 欢迎使用 CF Pages Node 控制机器人！\n\n" +
                  "🛡️ **安全防护已开启**：Webhook 密钥验证 + KV 内存缓存防刷\n\n" +
                  "可用命令：\n" +
                  "/sub - 🔗 获取订阅链接\n" +
                  "/vless - ⚡ 获取单节点 VLESS 链接\n" +
                  "/status - 📊 查看节点状态\n" +
                  "/updateips - 🔄 云端同步最新优选IP\n" +
                  "/addip <ip> - ➕ 添加优选IP\n" +
                  "/getip - 🌐 查看优选IP\n" +
                  "/clearip - 🗑️ 清空优选IP\n" +
                  "/proxyip <ip> - 🎭 设置 ProxyIP\n" +
                  "/setuuid <uuid> - 🔑 修改 UUID\n" +
                  "/genuuid - 🎲 随机生成新 UUID\n" +
                  "/setdomain <domain> - 🌍 设置自定义域名\n" +
                  "/proxyiplist - 📋 获取推荐 ProxyIP 列表\n" +
                  "/ping - 🏓 测试连通性\n" +
                  "/bind - 🔒 绑定管理员";
    } else if (text === '/bind') {
      if (!tgConfig.ChatID) {
        tgConfig.ChatID = chatId;
        if (env.KV) await env.KV.put('tg.json', JSON.stringify(tgConfig, null, 2));
        globalTgConfig = tgConfig;
        replyText = `✅ 成功绑定管理员 Chat ID: ${chatId}\n现在你可以使用所有控制命令了！`;
      } else if (tgConfig.ChatID === chatId) {
        replyText = "ℹ️ 当前聊天已经是管理员。";
      } else {
        replyText = "❌ 已经绑定了其他管理员，无法重新绑定。";
      }
    } else if (text === '/ping') {
      replyText = "🏓 Pong! 节点 Webhook 运行正常，KV 缓存状态: " + (globalTgConfig ? "命中" : "未命中");
    } else if (text.startsWith('/addip ')) {
      if (!env.KV) throw new Error("未绑定 KV");
      const newIp = text.replace('/addip ', '').trim();
      let currentIps = await env.KV.get('ADD.txt') || '';
      const ipArray = currentIps.split(/[\r\n,]+/).map(i => i.trim()).filter(Boolean);
      ipArray.push(newIp);
      await env.KV.put('ADD.txt', ipArray.join('\n'));
      replyText = `✅ 成功添加优选IP: ${newIp}\n当前共有 ${ipArray.length} 个优选IP。`;
    } else if (text === '/getip') {
      if (!env.KV) throw new Error("未绑定 KV");
      const currentIps = await env.KV.get('ADD.txt') || '';
      if (!currentIps) {
        replyText = "ℹ️ 当前没有配置自定义优选IP，使用的是默认IP库。";
      } else {
        const ipArray = currentIps.split(/[\r\n,]+/).map(i => i.trim()).filter(Boolean);
        replyText = `🌐 当前配置的优选IP (${ipArray.length}个):\n\n${ipArray.join('\n')}`;
      }
    } else if (text === '/clearip') {
      if (!env.KV) throw new Error("未绑定 KV");
      await env.KV.delete('ADD.txt');
      replyText = "🗑️ 已清空所有自定义优选IP，恢复使用默认IP库。";
    } else if (text === '/updateips') {
      if (!env.KV) throw new Error("未绑定 KV");
      const res = await fetch('https://raw.githubusercontent.com/cmliu/WorkerVless2sub/main/addressesapi.txt');
      if (res.ok) {
        const ips = await res.text();
        await env.KV.put('ADD.txt', ips);
        replyText = `✅ 成功从云端同步最新优选IP库！\n共获取到 ${ips.split('\n').filter(Boolean).length} 条记录。`;
      } else {
        replyText = `❌ 同步失败，HTTP状态码: ${res.status}`;
      }
    } else if (text === '/status') {
      let config = {};
      if (env.KV) {
        const configTxt = await env.KV.get('config.json');
        if (configTxt) config = JSON.parse(configTxt);
      }
      const uuid = config.UUID || env.UUID || '未设置';
      const host = config.HOST || request.headers.get('host');
      const proxyIp = config.反代?.PROXYIP || env.PROXYIP || '未设置';
      replyText = `📊 节点状态：\n\nUUID: \`${uuid}\`\n域名: ${host}\nProxyIP: ${proxyIp}\n\n如需修改更多高级配置，请访问 /admin 面板。`;
    } else if (text === '/sub') {
      let config = {};
      if (env.KV) {
        const configTxt = await env.KV.get('config.json');
        if (configTxt) config = JSON.parse(configTxt);
      }
      const domain = config.HOST || request.headers.get('host');
      const token = config.优选订阅生成?.TOKEN || '请先在网页端 /admin 初始化';
      replyText = `🔗 你的订阅链接：\n\n\`https://${domain}/sub?token=${token}\`\n\n(支持 Clash, Sing-box, V2ray 等客户端直接导入)`;
    } else if (text === '/vless') {
      let config = {};
      if (env.KV) {
        const configTxt = await env.KV.get('config.json');
        if (configTxt) config = JSON.parse(configTxt);
      }
      const uuid = config.UUID || env.UUID;
      const host = config.HOST || request.headers.get('host');
      const proxyIp = config.反代?.PROXYIP || env.PROXYIP || host;
      if (!uuid) {
        replyText = "⚠️ 尚未配置 UUID，无法生成链接。";
      } else {
        const params = new URLSearchParams({
          encryption: 'none', security: 'tls', sni: host, fp: 'randomized',
          type: 'ws', host: host, path: '/?ed=2048'
        });
        replyText = `⚡ 你的 VLESS 节点链接：\n\n\`vless://${uuid}@${proxyIp}:443?${params.toString()}#CF-Pages-Node\`\n\n(点击链接即可复制)`;
      }
    } else if (text.startsWith('/setuuid ')) {
      if (!env.KV) throw new Error("未绑定 KV");
      const newUuid = text.replace('/setuuid ', '').trim();
      let configTxt = await env.KV.get('config.json');
      let config = configTxt ? JSON.parse(configTxt) : {};
      config.UUID = newUuid;
      await env.KV.put('config.json', JSON.stringify(config, null, 2));
      replyText = `✅ UUID 已成功更新为: \`${newUuid}\`\n⚠️ 请注意：修改 UUID 后，原有的节点链接将失效，请使用 /sub 重新获取订阅。`;
    } else if (text === '/genuuid') {
      if (!env.KV) throw new Error("未绑定 KV");
      const newUuid = crypto.randomUUID();
      let configTxt = await env.KV.get('config.json');
      let config = configTxt ? JSON.parse(configTxt) : {};
      config.UUID = newUuid;
      await env.KV.put('config.json', JSON.stringify(config, null, 2));
      replyText = `✅ 已随机生成并应用全新 UUID: \`${newUuid}\`\n⚠️ 原节点链接已失效，请使用 /sub 重新获取。`;
    } else if (text.startsWith('/setdomain ')) {
      if (!env.KV) throw new Error("未绑定 KV");
      const newDomain = text.replace('/setdomain ', '').trim();
      let configTxt = await env.KV.get('config.json');
      let config = configTxt ? JSON.parse(configTxt) : {};
      config.HOST = newDomain;
      await env.KV.put('config.json', JSON.stringify(config, null, 2));
      replyText = `✅ 自定义域名 (HOST) 已更新为: \`${newDomain}\`\n(请确保该域名已在 Cloudflare 中 CNAME 解析到此 Pages)`;
    } else if (text === '/proxyiplist') {
      replyText = "🌐 **常用推荐 ProxyIP 列表**：\n\n" +
                  "`cdn.anycast.eu.org` (推荐, 欧洲)\n" +
                  "`edgetunnel.anycast.eu.org`\n" +
                  "`icook.tw` (台湾)\n" +
                  "`icook.hk` (香港)\n" +
                  "`ip.sb`\n" +
                  "`japan.com` (日本)\n" +
                  "`skk.moe`\n" +
                  "`www.visa.com.sg` (新加坡)\n" +
                  "`www.wto.org`\n\n" +
                  "👉 使用方法：发送 `/proxyip <ip>` 进行设置。";
    } else if (text.startsWith('/proxyip ')) {
      if (!env.KV) throw new Error("未绑定 KV");
      const newProxyIp = text.replace('/proxyip ', '').trim();
      let configTxt = await env.KV.get('config.json');
      let config = configTxt ? JSON.parse(configTxt) : {};
      if (!config.反代) config.反代 = {};
      config.反代["PROXYIP"] = newProxyIp;
      await env.KV.put('config.json', JSON.stringify(config, null, 2));
      replyText = `✅ ProxyIP 已成功更新为: ${newProxyIp}\n(用于突破 Cloudflare 限制或解锁流媒体)`;
    }
  } catch (err) {
    replyText = `❌ 执行命令时发生错误: ${err.message}`;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText,
      parse_mode: 'Markdown'
    })
  });

  return new Response("OK");
}
