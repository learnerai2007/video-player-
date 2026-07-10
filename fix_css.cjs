const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(/rgba\(99, 102, 241, (.*?)\)/g, 'rgba(var(--theme-color-primary-rgb), $1)');

fs.writeFileSync('src/index.css', code);
