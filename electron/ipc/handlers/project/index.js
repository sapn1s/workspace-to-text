// electron/ipc/handlers/project/index.js
const { ProjectCRUD } = require('./projectCRUD');
const { ProjectVersions } = require('./projectVersions');
const { ProjectSettings } = require('./projectSettings');

class ProjectHandlers {
    constructor(db) {
        this.db = db;
        this.projectCRUD = new ProjectCRUD(db);
        this.projectVersions = new ProjectVersions(db);
        this.projectSettings = new ProjectSettings(db);
    }

    register() {
        // Register all sub-handlers
        this.projectCRUD.register();
        this.projectVersions.register();
        this.projectSettings.register();
    }
}

module.exports = { ProjectHandlers };