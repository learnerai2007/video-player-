const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/ring-indigo-500/g, 'ring-theme-primary');
code = code.replace(/shadow-indigo-500/g, 'shadow-theme-primary');
code = code.replace(/from-indigo-600/g, 'from-theme-primary');

fs.writeFileSync('src/App.tsx', code);
