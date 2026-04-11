const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');

const oldRouting = `		} else {
			if (url.protocol === 'http:') return Response.redirect(url.href.replace(\`http://\${url.hostname}\`, \`https://\${url.hostname}\`), 301);
			if (!管理员密码) return fetch(Pages静态页面 + '/noADMIN').then(r => { const headers = new Headers(r.headers); headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); headers.set('Pragma', 'no-cache'); headers.set('Expires', '0'); return new Response(r.body, { status: 404, statusText: r.statusText, headers }) });
			if (env.KV && typeof env.KV.get === 'function') {`;

const newRouting = `		} else {
			if (url.protocol === 'http:') return Response.redirect(url.href.replace(\`http://\${url.hostname}\`, \`https://\${url.hostname}\`), 301);
			if (env.KV && typeof env.KV.get === 'function' && 访问路径.startsWith('telegram/') && request.method === 'POST') {
				try {
					const TG_TXT = await env.KV.get('tg.json');
					if (TG_TXT) {
						const TG_JSON = JSON.parse(TG_TXT);
						if (TG_JSON.BotToken && 访问路径 === \`telegram/\${TG_JSON.BotToken.toLowerCase()}\`) {
							const update = await request.json();
							ctx.waitUntil(处理Telegram消息(update, env, TG_JSON, url.host, userID));
							return new Response('OK', { status: 200 });
						}
					}
				} catch (e) {
					console.error('Telegram Webhook Error:', e);
				}
			}
			if (!管理员密码) return fetch(Pages静态页面 + '/noADMIN').then(r => { const headers = new Headers(r.headers); headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); headers.set('Pragma', 'no-cache'); headers.set('Expires', '0'); return new Response(r.body, { status: 404, statusText: r.statusText, headers }) });
			if (env.KV && typeof env.KV.get === 'function') {`;

content = content.replace(oldRouting, newRouting);
fs.writeFileSync(file, content, 'utf8');
console.log('Added Telegram Webhook routing');
