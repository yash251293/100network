import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'dev.db');

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`Created directory: ${DB_DIR}`);
}

let db: Database | null = null;

async function initializeDatabaseSchema(dbInstance: Database) {
  const createUserTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' NOT NULL, -- New column
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUpdatedAtTriggerSQL = `
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `;

  try {
    await dbInstance.exec(createUserTableSQL);
    await dbInstance.exec(createUpdatedAtTriggerSQL);
    console.log('User table and trigger initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

export async function getDbConnection() {
  if (!db) {
    try {
      console.log(`Attempting to open database at: ${DB_PATH}`);
      db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });
      console.log('Database connection established.');
      // Initialize the schema
      await initializeDatabaseSchema(db);
    } catch (error) {
      console.error('Failed to open database connection or initialize schema:', error);
      db = null; // Reset db instance on failure
      throw error; // Re-throw the error to indicate failure
    }
  }
  return db;
}

export async function closeDbConnection() {
  if (db) {
    try {
      await db.close();
      db = null;
      console.log('Database connection closed.');
    } catch (error) {
      console.error('Failed to close database connection:', error);
      throw error; // Re-throw the error
    }
  }
}
