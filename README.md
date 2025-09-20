# Workspace to Text (WTT)

A desktop application that converts your project workspace into formatted text output, ideal for documentation, analysis, or AI model input. WTT provides intelligent file filtering, project versioning, and a visual file explorer to help you manage and analyze your codebase.

## Screenshots

### Main Projects Page
<img src="screenshots/main-page.png" width="600" alt="Main Projects Page"/>

### Project Explorer and Analysis
<img src="screenshots/project-view.png" width="600" alt="Main Projects Page"/>

### Size Warning Dialog
<img src="screenshots/size-warning.png" width="600" alt="Main Projects Page"/>

## Features

- **Project Management**
  - Create and manage multiple projects
  - Version control for projects with named snapshots
  - Project-specific settings and configurations

- **File Explorer**
  - Interactive file tree visualization
  - Real-time directory scanning
  - Context menu for quick actions
  - Visual indicators for excluded files/folders

- **Smart Filtering**
  - Pattern-based file inclusion/exclusion
  - Built-in common exclusion patterns
  - .gitignore integration
  - Dot-files handling

- **Module System**
  - Create reusable pattern collections
  - Share modules across project versions
  - Module dependencies and hierarchies
  - Version-specific module toggling

- **Dependency Analysis**
  - Interactive dependency visualization
  - Multiple layout options (hierarchical, force-directed, circular)
  - Node categorization and search functionality
  - Opens in separate popup windows

- **LLM Prompts Integration**
  - Context Optimizer for intelligent file exclusion based on feature development
  - Custom prompt templates for reusable AI interactions
  - Automatic analysis result integration with prompts
  - Copy exclusions functionality for permanent pattern application

- **File Analysis**
  - File size visualization and metrics
  - Size limit warnings for large projects
  - Comprehensive file type detection (100+ formats)
  - Directory size analysis

- **Performance & Safety**
  - Intelligent memory usage optimization
  - Tabbed interface for output and analysis
  - Better handling of large codebases

## Getting Started

### Installation

#### Windows
- Download the installer (WTT-Setup-x.x.x.exe) from the [releases page](https://github.com/sapn1s/workspace-to-text/releases)
- Run the installer and follow the prompts
- Alternatively, download the portable version if you prefer not to install

#### Development Setup
```bash
# Clone the repository
git clone https://github.com/sapn1s/workspace-to-text.git

# Install dependencies
npm install

# Start development
npm start

# Build for production
npm run electron-build
```

## Usage

1. **Create a Project**
   - Click the "New project" input field
   - Enter a project name
   - Press Enter or click the plus icon

2. **Configure Project**
   - Select your project folder
   - Configure project settings:
     - Respect .gitignore
     - Ignore dot files
   - Set include/exclude patterns

3. **Pattern Configuration**
   Include specific files:
   ```
   src/**/*.js
   *.tsx
   components/*.jsx
   ```
   
   Exclude directories/files:
   ```
   node_modules
   .git
   dist
   ```

4. **Module Management**
   - Create reusable pattern collections
   - Share modules across project versions
   - Toggle modules per version
   - Build dependency hierarchies

5. **Version Management**
   - Create versions to track different states
   - Switch between versions
   - Each version maintains its own settings

6. **LLM Prompts**
   - Use Context Optimizer for feature-focused analysis
   - Create custom prompt templates
   - Copy combined prompt + analysis to AI tools
   - Apply temporary exclusions based on AI recommendations

7. **Dependency Analysis**
   - Click "Dependencies" to open interactive graph
   - Explore relationships between files
   - Filter and search dependencies
   - Multiple visualization layouts

8. **Analysis**
   - Click "Analyze" to process your workspace
   - Review size warnings if applicable
   - Switch between output text and size analysis tabs
   - Copy output to clipboard
   - Pass the output to LLM or whatever is your usecase

### File Types
The application automatically detects and processes over 100 text file types including:
- Source code (.js, .jsx, .ts, .tsx, etc.)
- Configuration files (.json, .yml, .env, etc.)
- Documentation (.md, .txt)
- Web files (.html, .css, .svg)
- Game development files (.gd, .tscn, .unity)
- And many more specialized formats