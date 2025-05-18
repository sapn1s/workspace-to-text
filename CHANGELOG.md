# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.1] - 2025-05-18

### Added
- Ability to rename project

### Improved
- Large directory checking no longer scans all files, much more efficient/faster.

## [1.3.0] - 2025-05-15

### Added
- 🔍 **Enhanced Search Functionality**
  - Project search in the main project list page
  - Exclusion search for better pattern management

- 💬 **Improved User Experience**
  - Project deletion confirmation dialog for safer project management

### Improved
- 🏗️ **Frontend Architecture**
  - Restructured frontend file organization
  - Each page/component now has its own dedicated folder
  - Better code maintainability and organization

### Fixed
- 🛠️ **Pattern Management**
  - Temporarily hiding "include patterns" option due to functionality issues
  - Note: Same functionality can be achieved using exclude patterns only
- Various bug fixes and stability improvements

## [1.2.0] - 2025-02-22

### Added
- 📊 **File Size Analysis**
  - New analysis tab for visualizing file sizes
  - Detailed metrics for project files
  - Interactive size data explorer

- 🖥️ **Installer Support**
  - Windows installer package (NSIS)
  - Customizable installation options
  - Desktop and start menu shortcuts
  - Proper uninstaller with cleanup

- 📝 **Extended File Format Support**
  - Expanded text file type recognition (100+ formats)
  - Support for additional programming languages
  - Better handling of configuration files

### Improved
- 🔄 **Version Management**
  - Create versions from any project or version
  - Better parent-child relationship handling
  - Enhanced version switching UX

- 🧰 **Build Process**
  - Simplified release workflow
  - Improved artifact naming and publishing

- 🖌️ **UI Enhancements**
  - Tabbed interface for output and analysis views
  - Improved copy functionality

## [1.1.0] - 2024-11-27

### Added
- 🗂️ Project Management System
  - Project-specific settings

- 📁 Enhanced File Explorer
  - Interactive file tree visualization
  - Context menu for file/folder actions
  - Real-time directory scanning
  - Visual exclusion indicators

- 🔍 Advanced Filtering System
  - Common exclusion patterns library
  - Built-in pattern suggestions
  - Visual feedback for excluded items

- ⚡ Performance Features
  - Size limit warnings for large projects
  - Directory size analysis
  - Memory optimization
  - Smart file type detection

### Changed
- Enhanced pattern configuration panel
- Added project version management

## [1.0.0] - 2024-03-15

### Added
- Multiple project support with SQLite storage
- Basic project workspace to text conversion
- Simple file filtering system
- Basic file tree visualization
- File type detection
- Copy to clipboard functionality
- Support for .gitignore files
- Basic pattern-based inclusion/exclusion
- Project versioning with named snapshots


[Unreleased]: https://github.com/sapn1s/workspace-to-text/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/sapn1s/workspace-to-text/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/sapn1s/workspace-to-text/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/sapn1s/workspace-to-text/releases/tag/v1.1.0
[1.0.0]: https://github.com/sapn1s/workspace-to-text/releases/tag/v1.0.0