const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The messed up strings:
// text-theme-primary 300, 400, etc.
// bg-theme-primary / 500/10
// border-theme-primary / 500/20

code = code.replace(/text-theme-primary \d00/g, 'text-theme-primary');
code = code.replace(/bg-theme-primary \/ \d00/g, 'bg-theme-primary');
code = code.replace(/border-theme-primary \/ \d00/g, 'border-theme-primary');

// also replace selection:bg-theme-primary / 500/30 -> selection:bg-theme-primary/30
code = code.replace(/selection:bg-theme-primary \/ \d00/g, 'selection:bg-theme-primary');

fs.writeFileSync('src/App.tsx', code);
