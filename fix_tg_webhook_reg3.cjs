const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/await env\.KV\.put\('tg\.json', JSON\.stringify\(newConfig, null, 2\)\);\s*\}/, 
`await env.KV.put('tg.json', JSON.stringify(newConfig, null, 2));
									const webhookUrl = \`https://\${url.host}/telegram/\${newConfig.BotToken}\`;
									ctx.waitUntil(fetch(\`https://api.telegram.org/bot\${newConfig.BotToken}/setWebhook?url=\${encodeURIComponent(webhookUrl)}\`));
								}`);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed TG webhook registration logic');
