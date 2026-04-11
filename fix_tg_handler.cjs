const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');

const tgHandler = `
async function 处理Telegram消息(update, env, TG_JSON, host, userID) {
	if (!update.message || !update.message.text) return;
	const chatId = update.message.chat.id;
	if (String(chatId) !== String(TG_JSON.ChatID)) return; // 只响应配置的 ChatID

	const text = update.message.text.trim();
	const botToken = TG_JSON.BotToken;
	const sendMessage = async (msg) => {
		await fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
		});
	};

	if (text === '/start' || text === '/help') {
		await sendMessage(\`🤖 <b>控制面板</b>\\n\\n/ip - 查看当前自定义优选IP\\n/setip [IP列表] - 设置自定义优选IP (多个IP用换行分隔)\\n/clearip - 清空自定义优选IP\\n/sub - 获取订阅链接\\n/info - 查看当前配置信息\`);
	} else if (text === '/ip') {
		const currentIPs = await env.KV.get('ADD.txt') || '未设置';
		await sendMessage(\`🌐 <b>当前自定义优选IP:</b>\\n<code>\${currentIPs}</code>\`);
	} else if (text.startsWith('/setip ')) {
		const newIPs = text.substring(7).trim();
		if (newIPs) {
			await env.KV.put('ADD.txt', newIPs);
			await sendMessage(\`✅ <b>自定义优选IP已更新:</b>\\n<code>\${newIPs}</code>\`);
		} else {
			await sendMessage(\`❌ 格式错误。请使用: /setip 1.1.1.1\`);
		}
	} else if (text === '/clearip') {
		await env.KV.delete('ADD.txt');
		await sendMessage(\`✅ <b>自定义优选IP已清空</b>\`);
	} else if (text === '/sub') {
		const token = await MD5MD5(host + userID);
		const subUrl = \`https://\${host}/sub?token=\${token}\`;
		await sendMessage(\`🔗 <b>您的订阅链接:</b>\\n<code>\${subUrl}</code>\`);
	} else if (text === '/info') {
		let config_JSON = {};
		try {
			const configStr = await env.KV.get('config.json');
			if (configStr) config_JSON = JSON.parse(configStr);
		} catch (e) {}
		const info = \`⚙️ <b>当前配置信息:</b>\\n\\n\` +
			\`<b>UUID:</b> <code>\${config_JSON.UUID || '未设置'}</code>\\n\` +
			\`<b>协议:</b> \${config_JSON.协议类型 || 'vless'}\\n\` +
			\`<b>伪装域名:</b> \${config_JSON.HOST || '未设置'}\\n\` +
			\`<b>节点路径:</b> \${config_JSON.PATH || '/?ed=2560'}\`;
		await sendMessage(info);
	}
}
`;

content += tgHandler;
fs.writeFileSync(file, content, 'utf8');
console.log('Added Telegram handler');
