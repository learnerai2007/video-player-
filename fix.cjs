const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/text-theme-primary \d00/g, 'text-theme-primary');
code = code.replace(/bg-theme-primary \/ \d00/g, 'bg-theme-primary');
code = code.replace(/border-theme-primary \/ \d00/g, 'border-theme-primary');
code = code.replace(/selection:bg-theme-primary \/ \d00/g, 'selection:bg-theme-primary');

fs.writeFileSync('src/App.tsx', code);
