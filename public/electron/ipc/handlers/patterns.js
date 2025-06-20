// public/electron/ipc/handlers/patterns.js

const { ipcMain } = require('electron');
const { PatternResolutionService } = require('../../services/PatternResolutionService');

class PatternHandlers {
    constructor(db) {
        this.db = db;
        this.patternService = new PatternResolutionService(db);
    }

    register() {
        ipcMain.handle('patterns:resolve', this.resolvePatterns.bind(this));
    }

    async resolvePatterns(_, { projectId }) {
        try {
            return await this.patternService.resolveProjectPatterns(projectId);
        } catch (error) {
            console.error('Error resolving patterns:', error);
            throw error;
        }
    }
}

module.exports = { PatternHandlers };