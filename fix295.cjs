const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const 优选API的IP = 请求.*选API内容\[0\];/g, 'const 优选API的IP = 请求优选API内容[0];');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed line 295');
