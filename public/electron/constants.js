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
