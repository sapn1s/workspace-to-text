const { getDatabase } = require('../database');
const { ProjectHandlers } = require('./handlers/project');
const { AnalysisHandlers } = require('./handlers/analysis');
const { FileSystemHandlers } = require('./handlers/fileSystem');
const { SettingsHandlers } = require('./handlers/settings');
const registerModuleHandlers = require('./registerModuleHandlers');

function registerIpcHandlers(mainWindow) {
  const db = getDatabase();

  // Initialize and register all handlers
  const projectHandlers = new ProjectHandlers(db);
  const analysisHandlers = new AnalysisHandlers(db);
  const fileSystemHandlers = new FileSystemHandlers(db, mainWindow);
  const settingsHandlers = new SettingsHandlers(db);

  // Register module handlers
  registerModuleHandlers(db);

  projectHandlers.register();
  analysisHandlers.register();
  fileSystemHandlers.register();
  settingsHandlers.register();
}

module.exports = { registerIpcHandlers };

