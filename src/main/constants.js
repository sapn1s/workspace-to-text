const DEFAULT_EXCLUDES = [
    '/.git/**',
    '/.git',
    '/node_modules/**',
    '/node_modules',
    '/.next/**',
    '/.next',
    '/build/**',
    '/build',
    '/dist/**',
    '/dist',
    '/.vscode/**',
    '/.vscode',
    '/.idea/**',
    '/.idea'
];

const TEXT_EXTENSIONS = new Set([
    'txt', 'js', 'jsx', 'ts', 'tsx', 'md', 'json', 'yml',
    'yaml', 'css', 'scss', 'less', 'html', 'xml', 'svg',
    'env', 'config', 'lock', 'map', 'vue', 'php', 'py',
    'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go',
    'rs', 'sql', 'sh', 'bash', 'conf', 'ini', 'gitignore',
    'dockerignore', 'editorconfig', 'eslintrc', 'prettierrc'
]);

const BINARY_EXTENSIONS = new Set([
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov',
    'dll', 'exe', 'so', 'dylib'
]);

exports.DEFAULT_EXCLUDES = DEFAULT_EXCLUDES;
exports.TEXT_EXTENSIONS = TEXT_EXTENSIONS;
exports.BINARY_EXTENSIONS = BINARY_EXTENSIONS;