export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || env.TG_BOT_TOKEN;

  if (!token) {
    return new Response("Please provide ?token=YOUR_BOT_TOKEN or set TG_BOT_TOKEN env var to setup webhook.", { status: 400 });
  }

  const webhookUrl = `${url.origin}/api/bot`;
  const tgUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

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
    }

    return new Response(JSON.stringify({
      message: "Webhook setup result",
      webhookUrl: webhookUrl,
      telegramResponse: data,
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

  if (!env.KV) {
    return new Response("KV namespace not bound. Please bind a KV namespace named 'KV'.", { status: 500 });
  }

  let tgConfig = { BotToken: env.TG_BOT_TOKEN, ChatID: env.TG_CHAT_ID };
  try {
    const tgTxt = await env.KV.get('tg.json');
    if (tgTxt) {
      const parsed = JSON.parse(tgTxt);
      if (parsed.BotToken) tgConfig.BotToken = parsed.BotToken;
      if (parsed.ChatID) tgConfig.ChatID = parsed.ChatID;
    }
  } catch (e) {}

  if (!tgConfig.BotToken) {
    return new Response("Bot token not configured", { status: 403 });
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

  if (tgConfig.ChatID && chatId !== tgConfig.ChatID.toString() && message.text.trim() !== '/bind') {
    console.log(`Unauthorized access attempt from chat ID: ${chatId}`);
    return new Response("Unauthorized", { status: 403 });
  }

  const text = message.text.trim();
  let replyText = "未知命令。可用命令：\n/start - 帮助\n/addip <ip> - 添加优选IP\n/getip - 查看优选IP\n/clearip - 清空优选IP\n/updateips - 从云端同步最新优选IP\n/status - 查看当前状态\n/sub - 获取订阅链接\n/proxyip <ip> - 设置ProxyIP";

  try {
    if (text.startsWith('/start')) {
      replyText = "🤖 欢迎使用 CF Pages Node 控制机器人！\n\n可用命令：\n/addip <ip:port#remark> - 添加优选IP\n/getip - 查看当前优选IP\n/clearip - 清空优选IP\n/updateips - 从云端同步最新优选IP\n/status - 查看节点状态\n/sub - 获取订阅链接\n/setuuid <uuid> - 修改UUID\n/proxyip <ip> - 设置反代ProxyIP\n/bind - 绑定此聊天为管理员";
    } else if (text === '/bind') {
      if (!tgConfig.ChatID) {
        tgConfig.ChatID = chatId;
        await env.KV.put('tg.json', JSON.stringify(tgConfig, null, 2));
        replyText = `✅ 成功绑定管理员 Chat ID: ${chatId}\n现在你可以使用所有控制命令了！`;
      } else if (tgConfig.ChatID === chatId) {
        replyText = "ℹ️ 当前聊天已经是管理员。";
      } else {
        replyText = "❌ 已经绑定了其他管理员，无法重新绑定。";
      }
    } else if (text.startsWith('/addip ')) {
      const newIp = text.replace('/addip ', '').trim();
      let currentIps = await env.KV.get('ADD.txt') || '';
      const ipArray = currentIps.split(/[\r\n,]+/).map(i => i.trim()).filter(Boolean);
      ipArray.push(newIp);
      await env.KV.put('ADD.txt', ipArray.join('\n'));
      replyText = `✅ 成功添加优选IP: ${newIp}\n当前共有 ${ipArray.length} 个优选IP。`;
    } else if (text === '/getip') {
      const currentIps = await env.KV.get('ADD.txt') || '';
      if (!currentIps) {
        replyText = "ℹ️ 当前没有配置自定义优选IP，使用的是默认IP库。";
      } else {
        const ipArray = currentIps.split(/[\r\n,]+/).map(i => i.trim()).filter(Boolean);
        replyText = `🌐 当前配置的优选IP (${ipArray.length}个):\n\n${ipArray.join('\n')}`;
      }
    } else if (text === '/clearip') {
      await env.KV.delete('ADD.txt');
      replyText = "🗑️ 已清空所有自定义优选IP，恢复使用默认IP库。";
    } else if (text === '/updateips') {
      const res = await fetch('https://raw.githubusercontent.com/cmliu/WorkerVless2sub/main/addressesapi.txt');
      if (res.ok) {
        const ips = await res.text();
        await env.KV.put('ADD.txt', ips);
        replyText = `✅ 成功从云端同步最新优选IP库！\n共获取到 ${ips.split('\\n').filter(Boolean).length} 条记录。`;
      } else {
        replyText = `❌ 同步失败，HTTP状态码: ${res.status}`;
      }
    } else if (text === '/status') {
      let configTxt = await env.KV.get('config.json');
      if (configTxt) {
        const config = JSON.parse(configTxt);
        replyText = `📊 节点状态：\n\nUUID: ${config.UUID}\n协议: ${config.协议类型}\n传输: ${config.传输协议}\n域名: ${config.HOST}\nProxyIP: ${config.反代?.PROXYIP || env.PROXYIP || '未设置'}\n\n如需修改更多高级配置，请访问 /admin 面板。`;
      } else {
        replyText = "⚠️ 尚未生成配置文件，请先通过浏览器访问节点触发初始化。";
      }
    } else if (text === '/sub') {
      let configTxt = await env.KV.get('config.json');
      if (configTxt) {
        const config = JSON.parse(configTxt);
        const domain = config.HOST || 'your-domain.com';
        const token = config.优选订阅生成?.TOKEN || '请在网页端初始化';
        replyText = `🔗 你的订阅链接：\n\nhttps://${domain}/sub?token=${token}\n\n(支持 Clash, Sing-box, V2ray 等客户端直接导入)`;
      } else {
        replyText = "⚠️ 尚未生成配置文件，请先通过浏览器访问节点触发初始化。";
      }
    } else if (text.startsWith('/setuuid ')) {
      const newUuid = text.replace('/setuuid ', '').trim();
      let configTxt = await env.KV.get('config.json');
      if (configTxt) {
        const config = JSON.parse(configTxt);
        config.UUID = newUuid;
        await env.KV.put('config.json', JSON.stringify(config, null, 2));
        replyText = `✅ UUID 已成功更新为: ${newUuid}\n⚠️ 请注意：修改 UUID 后，原有的节点链接将失效，请使用 /sub 重新获取订阅。`;
      } else {
        replyText = "⚠️ 尚未生成配置文件，无法修改 UUID。";
      }
    } else if (text.startsWith('/proxyip ')) {
      const newProxyIp = text.replace('/proxyip ', '').trim();
      let configTxt = await env.KV.get('config.json');
      if (configTxt) {
        const config = JSON.parse(configTxt);
        if (!config.反代) config.反代 = {};
        config.反代["PROXYIP"] = newProxyIp;
        await env.KV.put('config.json', JSON.stringify(config, null, 2));
        replyText = `✅ ProxyIP 已成功更新为: ${newProxyIp}\n(用于突破 Cloudflare 限制或解锁流媒体)`;
      } else {
        replyText = "⚠️ 尚未生成配置文件，无法修改 ProxyIP。";
      }
    }
  } catch (err) {
    replyText = `❌ 执行命令时发生错误: ${err.message}`;
  }

  await fetch(`https://api.telegram.org/bot${tgConfig.BotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText
    })
  });

  return new Response("OK");
}
