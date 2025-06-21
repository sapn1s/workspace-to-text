// public/electron/dependencyAnalyzer.js
const path = require('path');
const fsSync = require('fs');
const { isTextFile, normalizeRelativePath } = require('./fileUtils');
const { analyzeProject } = require('./analyzer');

// Import patterns by file extension
const IMPORT_PATTERNS = {
  // JavaScript/TypeScript
  '.js': [
    // ES6 imports
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"`]([^'"`]+)['"`]/g,
    // CommonJS require
    /require\(['"`]([^'"`]+)['"`]\)/g,
    // Dynamic imports
    /import\(['"`]([^'"`]+)['"`]\)/g,
    // Re-exports
    /export\s+(?:{[^}]*}|\*)\s+from\s+['"`]([^'"`]+)['"`]/g
  ],
  '.jsx': [
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"`]([^'"`]+)['"`]/g,
    /require\(['"`]([^'"`]+)['"`]\)/g,
    /import\(['"`]([^'"`]+)['"`]\)/g,
    /export\s+(?:{[^}]*}|\*)\s+from\s+['"`]([^'"`]+)['"`]/g
  ],
  '.ts': [
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"`]([^'"`]+)['"`]/g,
    /require\(['"`]([^'"`]+)['"`]\)/g,
    /import\(['"`]([^'"`]+)['"`]\)/g,
    /export\s+(?:{[^}]*}|\*)\s+from\s+['"`]([^'"`]+)['"`]/g
  ],
  '.tsx': [
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"`]([^'"`]+)['"`]/g,
    /require\(['"`]([^'"`]+)['"`]\)/g,
    /import\(['"`]([^'"`]+)['"`]\)/g,
    /export\s+(?:{[^}]*}|\*)\s+from\s+['"`]([^'"`]+)['"`]/g
  ],
  '.mjs': [
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s+['"`]([^'"`]+)['"`]/g,
    /import\(['"`]([^'"`]+)['"`]\)/g,
    /export\s+(?:{[^}]*}|\*)\s+from\s+['"`]([^'"`]+)['"`]/g
  ],
  '.cjs': [
    /require\(['"`]([^'"`]+)['"`]\)/g
  ],

  // Python
  '.py': [
    // Standard imports
    /^import\s+([^\s,#]+)/gm,
    // From imports
    /^from\s+([^\s]+)\s+import/gm,
    // Relative imports
    /^from\s+(\.+[^\s]*)\s+import/gm
  ],
  '.pyi': [
    /^import\s+([^\s,#]+)/gm,
    /^from\s+([^\s]+)\s+import/gm,
    /^from\s+(\.+[^\s]*)\s+import/gm
  ],
  '.pyw': [
    /^import\s+([^\s,#]+)/gm,
    /^from\s+([^\s]+)\s+import/gm,
    /^from\s+(\.+[^\s]*)\s+import/gm
  ]
};

// Common file extensions to try when resolving imports
const RESOLUTION_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
  python: ['.py', '.pyi', '.pyw']
};

// Index files to try
const INDEX_FILES = {
  javascript: ['index.js', 'index.jsx', 'index.ts', 'index.tsx'],
  python: ['__init__.py']
};

function getFileLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    return 'javascript';
  }

  if (['.py', '.pyi', '.pyw'].includes(ext)) {
    return 'python';
  }

  return null;
}

function extractImportsFromFile(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  const patterns = IMPORT_PATTERNS[ext];

  if (!patterns) {
    return [];
  }

  const imports = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath && importPath.trim()) {
        imports.push(importPath.trim());
      }
    }
  }

  return [...new Set(imports)]; // Remove duplicates
}

function resolveImportPath(importPath, currentFile, projectRoot) {
  // External package (doesn't start with . or /)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return { type: 'external', resolved: importPath };
  }

  // Resolve relative imports
  if (importPath.startsWith('.')) {
    const currentDir = path.dirname(currentFile);
    const resolvedPath = path.resolve(currentDir, importPath);
    const relativeToPproject = normalizeRelativePath(resolvedPath, projectRoot);

    // Get file language to determine extensions to try
    const language = getFileLanguage(currentFile);
    if (!language) {
      return { type: 'unresolved', resolved: relativeToPproject };
    }

    const extensions = RESOLUTION_EXTENSIONS[language];
    const indexFiles = INDEX_FILES[language];

    // FIXED: Check if the import already has an extension
    const hasExtension = path.extname(importPath) !== '';
    
    if (hasExtension) {
      // If the import already has an extension, try it as-is first
      const fullPath = path.join(projectRoot, relativeToPproject);
      if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isFile()) {
        return { type: 'internal', resolved: relativeToPproject };
      }
    } else {
      // Try with various extensions only if no extension was provided
      for (const ext of extensions) {
        const withExt = relativeToPproject + ext;
        const fullPath = path.join(projectRoot, withExt);
        if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isFile()) {
          return { type: 'internal', resolved: withExt };
        }
      }
    }

    // Try as directory with index files (only if no extension was provided)
    if (!hasExtension) {
      const dirPath = path.join(projectRoot, relativeToPproject);
      if (fsSync.existsSync(dirPath) && fsSync.statSync(dirPath).isDirectory()) {
        for (const indexFile of indexFiles) {
          const indexPath = path.join(dirPath, indexFile);
          if (fsSync.existsSync(indexPath) && fsSync.statSync(indexPath).isFile()) {
            const relativeIndexPath = path.join(relativeToPproject, indexFile).replace(/\\/g, '/');
            return { type: 'internal', resolved: relativeIndexPath };
          }
        }
      }
    }

    return { type: 'unresolved', resolved: relativeToPproject };
  }

  // Absolute path
  const relativeToPproject = normalizeRelativePath(importPath, projectRoot);
  const fullPath = path.join(projectRoot, relativeToPproject);

  if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isFile()) {
    return { type: 'internal', resolved: relativeToPproject };
  }

  return { type: 'unresolved', resolved: relativeToPproject };
}

function getAllFilePaths(dir, rootDir, ig) {
  const results = [];

  try {
    const files = fsSync.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fsSync.statSync(filePath);
      const relativePath = normalizeRelativePath(filePath, rootDir);
      const pathForIgnore = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');

      if (!ig.ignores(pathForIgnore)) {
        if (stats.isDirectory()) {
          results.push(...getAllFilePaths(filePath, rootDir, ig));
        } else if (isTextFile(filePath)) {
          // Only include files that have import patterns defined
          const ext = path.extname(filePath).toLowerCase();
          if (IMPORT_PATTERNS[ext]) {
            results.push(filePath);
          }
        }
      }
    });
  } catch (error) {
    console.warn(`Error reading directory ${dir}:`, error.message);
  }

  return results;
}

async function analyzeDependencies(rootDir, excludePatterns, settings = {}) {
  const ignore = require('ignore');
  const { DOT_FILE_EXCLUDES, GIT_EXCLUDES } = require('./constants');
  const { readGitignore, normalizePattern } = require('./fileUtils');

  const ig = ignore();

  // Add gitignore rules if enabled (reuse same logic as analyzer)
  if (settings.respectGitignore !== false) {
    const gitignoreRules = readGitignore(rootDir);
    ig.add(gitignoreRules);
    ig.add(GIT_EXCLUDES);
  }

  // Add dotfile excludes if enabled
  if (settings.ignoreDotfiles !== false) {
    ig.add(DOT_FILE_EXCLUDES);
  }

  // Add user-specified excludes
  if (excludePatterns) {
    const patterns = excludePatterns.split(',').map(normalizePattern);
    ig.add(patterns);
  }

  // Get all relevant files
  const allFiles = getAllFilePaths(rootDir, rootDir, ig);

  const dependencies = {
    internal: [],
    external: [],
    unresolved: [],
    stats: {
      totalFiles: allFiles.length,
      internalDeps: 0,
      externalDeps: 0,
      unresolvedDeps: 0
    }
  };

  const externalPackages = new Set();
  const internalFiles = new Set();

  // Process each file
  for (const filePath of allFiles) {
    try {
      const content = fsSync.readFileSync(filePath, 'utf8');
      const imports = extractImportsFromFile(filePath, content);
      const relativeFilePath = normalizeRelativePath(filePath, rootDir);

      internalFiles.add(relativeFilePath);

      for (const importPath of imports) {
        const resolved = resolveImportPath(importPath, filePath, rootDir);

        const dependency = {
          from: relativeFilePath,
          to: resolved.resolved,
          type: 'import'
        };

        dependencies[resolved.type].push(dependency);

        if (resolved.type === 'external') {
          externalPackages.add(resolved.resolved);
          dependencies.stats.externalDeps++;
        } else if (resolved.type === 'internal') {
          dependencies.stats.internalDeps++;
        } else {
          dependencies.stats.unresolvedDeps++;
        }
      }
    } catch (error) {
      console.warn(`Error processing file ${filePath}:`, error.message);
    }
  }

  // Build graph structure
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  // Add internal file nodes
  for (const file of internalFiles) {
    const fileName = path.basename(file);
    const node = {
      id: file,
      label: fileName,
      type: 'file',
      path: file,
      imports: 0,
      importedBy: 0
    };
    nodes.push(node);
    nodeMap.set(file, node);
  }

  // Add external package nodes (optional, can be filtered in UI)
  for (const pkg of externalPackages) {
    const node = {
      id: pkg,
      label: pkg,
      type: 'external',
      imports: 0,
      importedBy: 0
    };
    nodes.push(node);
    nodeMap.set(pkg, node);
  }

  // Add edges and update import counts
  let edgeId = 0;
  for (const dep of [...dependencies.internal, ...dependencies.external]) {
    const edge = {
      id: `edge-${edgeId++}`,
      from: dep.from,
      to: dep.to,
      type: dep.type
    };
    edges.push(edge);

    // Update import counts
    const fromNode = nodeMap.get(dep.from);
    const toNode = nodeMap.get(dep.to);

    if (fromNode) fromNode.imports++;
    if (toNode) toNode.importedBy++;
  }

  dependencies.graph = { nodes, edges };

  return dependencies;
}

module.exports = {
  analyzeDependencies
};