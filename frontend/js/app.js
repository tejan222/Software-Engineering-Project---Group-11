console.log("JS loaded!")

let currentConversationId = null;
let availableLLMs = [];
let selectedLLMs = [];
let isMultiMode = false;

// Load available LLMs from backend
async function loadAvailableLLMs() {
    try {
        const response = await fetch("http://localhost:3000/api/llms", {
            method: "GET",
            credentials: "include"
        });
        const data = await response.json();
        availableLLMs = data.llms;
        
        // Default select first LLM
        if (availableLLMs.length > 0) {
            selectedLLMs = [availableLLMs[0].id];
        }
        
        renderLLMCheckboxes();
    } catch (error) {
        console.error("Error loading LLMs:", error);
    }
}

// Render LLM checkboxes in the UI
function renderLLMCheckboxes() {
    const container = document.getElementById("llmCheckboxes");
    if (!container) return;
    
    container.innerHTML = availableLLMs.map(llm => `
        <label>
            <input type="checkbox" value="${llm.id}" 
                ${selectedLLMs.includes(llm.id) ? 'checked' : ''}
                onchange="toggleLLM('${llm.id}', this.checked)">
            ${llm.name}
        </label>
    `).join("");
}

// Toggle LLM selection
function toggleLLM(llmId, isChecked) {
    if (isChecked) {
        if (!selectedLLMs.includes(llmId)) {
            selectedLLMs.push(llmId);
        }
    } else {
        selectedLLMs = selectedLLMs.filter(id => id !== llmId);
    }
}

// Set chat mode
function setChatMode(multiMode) {
    isMultiMode = multiMode;
    const singleBtn = document.getElementById("singleModeBtn");
    const multiBtn = document.getElementById("multiModeBtn");
    
    if (singleBtn && multiBtn) {
        if (multiMode) {
            singleBtn.classList.remove("active");
            multiBtn.classList.add("active");
        } else {
            singleBtn.classList.add("active");
            multiBtn.classList.remove("active");
        }
    }
}

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
            if (logoutButton) logoutButton.style.display = "inline-block";
            if (loginButton) loginButton.style.display = "none";
            if (signupButton) signupButton.style.display = "none";
            if (historyButton) historyButton.style.display = "inline-block";
        } else {
            statusElement.textContent = "Not logged in.";
            if (logoutButton) logoutButton.style.display = "none";
            if (loginButton) loginButton.style.display = "inline-block";
            if (signupButton) signupButton.style.display = "inline-block";
            if (historyButton) historyButton.style.display = "none";
        }
    } catch (error) {
        console.error("Login status error:", error);
        statusElement.textContent = "Could not connect to backend.";
    }
}

// SEND PROMPT TO BACKEND (Supports both single and multi-LLM)
async function sendPrompt() {
    const promptInput = document.getElementById("promptInput");
    const chatBox = document.getElementById("chatBox");
    if (!promptInput || !chatBox) return;

    const prompt = promptInput.value.trim();
    if (!prompt) {
        alert("Please enter a prompt.");
        return;
    }

    // Validate LLM selection
    if (selectedLLMs.length === 0) {
        alert("Please select at least one LLM.");
        return;
    }

    try {
        // User message
        chatBox.innerHTML += `<div class="message user-message"><strong>You:</strong> ${escapeHtml(prompt)}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        // Loading element
        const loadingElement = document.createElement("div");
        loadingElement.className = "message llm-message";
        loadingElement.innerHTML = `<strong>LLMs:</strong> Loading responses...`;
        chatBox.appendChild(loadingElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        let response;
        if (isMultiMode && selectedLLMs.length > 1) {
            // Multi-LLM mode - query multiple LLMs in parallel
            response = await fetch("http://localhost:3000/api/chat/multi", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    prompt,
                    conversationId: currentConversationId,
                    llmIds: selectedLLMs
                })
            });
        } else {
            // Single LLM mode - use first selected LLM
            response = await fetch("http://localhost:3000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    prompt,
                    conversationId: currentConversationId,
                    llmId: selectedLLMs[0]
                })
            });
        }

        const data = await response.json();
        
        if (data.conversationId) {
            currentConversationId = data.conversationId;
        }

        // Remove loading element
        loadingElement.remove();

        if (!response.ok) {
            chatBox.innerHTML += `<div class="message llm-message"><strong>Error:</strong> ${escapeHtml(data.message)}</div>`;
            return;
        }

        // Display responses based on mode
        if (data.replies) {
            // Multi-LLM response - show all replies
            const multiContainer = document.createElement("div");
            multiContainer.className = "multi-llm-container";
            multiContainer.innerHTML = `<div class="message llm-message"><strong>Responses from ${data.replies.length} LLMs:</strong></div>`;
            
            data.replies.forEach(reply => {
                const statusIcon = reply.success ? "✅" : "❌";
                multiContainer.innerHTML += `
                    <div class="message llm-message" style="margin-left: 30px;">
                        <div class="llm-header">${statusIcon} <strong>${escapeHtml(reply.llmName)}</strong></div>
                        <div>${escapeHtml(reply.reply)}</div>
                    </div>
                `;
            });
            chatBox.appendChild(multiContainer);
        } else {
            // Single LLM response
            chatBox.innerHTML += `<div class="message llm-message"><strong>LLM (${escapeHtml(data.llmUsed || "Qwen")}):</strong> ${escapeHtml(data.reply)}</div>`;
        }
        
        chatBox.scrollTop = chatBox.scrollHeight;
        promptInput.value = "";

    } catch (error) {
        console.error("Chat error:", error);
        const chatBox = document.getElementById("chatBox");
        if (chatBox) {
            chatBox.innerHTML += `<div class="message llm-message"><strong>Error:</strong> Could not connect to backend.</div>`;
        }
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

async function loadHistory() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

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
                    ${escapeHtml(conversation.title)}
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
    if (!input || !historyList) return;

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
                    ${escapeHtml(conversation.title)}
                </a>
                <span>${formatDate(conversation.updated_at)}</span>
            </div>
        `).join("");
        
        const backButton = document.getElementById("historyBackButton");
        if (backButton) backButton.style.display = "inline-block";
    } catch (error) {
        console.error("Search history error:", error);
        historyList.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

async function loadConversation() {
    const chatBox = document.getElementById("chatBox");
    const titleElement = document.getElementById("conversationTitle");
    if (!chatBox || !titleElement) return;

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
        
        chatBox.innerHTML = data.messages.map(message => {
            if (message.sender === "user") {
                return `<div class="message user-message"><strong>You:</strong> ${escapeHtml(message.content)}</div>`;
            } else {
                const llmName = message.llm_id ? getLLMName(message.llm_id) : "LLM";
                return `<div class="message llm-message"><strong>${escapeHtml(llmName)}:</strong> ${escapeHtml(message.content)}</div>`;
            }
        }).join("");
        
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Load conversation error:", error);
        chatBox.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

function getLLMName(llmId) {
    const llm = availableLLMs.find(l => l.id === llmId);
    return llm ? llm.name : llmId;
}

function startNewChat() {
    window.location.href = "conversation.html";
}

function resetHistory() {
    const input = document.getElementById("historySearchInput");
    const backButton = document.getElementById("historyBackButton");
    if (input) input.value = "";
    if (backButton) backButton.style.display = "none";
    loadHistory();
}

// Initialize page based on current page
document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    
    // Load LLMs if on conversation page
    if (document.getElementById("llmCheckboxes")) {
        loadAvailableLLMs();
        
        // Setup mode buttons
        const singleBtn = document.getElementById("singleModeBtn");
        const multiBtn = document.getElementById("multiModeBtn");
        
        if (singleBtn) {
            singleBtn.addEventListener("click", () => setChatMode(false));
        }
        if (multiBtn) {
            multiBtn.addEventListener("click", () => setChatMode(true));
        }
        
        // Setup Enter key to send
        const promptInput = document.getElementById("promptInput");
        if (promptInput) {
            promptInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    sendPrompt();
                }
            });
        }
    }
    
    // Load history if on history page
    if (document.getElementById("historyList")) {
        loadHistory();
    }
    
    // Load conversation if on conversation page with ID
    if (document.getElementById("conversationTitle") && window.location.pathname.includes("conversation.html")) {
        loadConversation();
    }
});