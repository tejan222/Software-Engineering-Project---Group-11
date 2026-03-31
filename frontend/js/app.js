console.log("JS loaded!")
let currentConversationId = null;

// SIGN UP
async function signupUser(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    try {
        const response = await fetch("http://localhost:3000/api/auth/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                password,
                confirmPassword
            })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Signup error:", error);
        alert("Could not connect to backend.");
    }
}

// LOGIN
async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Could not connect to backend.");
    }
}

// LOGOUT
async function logoutUser() {
    try {
        const response = await fetch("http://localhost:3000/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("Could not connect to backend.");
    }
}

// SHOW LOGIN STATUS ON INDEX PAGE
async function checkLoginStatus() {
    const statusElement = document.getElementById("authStatus");
    const logoutButton = document.getElementById("logoutButton");
    const loginButton = document.getElementById("loginButton");
    const signupButton = document.getElementById("signupButton");
    const historyButton = document.getElementById("historyButton");

    if (!statusElement) {
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/api/auth/me", {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            statusElement.textContent = `Logged in as: ${data.user.email}`;

            if (logoutButton) {
                logoutButton.style.display = "inline-block";
            }
            if (loginButton) {
                loginButton.style.display = "none";
            }
            if (signupButton) {
                signupButton.style.display = "none";
            }
            if (historyButton) {
                historyButton.style.display = "inline-block";
            }
        } else {
            statusElement.textContent = "Not logged in.";

            if (logoutButton) {
                logoutButton.style.display = "none";
            }
            if (loginButton) {
                loginButton.style.display = "inline-block";
            }
            if (signupButton) {
                signupButton.style.display = "inline-block";
            }
            if (historyButton) {
                historyButton.style.display = "none";
            }
        }
    } catch (error) {
        console.error("Login status error:", error);
        statusElement.textContent = "Could not connect to backend.";
    }
}

// SEND PROMPT TO BACKEND / OLLAMA
async function sendPrompt() {
    const promptInput = document.getElementById("promptInput");
    const chatBox = document.getElementById("chatBox");

    if (!promptInput || !chatBox) return;

    const prompt = promptInput.value.trim();

    if (!prompt) {
        alert("Please enter a prompt.");
        return;
    }

    try {
        // User message
        chatBox.innerHTML += `<p><strong>You:</strong> ${prompt}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        // Loading element
        const loadingElement = document.createElement("p");
        chatBox.appendChild(loadingElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Animated dots
        let dots = 0;
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            loadingElement.innerHTML = `<strong>LLM:</strong> Loading${".".repeat(dots)}`;
        }, 500);

        // Send request
        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                prompt,
                conversationId: currentConversationId
            })
        });

        const data = await response.json();

        if (data.conversationId) {
            currentConversationId = data.conversationId;
        }

        clearInterval(interval);

        if (!response.ok) {
            loadingElement.innerHTML = `<strong>LLM:</strong> Error: ${data.message}`;
            return;
        }

        // Final response
        loadingElement.innerHTML = `<strong>LLM:</strong> ${data.reply}`;
        chatBox.scrollTop = chatBox.scrollHeight;

        promptInput.value = "";
    } catch (error) {
        clearInterval(interval);
        console.error("Chat error:", error);
        loadingElement.innerHTML = `<strong>LLM:</strong> Error: Could not connect.`;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

async function loadHistory() {
    const historyList = document.getElementById("historyList");

    if (!historyList) {
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/api/history", {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            historyList.innerHTML = `<p>${data.message || "Could not load history."}</p>`;
            return;
        }

        if (!data.conversations.length) {
            historyList.innerHTML = "<p>No saved conversations yet.</p>";
            return;
        }

        historyList.innerHTML = data.conversations.map(conversation => `
            <div class="history-item">
                <a href="conversation.html?id=${conversation.id}">
                    ${conversation.title}
                </a>
                <span>${formatDate(conversation.updated_at)}</span>
            </div>
        `).join("");
    } catch (error) {
        console.error("Load history error:", error);
        historyList.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

async function searchHistory() {
    const input = document.getElementById("historySearchInput");
    const historyList = document.getElementById("historyList");

    if (!input || !historyList) {
        return;
    }

    const q = input.value.trim();

    if (!q) {
        resetHistory();
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3000/api/history/search?q=${encodeURIComponent(q)}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            historyList.innerHTML = `<p>${data.message || "Search failed."}</p>`;
            return;
        }

        if (!data.conversations.length) {
            historyList.innerHTML = "<p>No matching conversations found.</p>";
            return;
        }

        historyList.innerHTML = data.conversations.map(conversation => `
            <div class="history-item">
                <a href="conversation.html?id=${conversation.id}">
                    ${conversation.title}
                </a>
                <span>${formatDate(conversation.updated_at)}</span>
            </div>
        `).join("");

        const backButton = document.getElementById("historyBackButton");
        if (backButton) {
            backButton.style.display = "inline-block";
        }
    } catch (error) {
        console.error("Search history error:", error);
        historyList.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

async function loadConversation() {
    const chatBox = document.getElementById("chatBox");
    const titleElement = document.getElementById("conversationTitle");

    if (!chatBox || !titleElement) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("id");

    if (!conversationId) {
        titleElement.textContent = "New Chat";
        currentConversationId = null;
        return;
    }

    currentConversationId = conversationId;

    try {
        const response = await fetch(`http://localhost:3000/api/history/${conversationId}`, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            chatBox.innerHTML = `<p>${data.message || "Could not load conversation."}</p>`;
            return;
        }

        titleElement.textContent = data.conversation.title;

        chatBox.innerHTML = data.messages.map(message => `
            <p>
                <strong>${message.sender === "user" ? "You" : "LLM"}:</strong>
                ${message.content}
            </p>
        `).join("");

        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Load conversation error:", error);
        chatBox.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

function startNewChat() {
    window.location.href = "conversation.html";
}

function resetHistory() {
    const input = document.getElementById("historySearchInput");
    const backButton = document.getElementById("historyBackButton");

    if (input) {
        input.value = "";
    }

    if (backButton) {
        backButton.style.display = "none";
    }

    loadHistory(); // reload full conversation list
}

document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    loadHistory();
    loadConversation();
});