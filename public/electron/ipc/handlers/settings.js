const { ipcMain } = require('electron');

class SettingsHandlers {
  constructor(db) {
    this.db = db;
  }

  register() {
    ipcMain.handle('settings:get', this.getAppSetting.bind(this));
    ipcMain.handle('settings:set', this.setAppSetting.bind(this));
    ipcMain.handle('settings:updateProject', this.updateProjectSettings.bind(this));
  }

  async getAppSetting(_, key) {
    try {
      const result = await this.db.getAsync(
        'SELECT value FROM app_settings WHERE key = ?',
        [key]
      );
      return result ? result.value : null;
    } catch (error) {
      console.error('Error getting app setting:', error);
      throw error;
    }
  }

  async setAppSetting(_, { key, value }) {
    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        [key, value]
      );
      return true;
    } catch (error) {
      console.error('Error setting app setting:', error);
      throw error;
    }
  }

  async updateProjectSettings(_, { projectId, settings }) {
    try {
      await this.db.runAsync(
        'UPDATE projects SET respect_gitignore = ?, ignore_dotfiles = ? WHERE id = ?',
        [
          Number(settings.respectGitignore),
          Number(settings.ignoreDotfiles),
          projectId
        ]
      );
      return true;
    } catch (error) {
      console.error('Error updating project settings:', error);
      throw error;
    }
  }
}

module.exports = { SettingsHandlers };
