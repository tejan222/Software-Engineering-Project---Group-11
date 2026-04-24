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

const {
    getAvailableLLMs,
    queryMultipleLLMs,
    queryAllLLMs,
    LLM_CONFIGS
} = require("./llmService");

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

// Create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
)`, (err) => {
    if (err) console.error("Users table error:", err.message);
    else console.log("Users table ready");
});

// Create conversations table
db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, (err) => {
    if (err) console.error("Conversations table error:", err.message);
    else console.log("Conversations table ready");
});

// Create messages table - FIXED VERSION with all columns
db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender TEXT NOT NULL CHECK(sender IN ('user', 'llm')),
    content TEXT NOT NULL,
    llm_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
)`, (err) => {
    if (err) console.error("Messages table error:", err.message);
    else console.log("Messages table ready");
});

// Verify tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) console.error("Table check error:", err);
    else console.log("Tables in database:", tables.map(t => t.name));
});

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

// ============ AUTH ROUTES ============

app.get("/", (req, res) => {
    res.send("Backend is running.");
});

// Get available LLMs
app.get("/api/llms", (req, res) => {
    const llms = getAvailableLLMs();
    res.json({ llms });
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

// CURRENT USER
app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }
    return res.json({ user: req.session.user });
});

// ============ MULTI-LLM CHAT ROUTES ============

// CHAT WITH SINGLE LLM - FIXED VERSION
app.post("/api/chat", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const { prompt, conversationId, llmId } = req.body;
    
    // Debug logging
    console.log("Chat request:", { prompt, conversationId, llmId, user: req.session.user.id });
    
    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required." });
    }

    const userId = req.session.user.id;
    const trimmedPrompt = prompt.trim();
    const targetLlmId = llmId || "qwen2.5:7b";

    try {
        // Query LLM
        const llmResult = await queryMultipleLLMs([targetLlmId], trimmedPrompt);
        const reply = llmResult[0].reply;
        
        console.log("LLM Response received, length:", reply.length);

        // Function to save messages
        const saveMessages = (activeConversationId) => {
            console.log("Saving messages to conversation:", activeConversationId);
            
            // Save user message
            db.run(
                "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                [activeConversationId, "user", trimmedPrompt],
                function (userMsgErr) {
                    if (userMsgErr) {
                        console.error("User message insert error:", userMsgErr.message);
                        return res.status(500).json({ 
                            message: "Could not save user message.",
                            error: userMsgErr.message 
                        });
                    }
                    console.log("User message saved, id:", this.lastID);
                    
                    // Save LLM response
                    db.run(
                        "INSERT INTO messages (conversation_id, sender, content, llm_id) VALUES (?, ?, ?, ?)",
                        [activeConversationId, "llm", reply, targetLlmId],
                        function (llmMsgErr) {
                            if (llmMsgErr) {
                                console.error("LLM message insert error:", llmMsgErr.message);
                                return res.status(500).json({ 
                                    message: "Could not save LLM message.",
                                    error: llmMsgErr.message 
                                });
                            }
                            console.log("LLM message saved, id:", this.lastID);
                            
                            // Update conversation timestamp
                            db.run(
                                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                [activeConversationId],
                                function (updateErr) {
                                    if (updateErr) {
                                        console.error("Conversation update error:", updateErr.message);
                                    }
                                    return res.json({
                                        message: "Chat successful.",
                                        reply: reply,
                                        conversationId: activeConversationId,
                                        llmUsed: targetLlmId
                                    });
                                }
                            );
                        }
                    );
                }
            );
        };

        // Handle existing or new conversation
        if (conversationId) {
            db.get(
                "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                [conversationId, userId],
                (findErr, row) => {
                    if (findErr) {
                        console.error("Conversation lookup error:", findErr.message);
                        return res.status(500).json({ message: "Database error." });
                    }
                    if (!row) {
                        return res.status(404).json({ message: "Conversation not found." });
                    }
                    saveMessages(conversationId);
                }
            );
        } else {
            // Create new conversation
            const title = trimmedPrompt.length > 40 ? `${trimmedPrompt.slice(0, 40)}...` : trimmedPrompt;
            db.run(
                "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
                [userId, title],
                function (convErr) {
                    if (convErr) {
                        console.error("Conversation insert error:", convErr.message);
                        return res.status(500).json({ message: "Could not create conversation." });
                    }
                    console.log("New conversation created, id:", this.lastID);
                    saveMessages(this.lastID);
                }
            );
        }
    } catch (error) {
        console.error("LLM connection error:", error.message);
        return res.status(500).json({
            message: "Could not connect to LLM service.",
            error: error.message
        });
    }
});

// Chat with multiple LLMs simultaneously
app.post("/api/chat/multi", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const { prompt, conversationId, llmIds } = req.body;
    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required." });
    }
    if (!llmIds || !llmIds.length) {
        return res.status(400).json({ message: "At least one LLM must be selected." });
    }

    const userId = req.session.user.id;
    const trimmedPrompt = prompt.trim();

    try {
        const results = await queryMultipleLLMs(llmIds, trimmedPrompt);
        
        const saveMessages = (activeConversationId) => {
            // Save user message
            db.run(
                "INSERT INTO messages (conversation_id, sender, content, llm_id) VALUES (?, ?, ?, ?)",
                [activeConversationId, "user", trimmedPrompt, null],
                function (userMsgErr) {
                    if (userMsgErr) {
                        console.error("User message insert error:", userMsgErr.message);
                        return res.status(500).json({ message: "Could not save user message." });
                    }
                    
                    // Save each LLM response
                    let savedCount = 0;
                    results.forEach((result) => {
                        db.run(
                            "INSERT INTO messages (conversation_id, sender, content, llm_id) VALUES (?, ?, ?, ?)",
                            [activeConversationId, "llm", result.reply, result.llmId],
                            function (llmMsgErr) {
                                if (llmMsgErr) {
                                    console.error("LLM message insert error:", llmMsgErr.message);
                                }
                                savedCount++;
                                if (savedCount === results.length) {
                                    db.run(
                                        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                        [activeConversationId],
                                        function (updateErr) {
                                            if (updateErr) {
                                                console.error("Conversation update error:", updateErr.message);
                                            }
                                            return res.json({
                                                message: "Multi-LLM chat successful.",
                                                replies: results,
                                                conversationId: activeConversationId
                                            });
                                        }
                                    );
                                }
                            }
                        );
                    });
                }
            );
        };

        if (conversationId) {
            db.get(
                "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                [conversationId, userId],
                (findErr, row) => {
                    if (findErr) {
                        console.error("Conversation lookup error:", findErr.message);
                        return res.status(500).json({ message: "Database error." });
                    }
                    if (!row) {
                        return res.status(404).json({ message: "Conversation not found." });
                    }
                    saveMessages(conversationId);
                }
            );
        } else {
            const title = trimmedPrompt.length > 40 ? `${trimmedPrompt.slice(0, 40)}...` : trimmedPrompt;
            db.run(
                "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
                [userId, title],
                function (convErr) {
                    if (convErr) {
                        console.error("Conversation insert error:", convErr.message);
                        return res.status(500).json({ message: "Could not create conversation." });
                    }
                    saveMessages(this.lastID);
                }
            );
        }
    } catch (error) {
        console.error("Multi-LLM connection error:", error.message);
        return res.status(500).json({
            message: "Could not connect to LLM services."
        });
    }
});

// ============ HISTORY ROUTES ============

app.get("/api/history", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    db.all(
        `SELECT id, title, created_at, updated_at
         FROM conversations
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
        [req.session.user.id],
        (err, rows) => {
            if (err) {
                console.error("History fetch error:", err.message);
                return res.status(500).json({ message: "Database error." });
            }
            return res.json({ conversations: rows });
        }
    );
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
                `SELECT id, sender, content, llm_id, created_at
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});