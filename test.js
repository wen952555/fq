
import https from 'https';
function 解析配置文件为URI(text) {
	console.log('text length:', text.length);
	console.log('text start:', text.substring(0, 50));
	let uris = [];
	try {
		const json = JSON.parse(text);
		let proxies = Array.isArray(json) ? json : (json.proxies && Array.isArray(json.proxies) ? json.proxies : null);
		if (proxies) {
			for (const proxy of proxies) {
				if (proxy.type === 'tuic') {
					uris.push('tuic://' + proxy.uuid + ':' + proxy.password + '@' + proxy.server + ':' + proxy.port + '/?sni=' + (proxy.sni || '') + '&alpn=' + (proxy.alpn ? proxy.alpn.replace(/\[|\]/g, '') : '') + '#' + encodeURIComponent(proxy.name || 'tuic'));
				} else if (proxy.type === 'hysteria2') {
					uris.push('hysteria2://' + proxy.password + '@' + proxy.server + ':' + proxy.port + '/?sni=' + (proxy.sni || '') + '&insecure=' + (proxy['skip-cert-verify'] === true || proxy['skip-cert-verify'] === 'true' ? 1 : 0) + '#' + encodeURIComponent(proxy.name || 'hysteria2'));
				} else if (proxy.type === 'vless') {
					uris.push('vless://' + proxy.uuid + '@' + proxy.server + ':' + proxy.port + '?encryption=none&security=' + (proxy.tls ? 'tls' : 'none') + '&type=' + (proxy.network || 'tcp') + '&host=' + (proxy.Host || proxy.host || '') + '&path=' + encodeURIComponent(proxy.path || '') + '&sni=' + (proxy.sni || proxy.servername || '') + '#' + encodeURIComponent(proxy.name || 'vless'));
				} else if (proxy.type === 'trojan') {
					uris.push('trojan://' + proxy.password + '@' + proxy.server + ':' + proxy.port + '?security=' + (proxy.tls ? 'tls' : 'none') + '&type=' + (proxy.network || 'tcp') + '&host=' + (proxy.Host || proxy.host || '') + '&path=' + encodeURIComponent(proxy.path || '') + '&sni=' + (proxy.sni || proxy.servername || '') + '#' + encodeURIComponent(proxy.name || 'trojan'));
				} else if (proxy.type === 'vmess') {
					let vmessObj = {
						v: '2',
						ps: proxy.name || 'vmess',
						add: proxy.server,
						port: proxy.port,
						id: proxy.uuid,
						aid: proxy.alterId || 0,
						scy: proxy.cipher || 'auto',
						net: proxy.network || 'tcp',
						type: 'none',
						host: proxy.Host || proxy.host || '',
						path: proxy.path || '',
						tls: proxy.tls ? 'tls' : 'none',
						sni: proxy.sni || proxy.servername || '',
						alpn: ''
					};
					uris.push('vmess://' + btoa(JSON.stringify(vmessObj)));
				} else if (proxy.type === 'ss') {
					uris.push('ss://' + btoa(proxy.cipher + ':' + proxy.password) + '@' + proxy.server + ':' + proxy.port + '#' + encodeURIComponent(proxy.name || 'ss'));
				}
			}
		}
		if (json.outbounds && Array.isArray(json.outbounds)) {
			for (const out of json.outbounds) {
				if (out.type === 'tuic') {
					uris.push('tuic://' + out.uuid + ':' + out.password + '@' + out.server + ':' + out.server_port + '/?sni=' + (out.tls?.server_name || '') + '&alpn=' + (out.tls?.alpn || []).join(',') + '#' + encodeURIComponent(out.tag || 'tuic'));
				} else if (out.type === 'hysteria2') {
					uris.push('hysteria2://' + out.password + '@' + out.server + ':' + out.server_port + '/?sni=' + (out.tls?.server_name || '') + '&insecure=' + (out.tls?.insecure ? 1 : 0) + '#' + encodeURIComponent(out.tag || 'hysteria2'));
				} else if (out.type === 'vless' || out.protocol === 'vless') {
					let server = out.server || out.settings?.vnext?.[0]?.address;
					let port = out.server_port || out.settings?.vnext?.[0]?.port;
					let uuid = out.uuid || out.settings?.vnext?.[0]?.users?.[0]?.id;
					let sni = out.tls?.server_name || out.streamSettings?.tlsSettings?.serverName || '';
					let type = out.transport?.type || out.streamSettings?.network || 'tcp';
					let path = out.transport?.path || out.streamSettings?.wsSettings?.path || '';
					let host = out.transport?.headers?.Host || out.streamSettings?.wsSettings?.headers?.Host || '';
					let security = out.tls?.enabled || out.streamSettings?.security === 'tls' ? 'tls' : 'none';
					uris.push('vless://' + uuid + '@' + server + ':' + port + '?encryption=none&security=' + security + '&type=' + type + '&host=' + host + '&path=' + encodeURIComponent(path) + '&sni=' + sni + '#' + encodeURIComponent(out.tag || 'vless'));
				} else if (out.type === 'trojan' || out.protocol === 'trojan') {
					let server = out.server || out.settings?.servers?.[0]?.address;
					let port = out.server_port || out.settings?.servers?.[0]?.port;
					let password = out.password || out.settings?.servers?.[0]?.password;
					let sni = out.tls?.server_name || out.streamSettings?.tlsSettings?.serverName || '';
					let type = out.transport?.type || out.streamSettings?.network || 'tcp';
					let path = out.transport?.path || out.streamSettings?.wsSettings?.path || '';
					let host = out.transport?.headers?.Host || out.streamSettings?.wsSettings?.headers?.Host || '';
					let security = out.tls?.enabled || out.streamSettings?.security === 'tls' ? 'tls' : 'none';
					uris.push('trojan://' + password + '@' + server + ':' + port + '?security=' + security + '&type=' + type + '&host=' + host + '&path=' + encodeURIComponent(path) + '&sni=' + sni + '#' + encodeURIComponent(out.tag || 'trojan'));
				} else if (out.type === 'vmess' || out.protocol === 'vmess') {
					let server = out.server || out.settings?.vnext?.[0]?.address;
					let port = out.server_port || out.settings?.vnext?.[0]?.port;
					let uuid = out.uuid || out.settings?.vnext?.[0]?.users?.[0]?.id;
					let sni = out.tls?.server_name || out.streamSettings?.tlsSettings?.serverName || '';
					let type = out.transport?.type || out.streamSettings?.network || 'tcp';
					let path = out.transport?.path || out.streamSettings?.wsSettings?.path || '';
					let host = out.transport?.headers?.Host || out.streamSettings?.wsSettings?.headers?.Host || '';
					let security = out.tls?.enabled || out.streamSettings?.security === 'tls' ? 'tls' : 'none';
					let vmessObj = {
						v: '2',
						ps: out.tag || 'vmess',
						add: server,
						port: port,
						id: uuid,
						aid: out.alterId || out.settings?.vnext?.[0]?.users?.[0]?.alterId || 0,
						scy: out.security || out.settings?.vnext?.[0]?.users?.[0]?.security || 'auto',
						net: type,
						type: 'none',
						host: host,
						path: path,
						tls: security,
						sni: sni,
						alpn: ''
					};
					uris.push('vmess://' + btoa(JSON.stringify(vmessObj)));
				} else if (out.type === 'shadowsocks' || out.protocol === 'shadowsocks') {
					let server = out.server || out.settings?.servers?.[0]?.address;
					let port = out.server_port || out.settings?.servers?.[0]?.port;
					let method = out.method || out.settings?.servers?.[0]?.method;
					let password = out.password || out.settings?.servers?.[0]?.password;
					uris.push('ss://' + btoa(method + ':' + password) + '@' + server + ':' + port + '#' + encodeURIComponent(out.tag || 'ss'));
				}
			}
		}
		if (json.server && json.auth) {
			const [host, port] = json.server.split(':');
			const portNumber = port ? port.split(',')[0].split('-')[0] : '443';
			uris.push('hysteria2://' + json.auth + '@' + host + ':' + portNumber + '/?sni=' + (json.tls?.sni || '') + '&insecure=' + (json.tls?.insecure ? 1 : 0) + '#hysteria2');
		}
	} catch (e) {
		const blocks = text.split(/\n\s*-\s*name:\s*/).slice(1);
		for (const block of blocks) {
			const proxy = {};
			const lines = ('name: ' + block).split('\n');
			for (const line of lines) {
				const match = line.match(/^\s*([a-zA-Z0-9-]+):\s*(.+)$/);
				if (match) {
					proxy[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
				}
			}
			if (proxy.type === 'tuic') {
				uris.push('tuic://' + proxy.uuid + ':' + proxy.password + '@' + proxy.server + ':' + proxy.port + '/?sni=' + (proxy.sni || '') + '&alpn=' + (proxy.alpn ? proxy.alpn.replace(/[|]/g, '') : '') + '#' + encodeURIComponent(proxy.name || 'tuic'));
			} else if (proxy.type === 'hysteria2') {
				uris.push('hysteria2://' + proxy.password + '@' + proxy.server + ':' + proxy.port + '/?sni=' + (proxy.sni || '') + '&insecure=' + (proxy['skip-cert-verify'] === 'true' ? 1 : 0) + '#' + encodeURIComponent(proxy.name || 'hysteria2'));
			} else if (proxy.type === 'vless') {
				uris.push('vless://' + proxy.uuid + '@' + proxy.server + ':' + proxy.port + '?encryption=none&security=' + (proxy.tls ? 'tls' : 'none') + '&type=' + (proxy.network || 'tcp') + '&host=' + (proxy.Host || proxy.host || '') + '&path=' + encodeURIComponent(proxy.path || '') + '&sni=' + (proxy.sni || proxy.servername || '') + '#' + encodeURIComponent(proxy.name || 'vless'));
			} else if (proxy.type === 'trojan') {
				uris.push('trojan://' + proxy.password + '@' + proxy.server + ':' + proxy.port + '?security=' + (proxy.tls ? 'tls' : 'none') + '&type=' + (proxy.network || 'tcp') + '&host=' + (proxy.Host || proxy.host || '') + '&path=' + encodeURIComponent(proxy.path || '') + '&sni=' + (proxy.sni || proxy.servername || '') + '#' + encodeURIComponent(proxy.name || 'trojan'));
			} else if (proxy.type === 'vmess') {
				let vmessObj = {
					v: '2',
					ps: proxy.name || 'vmess',
					add: proxy.server,
					port: proxy.port,
					id: proxy.uuid,
					aid: proxy.alterId || 0,
					scy: proxy.cipher || 'auto',
					net: proxy.network || 'tcp',
					type: 'none',
					host: proxy.Host || proxy.host || '',
					path: proxy.path || '',
					tls: proxy.tls ? 'tls' : 'none',
					sni: proxy.sni || proxy.servername || '',
					alpn: ''
				};
				uris.push('vmess://' + btoa(JSON.stringify(vmessObj)));
			} else if (proxy.type === 'ss') {
				uris.push('ss://' + btoa(proxy.cipher + ':' + proxy.password) + '@' + proxy.server + ':' + proxy.port + '#' + encodeURIComponent(proxy.name || 'ss'));
			}
		}
	}
	return uris;
}

https.get('https://gitlab.com/free9999/ipupdate/-/raw/master/backup/img/1/2/ipp/clash.meta2/3/config.yaml', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const uris = 解析配置文件为URI(data);
    console.log('Parsed URIs count:', uris.length);
  });
});
