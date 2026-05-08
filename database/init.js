/**
 * Database Initialization using sql.js (pure JavaScript SQLite)
 * Sets up tables and seeds default admin
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

const DB_PATH = path.join(__dirname, 'secureauthx.db');

let db = null;

// Helper: persist DB to disk
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Ensure database directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'failure')),
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Seed default admin
  const adminCheck = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const passwordHash = bcrypt.hashSync('Admin@12345', 12);
    const secret = speakeasy.generateSecret({
      name: 'SecureAuthX:admin',
      issuer: 'SecureAuthX'
    });

    db.run(
      `INSERT INTO users (username, email, password_hash, role, totp_secret, totp_enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', 'admin@secureauthx.com', passwordHash, 'admin', secret.base32, 0]
    );
    console.log('✓ Default admin account created (admin / Admin@12345)');
  }

  saveDb();
  console.log('✓ Database initialized successfully');

  // Auto-save every 5 seconds
  setInterval(saveDb, 5000);

  return db;
}

// ─── Query Helpers (matching better-sqlite3 API surface) ────────

const dbHelper = {
  // Get the raw db instance (must be initialized first)
  getDb() {
    return db;
  },

  // Run a statement (INSERT, UPDATE, DELETE)
  run(sql, params = []) {
    db.run(sql, params);
    // Read metadata BEFORE saveDb (export resets sql.js internal state)
    const idStmt = db.prepare("SELECT last_insert_rowid() as id");
    idStmt.step();
    const idRow = idStmt.getAsObject();
    idStmt.free();
    const chStmt = db.prepare("SELECT changes() as changes");
    chStmt.step();
    const chRow = chStmt.getAsObject();
    chStmt.free();
    saveDb();
    return {
      lastInsertRowid: idRow.id || 0,
      changes: chRow.changes || 0
    };
  },

  // Get one row
  get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  },

  // Get all rows
  all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
};

module.exports = { initDatabase, dbHelper, saveDb };
