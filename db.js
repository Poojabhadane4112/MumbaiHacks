const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'fincoach.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with users table
const initDatabase = () => {
    db.serialize(() => {
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                mobile TEXT UNIQUE,
                password TEXT NOT NULL,
                passkey TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active INTEGER DEFAULT 1
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('✅ Database initialized successfully');
            }
        });

        // Create user_sessions table for tracking logins
        db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Create OTP table for password reset (SMS)
        db.run(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identifier TEXT NOT NULL,
                otp TEXT NOT NULL,
                otp_token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                is_used INTEGER DEFAULT 0,
                attempts INTEGER DEFAULT 0,
                verified_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create passkey verification table
        db.run(`
            CREATE TABLE IF NOT EXISTS passkey_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                passkey_token TEXT NOT NULL,
                is_used INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL
            )
        `);

        // Create email OTP table
        db.run(`
            CREATE TABLE IF NOT EXISTS email_otp_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identifier TEXT NOT NULL,
                otp TEXT NOT NULL,
                otp_token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                is_used INTEGER DEFAULT 0,
                attempts INTEGER DEFAULT 0,
                verified_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create financial_profiles table
        db.run(`
            CREATE TABLE IF NOT EXISTS financial_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                employment_status TEXT NOT NULL,
                monthly_income REAL NOT NULL,
                additional_income TEXT,
                additional_income_amount REAL DEFAULT 0,
                housing_cost REAL NOT NULL,
                utilities REAL NOT NULL,
                transportation REAL NOT NULL,
                groceries REAL NOT NULL,
                other_expenses REAL DEFAULT 0,
                total_debt REAL DEFAULT 0,
                monthly_debt_payment REAL DEFAULT 0,
                current_savings REAL DEFAULT 0,
                emergency_fund REAL DEFAULT 0,
                goals TEXT,
                savings_goal REAL DEFAULT 0,
                time_horizon TEXT,
                risk_tolerance TEXT,
                total_income REAL,
                total_expenses REAL,
                net_income REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
    });
};

// Database query helpers
const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

module.exports = {
    db,
    initDatabase,
    dbQuery,
    dbRun,
    dbGet
};
