const fs = require('fs');
const buffer = fs.readFileSync('./functions/[[path]].js');
for (let i = 0; i < buffer.length; i++) {
  if (buffer[i] === 0) {
    console.log('Null byte at index', i);
  }
}
