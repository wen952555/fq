const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');

const oldLogLogic = `					日志数组.push(日志内容);
					while (JSON.stringify(日志数组, null, 2).length > KV容量限制 * 1024 * 1024 && 日志数组.length > 0) 日志数组.shift();`;

const newLogLogic = `					日志数组.push(日志内容);
					// 限制最大日志条数，避免 JSON.stringify 导致 CPU 超时 (1000条约 200-300KB)
					const maxLogEntries = 1000;
					if (日志数组.length > maxLogEntries) {
						日志数组 = 日志数组.slice(-maxLogEntries);
					}`;

content = content.replace(oldLogLogic, newLogLogic);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed KV log logic');
