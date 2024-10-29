const fs = require('fs');
const path = require('path');

// Ensure the build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}

// Clean up any previous sqlite3 binaries
const sqliteBinaryPath = path.join('build', 'sqlite3.node');
if (fs.existsSync(sqliteBinaryPath)) {
  fs.unlinkSync(sqliteBinaryPath);
}

// Copy sqlite3 binary to build directory
const sourcePath = path.join('node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node');
if (fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, sqliteBinaryPath);
}