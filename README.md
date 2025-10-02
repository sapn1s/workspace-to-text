# Workspace to Text (WTT)

A desktop application that converts your project workspace into formatted text output, ideal for documentation, analysis, or AI model input.

## Screenshots

### Project Explorer and Analysis
<img src="screenshots/project-view.png" width="600" alt="Main Projects Page"/>

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
npm run build
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

5. **Version Management**
   - Create versions to create different context for the same project e.g. "admin dashboard", "frontentd-only", "authentication system"
   - Each version maintains its own settings and patterns

6. **LLM Prompts**
   - Context Optimizer allows more focused context for a feature you want to work on
   - Module creator provides you with information on how the current context could be split into modules
   - Create custom prompt templates

7. **Dependency Analysis**
   - Click "Dependencies" to open interactive graph
   - Explore relationships between files

8. **Analysis**
   - Click "Analyze" to process your workspace
   - Review size warnings if applicable
   - Switch between output text and size analysis tabs
   - Copy output to clipboard
   - Pass the output to LLM or whatever is your usecase

### File Types
The application automatically detects and processes text files, including:
- **Explicitly supported**: Over 100 file types including source code (.js, .jsx, .ts, .tsx), configuration files (.json, .yml, .env), documentation (.md, .txt), web files (.html, .css, .svg), game development files (.gd, .tscn, .unity), and many more
- **Auto-detected**: Additional text file types detected via MIME type analysis
- **Excluded**: Binary files (.exe, .dll, .pdf, images, videos, etc.)