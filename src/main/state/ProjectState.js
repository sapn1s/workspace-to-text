class ProjectState {
    constructor() {
        this.currentProjectPath = null;
    }

    setCurrentPath(path) {
        this.currentProjectPath = path;
    }

    getCurrentPath() {
        return this.currentProjectPath;
    }

    clearCurrentPath() {
        this.currentProjectPath = null;
    }
}

// Single instance to be shared across handlers
const projectState = new ProjectState();
module.exports = { projectState };