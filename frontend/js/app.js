console.log("JS loaded!");
let currentConversationId = null;

function getSelectedModel() {
    const selected = document.querySelector('input[name="modelChoice"]:checked');
    if (!selected) return { publicModel: null, useThreeLLMs: false };

    const value = selected.value;
    if (value.startsWith("public-")) {
        return { publicModel: value.replace("public-", ""), useThreeLLMs: false };
    }
    return { publicModel: null, useThreeLLMs: false };
}

function toggleLocalModels(checkbox) {
    document.getElementById("localModels").style.display = checkbox.checked ? "block" : "none";
    if (checkbox.checked) {
        document.getElementById("usePublic").checked = false;
        document.getElementById("publicModels").style.display = "none";
    }
}

function togglePublicModels(checkbox) {
    document.getElementById("publicModels").style.display = checkbox.checked ? "block" : "none";
    if (checkbox.checked) {
        document.getElementById("useLocal").checked = false;
        document.getElementById("localModels").style.display = "none";
    }
}

function toggleSpecializedMode(checkbox) {
    document.getElementById("specializedOptions").style.display = checkbox.checked ? "block" : "none";
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

function renderMultiLLMResponses(responses, bestModel) {
    return responses.map(response => `
        <div class="llm-response-card ${response.model === bestModel ? "best-response" : ""}">
            <p>
                <strong>${response.model}</strong>
                ${response.model === bestModel ? " ⭐ Best Response" : ""}
            </p>
            <p>${response.reply}</p>
        </div>
    `).join("");
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function renderTurn(prompt, responses = [], bestModel = null) {
    const safePrompt = escapeHtml(prompt);
    const isMultiLLMTurn = responses.length > 1;

    const responsesHtml = responses.length
        ? responses.map(response => {
            const shouldHighlight = isMultiLLMTurn && response.model === bestModel;
            const bestLabel = shouldHighlight ? " ⭐ Best Response" : "";

            return `
                <div class="llm-response-card ${shouldHighlight ? "best-response" : ""}">
                    <p>
                        <strong>${escapeHtml(response.model)}</strong>${bestLabel}
                    </p>
                    <p>${escapeHtml(response.reply)}</p>
                </div>
            `;
        }).join("")
        : `<p><strong>LLM:</strong> No response available.</p>`;

    return `
        <div class="chat-turn">
            <div class="user-turn">
                <p><strong>You:</strong> ${safePrompt}</p>
            </div>
            <div class="llm-turn-group">
                ${responsesHtml}
            </div>
        </div>
    `;
}

function setThreeLLMToggleLocked(locked) {
    const threeLLMToggle = document.getElementById("threeLLMToggle");

    if (!threeLLMToggle) {
        return;
    }

    threeLLMToggle.disabled = locked;
}

// SEND PROMPT TO BACKEND / OLLAMA
async function sendPrompt() {
    const promptInput = document.getElementById("promptInput");
    const chatBox = document.getElementById("chatBox");
    const threeLLMToggle = document.getElementById("threeLLMToggle");

    if (!promptInput || !chatBox) {
        return;
    }

    const prompt = promptInput.value.trim();

    if (!prompt) {
        alert("Please enter a prompt.");
        return;
    }

    const threeLLMs = threeLLMToggle ? threeLLMToggle.checked : false;
    const { publicModel, useThreeLLMs } = threeLLMs ? { publicModel: null, useThreeLLMs: true } : getSelectedModel();

    let interval;
    let loadingTurn;

    try {
        loadingTurn = document.createElement("div");
        loadingTurn.className = "chat-turn";
        loadingTurn.innerHTML = `
            <div class="user-turn">
                <p><strong>You:</strong> ${escapeHtml(prompt)}</p>
            </div>
            <div class="llm-turn-group">
                <div class="llm-response-card">
                    <p><strong>LLM:</strong> Loading</p>
                </div>
            </div>
        `;

        chatBox.appendChild(loadingTurn);
        chatBox.scrollTop = chatBox.scrollHeight;

        let dots = 0;
        interval = setInterval(() => {
            dots = (dots + 1) % 4;
            const loadingCard = loadingTurn.querySelector(".llm-response-card");
            if (loadingCard) {
                loadingCard.innerHTML = `<p><strong>LLM:</strong> Loading${".".repeat(dots)}</p>`;
            }
        }, 500);
        
        
        const specializedMode = document.querySelector('input[name="specializedType"]:checked')?.value || null;



        let weatherContext = null;
        if (specializedMode === "weather") {
            const cityMatch = prompt.match(/in ([a-zA-Z\s]+?)(?:\?|$|today|tomorrow|this week)/i);
            const city = cityMatch ? cityMatch[1].trim() : prompt.trim();
    
            try {
                const weatherRes = await fetch("http://localhost:3000/api/weather", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ city })
                });
        
                if (weatherRes.ok) {
                    const weatherData = await weatherRes.json();
                    weatherContext = `Current weather in ${weatherData.city}: Temperature: ${weatherData.temperature}°F, Feels like: ${weatherData.feels_like}°F, Description: ${weatherData.description}, Humidity: ${weatherData.humidity}%, Wind speed: ${weatherData.wind_speed} mph`;
                }

            } catch (err) {
                console.error("Weather fetch error:", err);
            }
        }

        console.log("weatherContext:", weatherContext);
        console.log("specializedMode:", specializedMode);


        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",


            body: JSON.stringify({
                prompt,
                conversationId: currentConversationId,
                useThreeLLMs,
                publicModel,
                specializedMode,
                weatherContext
            })
        });

        const data = await response.json();
        if (data.conversationId) {
            const isBrandNewConversation = !currentConversationId;
            currentConversationId = data.conversationId;
            if (isBrandNewConversation) {
                const newUrl = `conversation.html?id=${data.conversationId}`;
                window.history.replaceState({}, "", newUrl);
                const titleElement = document.getElementById("conversationTitle");
                if (titleElement) {
                    titleElement.textContent = prompt.length > 40
                        ? `${prompt.slice(0, 40)}...`
                        : prompt;
                }
            }
            setThreeLLMToggleLocked(true);
        }

        if (interval) {
            clearInterval(interval);
        }

        if (!response.ok) {
            loadingTurn.innerHTML = `
                <div class="user-turn">
                    <p><strong>You:</strong> ${escapeHtml(prompt)}</p>
                </div>
                <div class="llm-turn-group">
                    <div class="llm-response-card">
                        <p><strong>LLM:</strong> Error: ${escapeHtml(data.message)}</p>
                    </div>
                </div>
            `;
            return;
        }

        const responses = data.responses || [
            {
                model: data.bestModel || "LLM",
                reply: data.reply || ""
            }
        ];

        loadingTurn.outerHTML = renderTurn(prompt, responses, data.bestModel);

        chatBox.scrollTop = chatBox.scrollHeight;
        promptInput.value = "";
    } catch (error) {
        if (interval) {
            clearInterval(interval);
        }

        console.error("Chat error:", error);

        if (loadingTurn) {
            loadingTurn.innerHTML = `
                <div class="user-turn">
                    <p><strong>You:</strong> ${escapeHtml(prompt)}</p>
                </div>
                <div class="llm-turn-group">
                    <div class="llm-response-card">
                        <p><strong>LLM:</strong> Error: Could not connect.</p>
                    </div>
                </div>
            `;
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function buildHistoryUrl(baseUrl, query = "", filterThreeLLMs = false) {
    const params = new URLSearchParams();

    if (query) {
        params.set("q", query);
    }

    if (filterThreeLLMs) {
        params.set("three", "true");
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function renderHistoryList(conversations) {
    const historyList = document.getElementById("historyList");

    if (!historyList) {
        return;
    }

    if (!conversations.length) {
        historyList.innerHTML = "<p>No matching conversations found.</p>";
        return;
    }

    historyList.innerHTML = conversations.map(conversation => `
        <div class="history-item">
            <a href="conversation.html?id=${conversation.id}">
                ${conversation.title} ${conversation.used_three_llms ? "[3 LLM]" : ""}
            </a>
            <span>${formatDate(conversation.updated_at)}</span>
        </div>
    `).join("");
}

async function loadHistory() {
    const historyList = document.getElementById("historyList");
    const threeLLMFilter = document.getElementById("threeLLMFilter");

    if (!historyList) {
        return;
    }

    const filterThreeLLMs = threeLLMFilter ? threeLLMFilter.checked : false;

    try {
        const url = buildHistoryUrl("http://localhost:3000/api/history", "", filterThreeLLMs);

        const response = await fetch(url, {
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

        renderHistoryList(data.conversations);
    } catch (error) {
        console.error("Load history error:", error);
        historyList.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

async function searchHistory() {
    const input = document.getElementById("historySearchInput");
    const historyList = document.getElementById("historyList");
    const backButton = document.getElementById("historyBackButton");
    const threeLLMFilter = document.getElementById("threeLLMFilter");

    if (!input || !historyList) {
        return;
    }

    const q = input.value.trim();
    const filterThreeLLMs = threeLLMFilter ? threeLLMFilter.checked : false;

    if (!q) {
        resetHistory();
        return;
    }

    try {
        const url = buildHistoryUrl(
            "http://localhost:3000/api/history/search",
            q,
            filterThreeLLMs
        );

        const response = await fetch(url, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            historyList.innerHTML = `<p>${data.message || "Search failed."}</p>`;
            return;
        }

        renderHistoryList(data.conversations);

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
    const threeLLMToggle = document.getElementById("threeLLMToggle");

    if (!chatBox || !titleElement) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("id");

    if (!conversationId) {
        titleElement.textContent = "New Chat";
        currentConversationId = null;
        chatBox.innerHTML = "";
        if (threeLLMToggle) {
            threeLLMToggle.checked = false;
        }
        setThreeLLMToggleLocked(false);
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

        if (threeLLMToggle) {
            threeLLMToggle.checked = Boolean(data.conversation.used_three_llms);
        }
        setThreeLLMToggleLocked(true);

        const userMessages = data.messages.filter(message => message.sender === "user");

        let turnHtml = "";

        if (data.conversation.used_three_llms && data.turns?.length) {
            for (const turn of data.turns){
                const bestModelRow = turn.modelResponses.find(response => response.is_best === 1);
                const bestModel = bestModelRow ? bestModelRow.model_name : null;
                turnHtml += renderTurn(
                    turn.userMessage.content,
                    turn.modelResponses.map(response => ({
                        model: response.model_name,
                        reply: response.response_text
                    })),
                    bestModel
                );
            }
        } else {
            const llmMessages = data.messages.filter(message => message.sender === "llm");

            for (let i = 0; i < userMessages.length; i++) {
                const userMessage = userMessages[i];
                const llmMessage = llmMessages[i];

                const singleResponses = llmMessage
                    ? [{
                        model: "LLM",
                        reply: llmMessage.content
                    }]
                    : [];

                turnHtml += renderTurn(userMessage.content, singleResponses, "LLM");
            }
        }

        chatBox.innerHTML = turnHtml;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Load conversation error:", error);
        chatBox.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

function startNewChat() {
    currentConversationId = null;
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

    loadHistory();
}

document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
    loadHistory();
    loadConversation();

    document.getElementById("useLocal")?.addEventListener("change", function () {
        document.getElementById("localModels").style.display = this.checked ? "block" : "none";
        if (this.checked) document.getElementById("usePublic").checked = false;
        document.getElementById("publicModels").style.display = "none";
    });

    document.getElementById("usePublic")?.addEventListener("change", function () {
        document.getElementById("publicModels").style.display = this.checked ? "block" : "none";
        if (this.checked) document.getElementById("useLocal").checked = false;
        document.getElementById("localModels").style.display = "none";
    });

    document.getElementById("specializedMode")?.addEventListener("change", function () {
        document.getElementById("specializedOptions").style.display = this.checked ? "block" : "none";
    });
});