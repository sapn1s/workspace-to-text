# Workspace to Text (WTT)

WTT is an Electron-based desktop application that converts your project workspace into text format for analysis, documentation, or AI model input. It provides intelligent file filtering, versioning, and pattern-based exclusions. More features to come in later versions.

## Features

- 🗂️ Interactive project explorer
- 🔍 Pattern-based file inclusion/exclusion
- 📋 Copy-to-clipboard functionality
- 🔄 Project versioning support
- 🌲 Visual file tree navigation
- ⚡ Fast local processing
- 🎯 Smart file type detection
- 🚫 Built-in ignore patterns for common artifacts
- 📝 Automatic `.gitignore` support

## Installation

Pre-built binaries for Windows, macOS, and Linux will be available for download soon.

For development:
```bash
# Clone the repository
git clone https://github.com/sapn1s/workspace-to-text.git

# Install dependencies
npm install

# Start the development server
npm start
```

For a production build:
```bash
npm run build
```

## Usage

1. Create a new project
2. Select your project directory
3. Configure include/exclude patterns (optional)
4. Click "Analyze" to generate text output
5. Do whatever you need with the output e.g. passing to LLM

Additional features:
- Use the project explorer to view and manage files
- Create versions to track different states of your codebase
- `.gitignore` files in your projects are automatically respected

### Pattern Examples

Include specific files:
```
src/**/*.js
*.tsx
components/*.jsx
```

Exclude common directories:
```
node_modules
.git
dist
```

## Development

### Prerequisites

- Node.js >= 18
- npm >= 9

### Project Structure

- `/src` - React application source
- `/public` - Electron main process
- `/scripts` - Build scripts
- `/components` - React components

### Scripts

- `npm start` - Start development server
- `npm run react-start` - Start React development server
- `npm run electron-build` - Build Electron application
- `npm run build` - Full production build

## License

This software is dual-licensed:

1. For Non-Commercial Use: [Creative Commons Attribution-NonCommercial 4.0 International](http://creativecommons.org/licenses/by-nc/4.0/)
2. For Commercial Use: All rights reserved by sapn1s. Contact for licensing.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request