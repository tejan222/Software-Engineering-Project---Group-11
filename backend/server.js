const fetch = require("node-fetch");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { normalizeEmail, validateSignupInput } = require("./authValidation");
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODELS = ["qwen2.5:7b", "mistral:latest", "gemma:7b"];
// const MODELS = ["mistral"];

// const fetch = require("node-fetch");
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

// Create conversations table if it does not exist
db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

// Modify Conversations Table to store numLLMs as well
db.run(`ALTER TABLE conversations ADD COLUMN num_llms INTEGER DEFAULT 1`,
    (err) => {
        if (err) {
            console.log("num_llms column already exists (safe to ignore)");
        }
    });

// Create messages table if it does not exist
db.run(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
`);

// Temporary in-memory user store (replaced by SQLite)
//const users = [];

// Middleware
app.use(express.json());

app.use(cors({
    origin: "http://localhost:8080",
    credentials: true
}));

app.use(session({
    secret: "group11-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.post("/api/test-login", (req, res) => {
    req.session.user = {
        id: 1,
        email: "test@test.com"
    };

    res.json({ message: "Test login successful" });
});

// Test Session Bypass
// Added this to ensure that when /api/chat require authentication:
// this middleware will login for the jasmine unit tests
//if (process.env.NODE_ENV === "test") {
//}

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

// CHAT WITH OLLAMA
app.post("/api/chat", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    // const { prompt, conversationId } = req.body;
    const { prompt, conversationId, numLLMs } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required." });
    }

    const userId = req.session.user.id;
    const trimmedPrompt = prompt.trim();

    try {
        const selectedModels = MODELS.slice(0, numLLMs || 1);

        if (process.env.NODE_ENV === "test") {
            const fakeResponses = selectedModels.map(model => ({
                model,
                content: `mock response from ${model}`
            }));

            const longest = fakeResponses.reduce((max, curr) => {
                return curr.content.length > max.content.length ? curr : max;
            }, fakeResponses[0]);

            const title =
                trimmedPrompt.length > 40
                    ? trimmedPrompt.slice(0, 40) + "..."
                    : trimmedPrompt;

            db.run(
                "INSERT INTO conversations (user_id, title, num_llms) VALUES (?, ?, ?)",
                [userId, title, selectedModels.length],
                function (err) {
                    if (err) {
                        return res.status(500).json({ message: "Could not create conversation." });
                    }

                    const conversationId = this.lastID;

                    db.run(
                        "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                        [conversationId, "user", trimmedPrompt]
                    );

                    fakeResponses.forEach(r => {
                        db.run(
                            "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                            [conversationId, r.model, r.content]
                        );
                    });

                    return res.json({
                        message: "Chat successful.",
                        replies: fakeResponses,
                        longestResponse: longest,
                        conversationId
                    });

                }
            );

            return;
        }

        // Test-mode bypass
        // Replaces AI calls with mock AI calls - that way jasmine test
        // Does not need to rely on Ollama server being on
        /*if (process.env.NODE_ENV === "test") {
            const fakeResponses = selectedModels.map(model => ({
                model,
                content: `mock response from ${model}`
            }));

            return res.json({
                message: "Chat successful.",
                replies: fakeResponses,
                conversationId: 1
            });
        }*/
        ///

        const llmResponses = await Promise.all(
            selectedModels.map(async (model) => {
                const ollamaResponse = await fetch(OLLAMA_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "user", content: trimmedPrompt }],
                        stream: false
                    })
                });

                if (!ollamaResponse.ok) {
                    console.error(`Error from ${model}`);
                    return { model, content: "Error from model" };
                }

                const data = await ollamaResponse.json();

                return {
                    model,
                    content: data.message?.content || "No response"
                };

            })
        );

        const replies = llmResponses.map(r => ({
            model: r.model,
            content: r.content
        }));

        const longest = replies.reduce((max, curr) => {
            return curr.content.length > max.content.length ? curr : max;
        }, replies[0]);

        // Save Messages function
        const saveMessages = (activeConversationId) => {
            db.run(
                "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                [activeConversationId, "user", trimmedPrompt],
                function (err) {
                    if (err) {
                        console.error("User message error:", err.message);
                        return res.status(500).json({ message: "Failed to save user message." });

                    }

                    llmResponses.forEach(r => {
                        db.run(
                            "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                            [activeConversationId, r.model, r.content],
                            (err2) => {
                                if (err2) {
                                    console.error("LLM save error:", err2.message);
                                }
                            }
                        );
                    });

                    db.run(
                        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        [activeConversationId],
                        (err3) => {
                            if (err3) {
                                console.error("Update error:", err3.message);
                            }

                            return res.json({
                                message: "Chat successful.",
                                replies,
                                longestResponse: longest,
                                conversationId: activeConversationId
                            });
                        }
                    );
                }
            );
        };

        if (conversationId) {
            db.get(
                "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                [conversationId, userId],
                (err, row) => {
                    if (err) {
                        return res.status(500).json({ message: "Database error." });
                    }
                    if (!row) {
                        return res.status(404).json({ message: "Conversation not found." });
                    }

                    db.run(
                        "UPDATE conversations SET num_llms = ? WHERE id = ?",
                        [selectedModels.length, conversationId],
                        (err) => {
                            if (err) console.error("num_llms update error:", err);
                        }
                    );

                    saveMessages(conversationId);
                }
            );
        }
        else {
            const title =
                trimmedPrompt.length > 40
                    ? trimmedPrompt.slice(0, 40) + "..."
                    : trimmedPrompt;

            db.run(
                "INSERT INTO conversations (user_id, title, num_llms) VALUES (?, ?, ?)",
                [userId, title, selectedModels.length],
                function (err) {
                    if (err) {
                        return res.status(500).json({ message: "Could not create conversation." });
                    }
                    saveMessages(this.lastID);
                }
            );
        }
    } catch (error) {
        console.error("Ollama connection error:", error.message);
        return res.status(500).json({
            message: "Could not connect to local Ollama."
        });
    }
});

app.get("/api/history", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const numLLMs = req.query.numLLMs ? parseInt(req.query.numLLMs) : null;

    let query = `
        SELECT id, title, created_at, updated_at, num_llms
        FROM conversations
        WHERE user_id = ?
    `;

    const params = [req.session.user.id];

    if (numLLMs !== null && !isNaN(numLLMs)) {
        query += " AND num_llms = ?";
        params.push(numLLMs);
    }

    query += " ORDER BY updated_at DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("History fetch error:", err.message);
            return res.status(500).json({ message: "Database error." });
        }

        return res.json({ conversations: rows });
    });
});

app.get("/api/history/search", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const query = (req.query.q || "").trim();

    if (!query) {
        return res.json({ conversations: [] });
    }

    db.all(
        `SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at
         FROM conversations c
         JOIN messages m ON c.id = m.conversation_id
         WHERE c.user_id = ?
           AND (c.title LIKE ? OR m.content LIKE ?)
         ORDER BY c.updated_at DESC`,
        [req.session.user.id, `%${query}%`, `%${query}%`],
        (err, rows) => {
            if (err) {
                console.error("History search error:", err.message);
                return res.status(500).json({ message: "Database error." });
            }

            return res.json({ conversations: rows });
        }
    );
});

app.get("/api/history/:id", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const conversationId = req.params.id;
    const userId = req.session.user.id;

    db.get(
        "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?",
        [conversationId, userId],
        (convErr, conversation) => {
            if (convErr) {
                console.error("Conversation fetch error:", convErr.message);
                return res.status(500).json({ message: "Database error." });
            }

            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found." });
            }

            db.all(
                `SELECT id, sender, content, created_at
                 FROM messages
                 WHERE conversation_id = ?
                 ORDER BY created_at ASC, id ASC`,
                [conversationId],
                (msgErr, messages) => {
                    if (msgErr) {
                        console.error("Messages fetch error:", msgErr.message);
                        return res.status(500).json({ message: "Database error." });
                    }

                    return res.json({
                        conversation,
                        messages
                    });
                }
            );
        }
    );
});

/*app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});*/

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = { app, db };
