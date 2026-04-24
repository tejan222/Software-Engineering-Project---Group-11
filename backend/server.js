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
    resolveThreeLLMModelsFromLists,
    getFallbackBestIndex,
    buildJudgePrompt,
    parseJudgeReply,
    selectJudgeModel
} = require("./llmHelpers");

const OLLAMA_CHAT_URL = "http://localhost:11434/api/chat";
const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";
const OLLAMA_PRIMARY_MODEL = process.env.OLLAMA_PRIMARY_MODEL || "qwen2.5:7b";
const DEFAULT_THREE_LLM_MODELS = [
    process.env.OLLAMA_MODEL_1 || "qwen2.5:7b",
    process.env.OLLAMA_MODEL_2 || "llama3.2:3b",
    process.env.OLLAMA_MODEL_3 || "mistral:7b"
];

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

// helper
async function getLLMReply(promptText, modelName = OLLAMA_PRIMARY_MODEL) {
    const ollamaResponse = await fetch(OLLAMA_CHAT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                {
                    role: "user",
                    content: promptText
                }
            ],
            stream: false
        })
    });

    if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        console.error("Ollama API error:", errorText);
        throw new Error("Ollama request failed.");
    }

    const ollamaData = await ollamaResponse.json();
    return ollamaData.message?.content || "";
}

async function getAvailableOllamaModels() {
    const response = await fetch(OLLAMA_TAGS_URL);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Ollama tags API error:", errorText);
        throw new Error("Could not fetch Ollama models.");
    }

    const data = await response.json();
    return (data.models || []).map((model) => model.name);
}

async function resolveThreeLLMModels() {
    const availableModels = await getAvailableOllamaModels();
    const selectedModels = resolveThreeLLMModelsFromLists(
        availableModels,
        DEFAULT_THREE_LLM_MODELS,
        3
    );

    if (selectedModels.length < 3) {
        throw new Error(
            "3-LLM mode needs at least three different Ollama models installed."
        );
    }

    return selectedModels.slice(0, 3);
}

async function pickBestReplyWithLLM(userPrompt, replies, judgeModel = OLLAMA_PRIMARY_MODEL) {
    const judgePrompt = buildJudgePrompt(userPrompt, replies);
    const judgeReply = await getLLMReply(judgePrompt, judgeModel);
    const parsedBestIndex = parseJudgeReply(judgeReply);

    if (parsedBestIndex === null) {
        console.warn("Judge model returned unexpected result:", judgeReply);
        return getFallbackBestIndex(replies);
    }

    return parsedBestIndex;
}

// CHAT WITH OLLAMA
app.post("/api/chat", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const { prompt, conversationId, useThreeLLM } = req.body;
    console.log("useThreeLLM from frontend:", useThreeLLM);

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required." });
    }

    const userId = req.session.user.id;
    const trimmedPrompt = prompt.trim();

    try {
        let result;

        if (useThreeLLM) {
            const modelNames = await resolveThreeLLMModels();
            const responses = await Promise.all(
                modelNames.map(async (modelName) => ({
                    model: modelName,
                    reply: await getLLMReply(trimmedPrompt, modelName)
                }))
            );
            const replies = responses.map((responseItem) => responseItem.reply);
            const judgeModel = selectJudgeModel(OLLAMA_PRIMARY_MODEL, modelNames);
            const bestIndex = await pickBestReplyWithLLM(trimmedPrompt, replies, judgeModel);

            result = { responses, bestIndex };
        } else {
            const reply = await getLLMReply(trimmedPrompt);
            result = { reply };
        }

        const saveMessages = (activeConversationId) => {
            db.run(
                "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                [activeConversationId, "user", trimmedPrompt],
                function (userMsgErr) {
                    if (userMsgErr) {
                        console.error("User message insert error:", userMsgErr.message);
                        return res.status(500).json({ message: "Could not save user message." });
                    }

                    if (useThreeLLM && result.responses) {
                        let completed = 0;
                        let hasError = false;

                        result.responses.forEach((responseItem, index) => {
                            const senderParts = [
                                `llm${index + 1}`,
                                responseItem.model
                            ];

                            if (index === result.bestIndex) {
                                senderParts.push("best");
                            }

                            const sender = senderParts.join("|");

                            db.run(
                                "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                                [activeConversationId, sender, responseItem.reply],
                                function (llmMsgErr) {
                                    if (hasError) return;

                                    if (llmMsgErr) {
                                        hasError = true;
                                        console.error("LLM message insert error:", llmMsgErr.message);
                                        return res.status(500).json({ message: "Could not save LLM messages." });
                                    }

                                    completed += 1;

                                    if (completed === result.responses.length) {
                                        db.run(
                                            "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                            [activeConversationId],
                                            function (updateErr) {
                                                if (updateErr) {
                                                    console.error("Conversation update error:", updateErr.message);
                                                }

                                                return res.json({
                                                    message: "Chat successful.",
                                                    responses: result.responses,
                                                    bestIndex: result.bestIndex,
                                                    conversationId: activeConversationId
                                                });
                                            }
                                        );
                                    }
                                }
                            );
                        });
                    } else {
                        db.run(
                            "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
                            [activeConversationId, "llm", result.reply],
                            function (llmMsgErr) {
                                if (llmMsgErr) {
                                    console.error("LLM message insert error:", llmMsgErr.message);
                                    return res.status(500).json({ message: "Could not save LLM message." });
                                }

                                db.run(
                                    "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                    [activeConversationId],
                                    function (updateErr) {
                                        if (updateErr) {
                                            console.error("Conversation update error:", updateErr.message);
                                        }

                                        return res.json({
                                            message: "Chat successful.",
                                            reply: result.reply,
                                            conversationId: activeConversationId
                                        });
                                    }
                                );
                            }
                        );
                    }
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
            const baseTitle = trimmedPrompt.length > 40
                ? `${trimmedPrompt.slice(0, 40)}...`
                : trimmedPrompt;

            const title = useThreeLLM ? `[3LLM] ${baseTitle}` : baseTitle;

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
        console.error("Ollama connection error:", error.message);
        return res.status(500).json({
            message: error.message || "Could not connect to local Ollama."
        });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
