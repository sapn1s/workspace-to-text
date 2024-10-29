const fs = require('fs');
const path = require('path');

// Clean up temporary files
const tempDirs = [
  path.join('dist', 'win-unpacked'),
  path.join('dist', 'win-ia32-unpacked')
];

tempDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});