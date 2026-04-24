const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "users.db");
const db = new sqlite3.Database(dbPath);

// Check tables schema
db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error("Error:", err);
        return;
    }
    console.log("\n=== DATABASE SCHEMA ===\n");
    tables.forEach(table => {
        console.log(`Table: ${table.name}`);
        console.log(table.sql);
        console.log("---");
    });
    
    // Check messages table columns
    db.all("PRAGMA table_info(messages)", (err, columns) => {
        console.log("\n=== MESSAGES TABLE COLUMNS ===\n");
        columns.forEach(col => {
            console.log(`${col.name}: ${col.type} ${col.notnull ? "NOT NULL" : ""}`);
        });
        db.close();
    });
});