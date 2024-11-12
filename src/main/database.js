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

async function initDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(app.getPath('userData'), 'projects.sqlite');
        const database = new sqlite3.Database(dbPath, async (err) => {
            if (err) return reject(err);

            try {
                db = promisifyDB(database);

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