const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'posts', '2026-04-19.html');
let text = fs.readFileSync(p, 'utf8');
text = text.replace(/\/assets\/covers\/2026-04-18\.png/g, '/assets/og/2026-04-19.png');
text = text.replace('alt="CyberPulse editorial cover image for The Half-Life of Exposure Is Shrinking"', 'alt="CyberPulse editorial visual for The Half-Life of Exposure Is Shrinking"');
fs.writeFileSync(p, text);
console.log('updated');
