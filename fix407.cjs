const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const .*包 = await 读取XHTTP首包/g, 'const 首包 = await 读取XHTTP首包');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed line 407');
