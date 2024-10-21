const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, clipboard } = electron;
const path = require('path');
const fs = require('fs');
const ignore = require('ignore');
const mime = require('mime-types');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(app.getPath('userData'), 'projects.sqlite');
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        db.serialize(() => {
          // Create the projects table if it doesn't exist
          db.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            path TEXT
          )`, (err) => {
            if (err) reject(err);
          });
  
          // Check if include_patterns and exclude_patterns columns exist, add if they don't
          db.all("PRAGMA table_info(projects)", (err, rows) => {
            if (err) reject(err);
            
            const columnNames = rows.map(row => row.name);
  
            if (!columnNames.includes('include_patterns')) {
              db.run("ALTER TABLE projects ADD COLUMN include_patterns TEXT", (err) => {
                if (err) reject(err);
              });
            }
  
            if (!columnNames.includes('exclude_patterns')) {
              db.run("ALTER TABLE projects ADD COLUMN exclude_patterns TEXT", (err) => {
                if (err) reject(err);
              });
            }
          });
  
          resolve();
        });
      });
    });
  }

function registerIpcHandlers() {
  ipcMain.handle('open-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('analyze-project', async (event, projectId, projectPath, includePatterns, excludePatterns) => {
    await updateProjectPatterns(projectId, includePatterns, excludePatterns);
    return analyzeProject(projectPath, includePatterns, excludePatterns);
  });

  ipcMain.handle('create-project', async (event, name) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO projects (name) VALUES (?)', [name], function(err) {
        if (err) reject(err);
        resolve(this.lastID);
      });
    });
  });

  ipcMain.handle('get-projects', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM projects', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  });

  ipcMain.handle('set-project-path', async (event, id, path) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE projects SET path = ? WHERE id = ?', [path, id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  });

  ipcMain.handle('get-project-patterns', async (event, projectId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT include_patterns, exclude_patterns FROM projects WHERE id = ?', [projectId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  });

  ipcMain.handle('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('deleteProject', async (event, projectId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM projects WHERE id = ?', [projectId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  });
}

async function createWindow() {
  await initDatabase();

  const isDev = await import('electron-is-dev').then(module => module.default);

  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  mainWindow.on('closed', () => (mainWindow = null));

  registerIpcHandlers();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Project analysis logic
function analyzeProject(rootDir, includePatterns, excludePatterns) {
  const gitignoreRules = readGitignore(rootDir);
  const ig = ignore().add(gitignoreRules);

  // Add exclude patterns to ignore rules
  if (excludePatterns) {
    ig.add(excludePatterns.split(',').map(pattern => pattern.trim()));
  }

  let output = `Project path: ${rootDir}\n\n`;
  output += 'Directory Structure:\n';
  output += traverseDirectory(rootDir, 0, rootDir, ig, includePatterns);
  output += '\nFile Contents:\n';

  const allFilePaths = getAllFilePaths(rootDir, rootDir, ig, includePatterns);
  allFilePaths.forEach(filePath => {
    output += `\n--- ${filePath} ---\n`;
    output += getFileContent(path.join(rootDir, filePath));
    output += '\n';
  });

  return output;
}

function readGitignore(rootDir) {
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    return fs.readFileSync(gitignorePath, 'utf8').split('\n').filter(line => line.trim() !== '');
  }
  return [];
}

function shouldIgnore(ig, filePath, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  return ig.ignores(relativePath) || path.basename(filePath).startsWith('.');
}

function isTextFile(filePath) {
  const mimeType = mime.lookup(filePath);
  const textBasedExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.md', '.txt', '.json', '.yml', '.yaml', 
    '.css', '.scss', '.html', '.xml', '.svg', '.config', '.env'
  ];
  
  return mimeType && (
    mimeType.startsWith('text/') || 
    mimeType === 'application/json' ||
    textBasedExtensions.includes(path.extname(filePath).toLowerCase())
  );
}

function shouldInclude(filePath, includePatterns) {
  if (!includePatterns) return true;
  const patterns = includePatterns.split(',').map(pattern => pattern.trim());
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filePath);
  });
}

function traverseDirectory(dir, level = 0, rootDir, ig, includePatterns) {
  let output = '';
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const relativePath = path.relative(rootDir, filePath);

    if (!ig.ignores(relativePath) && shouldInclude(relativePath, includePatterns)) {
      if (stats.isDirectory()) {
        output += `${'  '.repeat(level)}📁 ${file}\n`;
        output += traverseDirectory(filePath, level + 1, rootDir, ig, includePatterns);
      } else if (isTextFile(filePath)) {
        output += `${'  '.repeat(level)}📄 ${file}\n`;
      }
    }
  });

  return output;
}

function getFileContent(filePath) {
  if (!isTextFile(filePath)) {
    return '[Non-text file not displayed]';
  }
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return `Error reading file: ${error.message}`;
  }
}

function getAllFilePaths(dir, rootDir, ig, includePatterns, result = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const relativePath = path.relative(rootDir, filePath);

    if (!ig.ignores(relativePath) && shouldInclude(relativePath, includePatterns)) {
      if (stats.isDirectory()) {
        getAllFilePaths(filePath, rootDir, ig, includePatterns, result);
      } else if (isTextFile(filePath)) {
        result.push(relativePath);
      }
    }
  });

  return result;
}

async function updateProjectPatterns(projectId, includePatterns, excludePatterns) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE projects SET include_patterns = ?, exclude_patterns = ? WHERE id = ?',
      [includePatterns, excludePatterns, projectId],
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
}