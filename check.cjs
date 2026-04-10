const fs = require('fs');
const buffer = fs.readFileSync('./functions/[[path]].js');
console.log(buffer.slice(0, 10));
