const fs = require('fs');
const file = './functions/[[path]].js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/new URL\(待验证优.*URL\);/g, 'new URL(urlToVerify);');
content = content.replace(/const 待验证优选URL = url.searchParams.get\('url'\);/g, "const urlToVerify = url.searchParams.get('url');");
content = content.replace(/await 请求优选API\(\[待验证优选URL\],/g, 'await 请求优选API([urlToVerify],');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed');
