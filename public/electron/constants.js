const TEXT_EXTENSIONS = new Set([
    // Web Development
    'txt', 'js', 'jsx', 'ts', 'tsx', 'md', 'json', 'yml', 'yaml',
    'css', 'scss', 'less', 'sass', 'styl', 'html', 'htm', 'xml', 'svg',
    'vue', 'svelte', 'astro', 'liquid', 'pug', 'jade', 'ejs', 'hbs', 'handlebars',
    'mjs', 'cjs', 'jsonc', 'webmanifest',

    // Configuration Files
    'env', 'config', 'lock', 'map', 'toml', 'ini', 'conf', 'cfg',
    'properties', 'prefs', 'htaccess', 'htpasswd', 'nginx', 'service',
    'gitignore', 'gitattributes', 'dockerignore', 'editorconfig',
    'eslintrc', 'prettierrc', 'stylelintrc', 'babelrc', 'browserslistrc',
    'npmrc', 'yarnrc', 'nvmrc',

    // Programming Languages
    'php', 'py', 'pyi', 'pyw', 'rb', 'rbw', 'java', 'class', 'c', 'cpp',
    'cc', 'cxx', 'h', 'hpp', 'hh', 'hxx', 'cs', 'go', 'rs', 'rlib',
    'swift', 'kt', 'kts', 'scala', 'sc', 'pl', 'pm', 'perl', 'r', 'm',
    'mm', 'f', 'for', 'f90', 'f95', 'f03', 'sql', 'mysql', 'pgsql',
    'lua', 'tcl', 'groovy', 'gradle', 'dart', 'ex', 'exs', 'erl', 'hrl',
    'clj', 'cljs', 'cljc', 'edn', 'fs', 'fsx', 'fsi', 'fsscript',
    'hs', 'lhs', 'elm', 'slim', 'haml', 'erb',

    // Shell Scripts
    'sh', 'bash', 'zsh', 'fish', 'command', 'bat', 'cmd', 'ps1', 'psm1',
    'psd1', 'vbs', 'vbe', 'wsf', 'wsc',

    // Documentation
    'rst', 'rest', 'asciidoc', 'adoc', 'asc', 'creole', 'wiki', 'mediawiki',
    'textile', 'rdoc', 'pod', 'man', 'mustache', 'nunjucks', 'njk',
    'twig', 'csv', 'tsv', 'org',

    // Build Systems & Package Managers
    'gradle', 'rake', 'make', 'makefile', 'dockerfile', 'cabal',
    'gemspec', 'podspec', 'gyp', 'gypi', 'cmake', 'ant',
    'pom', 'maven', 'ivy', 'nimble', 'sbt',

    // IDEs & Editors
    'project', 'workspace', 'sublime-project', 'sublime-workspace',
    'idea', 'iml', 'sln', 'suo', 'csproj', 'vbproj', 'vcxproj',
    'code-workspace',

    // Game Development
    'gd', 'tscn', 'unity', 'prefab', 'mat', 'shader', 'hlsl', 'glsl',
    'frag', 'vert', 'comp', 'metal',

    // Data Formats
    'graphql', 'gql', 'proto', 'avsc', 'thrift', 'prisma', 'apollo',
    'neon', 'reg', 'manifest', 'l10n'
]);

const BINARY_EXTENSIONS = new Set([
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov',
    'dll', 'exe', 'so', 'dylib'
]);

const DOT_FILE_EXCLUDES = [
    '.*',
    '.*/**'
];

const GIT_EXCLUDES = [
    '/.git/**',
    '/.git'
];

const SIZE_LIMITS = {
    FOLDER_FILE_COUNT: 500,    // Maximum number of files in a folder
    FILE_SIZE_MB: 1,          // Maximum size for a single text file in MB
    TOTAL_SIZE_MB: 50         // Maximum total size of all text files in MB
};

const COMMON_LARGE_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    '.git',
    'vendor',        // Common for PHP/Composer
    'target',        // Common for Java/Maven
    'packages',      // Common for monorepos
    '.next',         // Next.js build output
    'coverage',      // Test coverage reports
    'public/assets', // Built assets
];

module.exports = {
    TEXT_EXTENSIONS,
    BINARY_EXTENSIONS,
    DOT_FILE_EXCLUDES,
    GIT_EXCLUDES,
    SIZE_LIMITS,
    COMMON_LARGE_DIRECTORIES
};