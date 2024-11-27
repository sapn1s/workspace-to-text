const { app } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

let db;

function promisifyDB(db) {
    db.getAsync = promisify(db.get).bind(db);
    db.allAsync = promisify(db.all).bind(db);
    db.runAsync = promisify(db.run).bind(db);
    return db;
}

async function addColumnIfNotExists(db, table, column, type, defaultValue) {
    try {
        // Check if column exists
        await db.getAsync(`SELECT ${column} FROM ${table} LIMIT 1`);
    } catch (error) {
        // Column doesn't exist, add it
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} DEFAULT ${defaultValue}`);
    }
}

async function initDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(app.getPath('userData'), 'projects.sqlite');
        const database = new sqlite3.Database(dbPath, async (err) => {
            if (err) return reject(err);

            try {
                db = promisifyDB(database);

                // Create projects table
                await db.runAsync(`
                    CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT,
                        path TEXT,
                        include_patterns TEXT,
                        exclude_patterns TEXT,
                        parent_id INTEGER NULL,
                        version_name TEXT NULL,
                        FOREIGN KEY(parent_id) REFERENCES projects(id)
                    )
                `);

                // Add new columns if they don't exist
                await addColumnIfNotExists(db, 'projects', 'respect_gitignore', 'INTEGER', 1);
                await addColumnIfNotExists(db, 'projects', 'ignore_dotfiles', 'INTEGER', 1);

                // Create app settings table
                await db.runAsync(`
                    CREATE TABLE IF NOT EXISTS app_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT
                    );
                `);

                resolve(db);
            } catch (error) {
                console.error('Database initialization error:', error);
                reject(error);
            }
        });
    });
}

exports.initDatabase = initDatabase;
exports.getDatabase = () => db;
