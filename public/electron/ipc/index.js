const { getDatabase } = require('../database');
const { ProjectHandlers } = require('./handlers/project');
const { AnalysisHandlers } = require('./handlers/analysis');
const { FileSystemHandlers } = require('./handlers/fileSystem');
const { SettingsHandlers } = require('./handlers/settings');
const { PatternHandlers } = require('./handlers/patterns');
const { ModuleHandlers } = require('./handlers/modules');
const { DependencyHandlers } = require('./handlers/dependencies');

function registerIpcHandlers(mainWindow) {
  const db = getDatabase();

  // Initialize and register all handlers
  const projectHandlers = new ProjectHandlers(db);
  const analysisHandlers = new AnalysisHandlers(db);
  const fileSystemHandlers = new FileSystemHandlers(db, mainWindow);
  const settingsHandlers = new SettingsHandlers(db);
  const patternHandlers = new PatternHandlers(db);
  const moduleHandlers = new ModuleHandlers(db);
  const dependencyHandlers = new DependencyHandlers(db);

  projectHandlers.register();
  analysisHandlers.register();
  fileSystemHandlers.register();
  settingsHandlers.register();
  patternHandlers.register();
  moduleHandlers.register();
  dependencyHandlers.register();
}

module.exports = { registerIpcHandlers };

