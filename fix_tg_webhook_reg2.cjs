const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');

const oldTgLogic = `								} else {
									if (!newConfig.BotToken || !newConfig.ChatID) return new Response(JSON.stringify({ error: '配置不完整' }), { status: 400, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
									await env.KV.put('tg.json', JSON.stringify(newConfig, null, 2));
								}`;

const newTgLogic = `								} else {
									if (!newConfig.BotToken || !newConfig.ChatID) return new Response(JSON.stringify({ error: '配置不完整' }), { status: 400, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
									await env.KV.put('tg.json', JSON.stringify(newConfig, null, 2));
									// 自动注册 Telegram Webhook
									const webhookUrl = \`https://\${url.host}/telegram/\${newConfig.BotToken}\`;
									ctx.waitUntil(fetch(\`https://api.telegram.org/bot\${newConfig.BotToken}/setWebhook?url=\${encodeURIComponent(webhookUrl)}\`));
								}`;

if (content.includes(oldTgLogic)) {
  content = content.replace(oldTgLogic, newTgLogic);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed TG webhook registration logic');
} else {
  console.log('Could not find target string');
}
