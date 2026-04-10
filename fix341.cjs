const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/TLS分片参.*\}&encryption=none/g, 'TLS分片参数}&encryption=none');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed line 341');
