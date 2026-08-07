const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(getFiles(full));
      }
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

const htmlFiles = getFiles('.');
console.log('HTML files:', htmlFiles);

const eventAttrs = ['onclick', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onsubmit'];
const fnNames = new Set();

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  eventAttrs.forEach(attr => {
    const regex = new RegExp(attr + '="([^"]+)"', 'gi');
    let m;
    while ((m = regex.exec(content)) !== null) {
      const expr = m[1];
      // Extract function names using regex
      const fns = expr.match(/([a-zA-Z0-9_$]+)\s*\(/g);
      if (fns) {
        fns.forEach(f => fnNames.add(f.replace('(', '').trim()));
      }
    }
  });
});

console.log('ALL HTML event functions used across project:');
fnNames.forEach(f => console.log('  -', f));
