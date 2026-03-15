const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { normalizeEmail, validateSignupInput } = require("./authValidation");
const {
    normalizeLoginInput,
    userAlreadyExists,
    loginUserExists
} = require("./authHelpers");

const app = express();
const PORT = 3000;

// SQLite database file
const dbPath = path.join(__dirname, "users.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

// Create users table if it does not exist
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
`);

// Temporary in-memory user store (replaced by SQLite)
//const users = [];

// Middleware
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5500",
    credentials: true
}));

app.use(session({
    secret: "group11-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Test route
app.get("/", (req, res) => {
    res.send("Backend is running.");
});

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
    let { email, password, confirmPassword } = req.body;
    email = normalizeEmail(email);

    const validationError = validateSignupInput(email, password, confirmPassword);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    db.get("SELECT id FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) {
            console.error("Database lookup error:", err.message);
            return res.status(500).json({ message: "Database error." });
        }

        if (userAlreadyExists(row)) {
            return res.status(409).json({ message: "User already exists." });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                [email, hashedPassword],
                function (insertErr) {
                    if (insertErr) {
                        console.error("Insert error:", insertErr.message);
                        return res.status(500).json({ message: "Could not create user." });
                    }

                    return res.status(201).json({ message: "Signup successful." });
                }
            );
        } catch (hashErr) {
            console.error("Hashing error:", hashErr.message);
            return res.status(500).json({ message: "Server error." });
        }
    });
});

// Signup route using in-memory user store (replaced by SQLite)
//app.post("/api/auth/signup", (req, res) => {
//const { email, password, confirmPassword } = req.body;

//if (!email || !password || !confirmPassword) {
//return res.status(400).json({ message: "All fields are required." });
//}

//if (password !== confirmPassword) {
//return res.status(400).json({ message: "Passwords do not match." });
//}

// specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
//if (!specialCharRegex.test(password)) {
//return res.status(400).json({ message: "Password must contain at least one special character." });
//}

//const existingUser = users.find(user => user.email === email);
//if (existingUser) {
//return res.status(409).json({ message: "User already exists." });
//}

//users.push({ email, password });
//res.status(201).json({ message: "Signup successful." });
//});

// LOGIN
app.post("/api/auth/login", (req, res) => {
    let { email, password } = req.body;
    email = normalizeLoginInput(email);

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    db.get(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        [email],
        async (err, user) => {
            if (err) {
                console.error("Database lookup error:", err.message);
                return res.status(500).json({ message: "Database error." });
            }

            if (!loginUserExists(user)) {
                return res.status(401).json({ message: "Invalid email or password." });
            }

            try {
                const passwordMatches = await bcrypt.compare(password, user.password_hash);

                if (!passwordMatches) {
                    return res.status(401).json({ message: "Invalid email or password." });
                }

                req.session.user = {
                    id: user.id,
                    email: user.email
                };

                return res.json({
                    message: "Login successful.",
                    user: req.session.user
                });
            } catch (compareErr) {
                console.error("Password comparison error:", compareErr.message);
                return res.status(500).json({ message: "Server error." });
            }
        }
    );
});

// Login route using in-memory user store (replaced by SQLite)
//app.post("/api/auth/login", (req, res) => {
//const { email, password } = req.body;

//const user = users.find(user => user.email === email && user.password === password);

//if (!user) {
//return res.status(401).json({ message: "Invalid email or password." });
//}

//req.session.user = { email: user.email };
//res.json({ message: "Login successful.", user: req.session.user });
//});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destroy error:", err.message);
            return res.status(500).json({ message: "Logout failed." });
        }

        res.json({ message: "Logout successful." });
    });
});

// Logout route using in-memory user store (replaced by SQLite)
//app.post("/api/auth/logout", (req, res) => {
//req.session.destroy(err => {
//if (err) {
//return res.status(500).json({ message: "Logout failed." });
//}
//res.json({ message: "Logout successful." });
//});
//});

// CURRENT USER
app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    return res.json({ user: req.session.user });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});