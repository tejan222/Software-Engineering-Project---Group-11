console.log("JS loaded!");
let currentConversationId = null;
const THREE_LLM_PREFERENCE_KEY = "useThreeLLMPreference";
const PENDING_HOME_PROMPT_KEY = "pendingHomePrompt";
const PENDING_HOME_THREE_LLM_KEY = "pendingHomeUseThreeLLM";
const HOME_SUGGESTION_POOL = [
    "Explain recursion in simple words",
    "Give me a simple 3-day study plan for learning Python",
    "What is the difference between TCP and UDP?",
    "Help me brainstorm a useful app idea",
    "Explain object-oriented programming with a simple example",
    "What are some good database design tips for beginners?"
];
const CONVERSATION_SUGGESTION_POOL = [
    "Summarize this article in plain English",
    "Help me draft a polite email",
    "Explain the MVC pattern in a simple way",
    "Give me feedback on a homepage design idea",
    "Help me break a big task into smaller steps",
    "What are common mistakes when building a REST API?"
];

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
    const landingHistoryButton = document.getElementById("landingHistoryButton");

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
            if (landingHistoryButton) {
                landingHistoryButton.style.display = "inline-block";
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
            if (landingHistoryButton) {
                landingHistoryButton.style.display = "none";
            }
        }
    } catch (error) {
        console.error("Login status error:", error);
        statusElement.textContent = "Could not connect to backend.";
    }
}

function saveThreeLLMPreference(isEnabled) {
    localStorage.setItem(THREE_LLM_PREFERENCE_KEY, isEnabled ? "true" : "false");
}

function loadThreeLLMPreference() {
    return localStorage.getItem(THREE_LLM_PREFERENCE_KEY) === "true";
}

function savePendingHomePrompt(prompt, useThreeLLM) {
    sessionStorage.setItem(PENDING_HOME_PROMPT_KEY, prompt);
    sessionStorage.setItem(PENDING_HOME_THREE_LLM_KEY, useThreeLLM ? "true" : "false");
}

function getPendingHomePrompt() {
    const prompt = sessionStorage.getItem(PENDING_HOME_PROMPT_KEY);

    if (!prompt) {
        return null;
    }

    return {
        prompt,
        useThreeLLM: sessionStorage.getItem(PENDING_HOME_THREE_LLM_KEY) === "true"
    };
}

function clearPendingHomePrompt() {
    sessionStorage.removeItem(PENDING_HOME_PROMPT_KEY);
    sessionStorage.removeItem(PENDING_HOME_THREE_LLM_KEY);
}

function pickRandomSuggestions(pool, count = 3) {
    const shuffled = [...pool];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(count, shuffled.length));
}

function initializeThreeLLMCheckbox() {
    const threeLLMCheckbox = document.getElementById("threeLLMCheckbox");

    if (!threeLLMCheckbox) {
        return;
    }

    threeLLMCheckbox.checked = loadThreeLLMPreference();
    threeLLMCheckbox.addEventListener("change", () => {
        saveThreeLLMPreference(threeLLMCheckbox.checked);
    });
}

function initializePromptInput() {
    const promptInput = document.getElementById("promptInput");

    if (!promptInput) {
        return;
    }

    promptInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendPrompt();
        }
    });
}

function isThreeLLMSender(sender) {
    return /^llm\d+(\|.+)?$/.test(sender) || /^llm\d+(_best)?$/.test(sender);
}

function parseThreeLLMSender(sender) {
    const modernParts = sender.split("|");
    const modernMatch = modernParts[0].match(/^llm(\d+)$/);

    if (modernMatch) {
        return {
            isThreeLLM: true,
            slotNumber: modernMatch[1],
            modelName: modernParts[1] || null,
            isBest: modernParts.includes("best")
        };
    }

    const legacyMatch = sender.match(/^llm(\d+)(?:_best)?$/);
    if (legacyMatch) {
        return {
            isThreeLLM: true,
            slotNumber: legacyMatch[1],
            modelName: null,
            isBest: /_best$/.test(sender)
        };
    }

    return {
        isThreeLLM: false,
        slotNumber: null,
        modelName: null,
        isBest: false
    };
}

function getThreeLLMLabel(sender) {
    const parsedSender = parseThreeLLMSender(sender);

    if (!parsedSender.isThreeLLM) {
        return "LLM";
    }

    return parsedSender.modelName || `LLM ${parsedSender.slotNumber}`;
}

function isBestThreeLLMReply(sender) {
    return parseThreeLLMSender(sender).isBest;
}

function getFallbackBestReplyIndex(replyGroup) {
    let bestReplyIndex = 0;

    for (let i = 1; i < replyGroup.length; i += 1) {
        if (replyGroup[i].content.length > replyGroup[bestReplyIndex].content.length) {
            bestReplyIndex = i;
        }
    }

    return bestReplyIndex;
}

function renderEmptyChatState(chatBox, variant = "home") {
    const promptInput = document.getElementById("promptInput");
    const config = variant === "home"
        ? {
            badge: "Homepage",
            title: "Start a new conversation",
            description: "This is the landing page for your personal iteration. Try one of these prompts or type your own question below.",
            tips: [
                "Use the checkbox below to compare answers from multiple models.",
                "After you send a message here, the app will open the full conversation page automatically."
            ],
            suggestions: pickRandomSuggestions(HOME_SUGGESTION_POOL)
        }
        : {
            badge: "New Chat",
            title: "This conversation is ready",
            description: "Type your first message below to start the conversation.",
            tips: [],
            suggestions: pickRandomSuggestions(CONVERSATION_SUGGESTION_POOL)
        };

    chatBox.innerHTML = "";

    const emptyState = document.createElement("div");
    emptyState.className = `empty-chat-state empty-chat-state-${variant}`;

    const badge = document.createElement("div");
    badge.className = "empty-chat-badge";
    badge.textContent = config.badge;

    const title = document.createElement("h2");
    title.className = "empty-chat-title";
    title.textContent = config.title;

    const description = document.createElement("p");
    description.className = "empty-chat-description";
    description.textContent = config.description;

    emptyState.appendChild(badge);
    emptyState.appendChild(title);
    emptyState.appendChild(description);

    if (config.tips.length) {
        const tipList = document.createElement("div");
        tipList.className = "empty-chat-notes";

        config.tips.forEach((tipText) => {
            const tipItem = document.createElement("div");
            tipItem.className = "empty-chat-note";
            tipItem.textContent = tipText;
            tipList.appendChild(tipItem);
        });

        emptyState.appendChild(tipList);
    }

    if (config.suggestions.length) {
        const suggestionList = document.createElement("div");
        suggestionList.className = "empty-chat-suggestions";

        config.suggestions.forEach((suggestion) => {
            const suggestionButton = document.createElement("button");
            suggestionButton.type = "button";
            suggestionButton.className = "empty-chat-chip";
            suggestionButton.textContent = suggestion;
            suggestionButton.addEventListener("click", () => {
                if (!promptInput) {
                    return;
                }

                promptInput.value = suggestion;
                promptInput.focus();
            });
            suggestionList.appendChild(suggestionButton);
        });

        emptyState.appendChild(suggestionList);
    }

    if (variant === "home") {
        const tip = document.createElement("p");
        tip.className = "empty-chat-tip";
        tip.textContent = "Tip: the homepage is for starting chats quickly.";
        emptyState.appendChild(tip);
    }

    chatBox.appendChild(emptyState);
}

function initializeChatBox() {
    const chatBox = document.getElementById("chatBox");
    const titleElement = document.getElementById("conversationTitle");

    if (!chatBox) {
        return;
    }

    if (!titleElement) {
        renderEmptyChatState(chatBox, "home");
    }
}

function createConversationTurn(chatBox, prompt) {
    const emptyState = chatBox.querySelector(".empty-chat-state");
    if (emptyState) {
        chatBox.innerHTML = "";
    }

    const turnCard = document.createElement("section");
    turnCard.className = "conversation-turn";

    const questionBlock = document.createElement("div");
    questionBlock.className = "turn-question";

    const questionLabel = document.createElement("div");
    questionLabel.className = "turn-label";
    questionLabel.textContent = "You";

    const questionText = document.createElement("div");
    questionText.className = "turn-question-text";
    questionText.textContent = prompt;

    const responsesContainer = document.createElement("div");
    responsesContainer.className = "turn-responses";

    questionBlock.appendChild(questionLabel);
    questionBlock.appendChild(questionText);
    turnCard.appendChild(questionBlock);
    turnCard.appendChild(responsesContainer);
    chatBox.appendChild(turnCard);

    return {
        turnCard,
        responsesContainer
    };
}

function appendResponseCard(container, label, content, options = {}) {
    const { isBest = false, isLoading = false, isError = false } = options;
    const responseCard = document.createElement("article");
    responseCard.className = "response-card";

    if (isBest) {
        responseCard.classList.add("response-best");
    }
    if (isLoading) {
        responseCard.classList.add("response-loading");
    }
    if (isError) {
        responseCard.classList.add("response-error");
    }

    const responseHeader = document.createElement("div");
    responseHeader.className = "response-header";

    const responseLabel = document.createElement("span");
    responseLabel.className = "response-label";
    responseLabel.textContent = label;

    responseHeader.appendChild(responseLabel);

    if (isBest) {
        const bestBadge = document.createElement("span");
        bestBadge.className = "response-badge";
        bestBadge.textContent = "Best";
        responseHeader.appendChild(bestBadge);
    }

    const responseText = document.createElement("div");
    responseText.className = "response-text";
    responseText.textContent = content;

    responseCard.appendChild(responseHeader);
    responseCard.appendChild(responseText);
    container.appendChild(responseCard);

    return {
        responseCard,
        responseText
    };
}

function renderStoredReplies(responsesContainer, replies) {
    const hasStoredBestReply = replies.some(reply => isBestThreeLLMReply(reply.sender));
    const fallbackBestReplyIndex = getFallbackBestReplyIndex(replies);

    replies.forEach((reply, index) => {
        const isBestReply = hasStoredBestReply
            ? isBestThreeLLMReply(reply.sender)
            : index === fallbackBestReplyIndex;

        appendResponseCard(
            responsesContainer,
            getThreeLLMLabel(reply.sender),
            reply.content,
            { isBest: isBestReply }
        );
    });
}

function renderConversationMessages(chatBox, messages) {
    chatBox.innerHTML = "";

    let currentTurn = null;

    for (let i = 0; i < messages.length; i += 1) {
        const message = messages[i];

        if (message.sender === "user") {
            currentTurn = createConversationTurn(chatBox, message.content);
            continue;
        }

        if (!currentTurn) {
            currentTurn = createConversationTurn(chatBox, "");
        }

        if (message.sender === "llm") {
            appendResponseCard(currentTurn.responsesContainer, "LLM", message.content);
            continue;
        }

        if (isThreeLLMSender(message.sender)) {
            const replyGroup = [];

            while (i < messages.length && isThreeLLMSender(messages[i].sender)) {
                replyGroup.push(messages[i]);
                i += 1;
            }

            i -= 1;
            renderStoredReplies(currentTurn.responsesContainer, replyGroup);

            continue;
        }

        appendResponseCard(currentTurn.responsesContainer, message.sender, message.content);
    }
}

// SEND PROMPT TO BACKEND / OLLAMA
async function sendPrompt() {
    const promptInput = document.getElementById("promptInput");
    const chatBox = document.getElementById("chatBox");
    const threeLLMCheckbox = document.getElementById("threeLLMCheckbox");
    const askButton = document.querySelector(".search-container button");

    if (!promptInput || !chatBox) return;

    const prompt = promptInput.value.trim();
    const useThreeLLM = threeLLMCheckbox ? threeLLMCheckbox.checked : false;
    saveThreeLLMPreference(useThreeLLM);

    if (!prompt) {
        alert("Please enter a prompt.");
        return;
    }

    const isHomePage =
        window.location.pathname.endsWith("index.html") ||
        window.location.pathname === "/" ||
        window.location.pathname.endsWith("/frontend/");

    if (isHomePage) {
        savePendingHomePrompt(prompt, useThreeLLM);
        window.location.href = "conversation.html";
        return;
    }

    console.log("useThreeLLM:", useThreeLLM);

    let pendingTurn;
    let loadingState;
    let interval;
    const originalButtonText = askButton ? askButton.textContent : "";

    try {
        if (askButton) {
            askButton.disabled = true;
            askButton.textContent = "Sending...";
        }

        pendingTurn = createConversationTurn(chatBox, prompt);
        chatBox.scrollTop = chatBox.scrollHeight;

        loadingState = appendResponseCard(
            pendingTurn.responsesContainer,
            useThreeLLM ? "LLMs" : "LLM",
            isHomePage ? "Creating conversation" : "Thinking",
            { isLoading: true }
        );
        chatBox.scrollTop = chatBox.scrollHeight;

        let dots = 0;
        interval = setInterval(() => {
            dots = (dots + 1) % 4;
            const loadingText = isHomePage ? "Creating conversation" : "Thinking";
            loadingState.responseText.textContent = `${loadingText}${".".repeat(dots)}`;
        }, 500);

        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                prompt,
                conversationId: currentConversationId,
                useThreeLLM
            })
        });

        const data = await response.json();

        if (interval) {
            clearInterval(interval);
        }

        if (askButton) {
            askButton.disabled = false;
            askButton.textContent = originalButtonText;
        }

        if (!response.ok) {
            if (loadingState) {
                loadingState.responseCard.classList.remove("response-loading");
                loadingState.responseCard.classList.add("response-error");
                loadingState.responseText.textContent = `Error: ${data.message}`;
            } else {
                const errorTurn = createConversationTurn(chatBox, prompt);
                appendResponseCard(
                    errorTurn.responsesContainer,
                    "LLM",
                    `Error: ${data.message}`,
                    { isError: true }
                );
            }
            return;
        }

        if (data.conversationId) {
            currentConversationId = data.conversationId;

            const currentUrl = new URL(window.location.href);
            if (!currentUrl.searchParams.get("id")) {
                currentUrl.searchParams.set("id", data.conversationId);
                window.history.replaceState({}, "", currentUrl.toString());
            }
        }

        if (useThreeLLM && (data.responses || data.replies)) {
            if (loadingState) {
                loadingState.responseCard.remove();
            }

            const responseItems = data.responses || data.replies.map((reply, index) => ({
                model: `LLM ${index + 1}`,
                reply
            }));

            responseItems.forEach((responseItem, index) => {
                appendResponseCard(
                    pendingTurn.responsesContainer,
                    responseItem.model || `LLM ${index + 1}`,
                    responseItem.reply,
                    { isBest: index === data.bestIndex }
                );
            });
        } else {
            if (loadingState) {
                loadingState.responseCard.classList.remove("response-loading");
                loadingState.responseText.textContent = data.reply;
            } else {
                const replyTurn = createConversationTurn(chatBox, prompt);
                appendResponseCard(replyTurn.responsesContainer, "LLM", data.reply);
            }
        }

        chatBox.scrollTop = chatBox.scrollHeight;
        promptInput.value = "";
    } catch (error) {
        if (interval) {
            clearInterval(interval);
        }

        if (askButton) {
            askButton.disabled = false;
            askButton.textContent = originalButtonText;
        }

        console.error("Chat error:", error);

        if (loadingState) {
            loadingState.responseCard.classList.remove("response-loading");
            loadingState.responseCard.classList.add("response-error");
            loadingState.responseText.textContent = "Error: Could not connect.";
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function shouldShowOnlyThreeLLMHistory() {
    const filterCheckbox = document.getElementById("threeLLMHistoryFilter");
    return filterCheckbox ? filterCheckbox.checked : false;
}

function filterHistoryConversations(conversations) {
    if (!shouldShowOnlyThreeLLMHistory()) {
        return conversations;
    }

    return conversations.filter(conversation => conversation.title.startsWith("[3LLM]"));
}

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatHistoryTitle(title) {
    const isThreeLLMConversation = title.startsWith("[3LLM]");
    const cleanTitle = isThreeLLMConversation
        ? title.replace(/^\[3LLM\]\s*/, "") || "[3LLM]"
        : title;

    return {
        isThreeLLMConversation,
        cleanTitle
    };
}

function renderHistoryList(historyList, conversations, emptyMessage) {
    if (!conversations.length) {
        historyList.innerHTML = `<div class="history-empty">${escapeHtml(emptyMessage)}</div>`;
        return;
    }

    historyList.innerHTML = conversations.map(conversation => `
        ${(() => {
            const { isThreeLLMConversation, cleanTitle } = formatHistoryTitle(conversation.title);

            return `
        <div class="history-item${isThreeLLMConversation ? " history-item-three" : ""}">
            <a class="history-link" href="conversation.html?id=${conversation.id}">
                ${isThreeLLMConversation ? '<span class="history-badge">3 LLM</span>' : ""}
                <span class="history-title-text">${escapeHtml(cleanTitle)}</span>
            </a>
            <span class="history-date">${formatDate(conversation.updated_at)}</span>
        </div>
    `;
        })()}
    `).join("");
}

function updateHistoryBackButton() {
    const input = document.getElementById("historySearchInput");
    const backButton = document.getElementById("historyBackButton");

    if (!backButton) {
        return;
    }

    const hasSearchQuery = input ? input.value.trim().length > 0 : false;
    backButton.style.display = hasSearchQuery || shouldShowOnlyThreeLLMHistory()
        ? "inline-block"
        : "none";
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

        const filteredConversations = filterHistoryConversations(data.conversations);
        const emptyMessage = shouldShowOnlyThreeLLMHistory()
            ? "No [3LLM] conversations found."
            : "No saved conversations yet.";

        renderHistoryList(historyList, filteredConversations, emptyMessage);
        updateHistoryBackButton();
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

        const filteredConversations = filterHistoryConversations(data.conversations);
        const emptyMessage = shouldShowOnlyThreeLLMHistory()
            ? "No matching [3LLM] conversations found."
            : "No matching conversations found.";

        renderHistoryList(historyList, filteredConversations, emptyMessage);
        updateHistoryBackButton();
    } catch (error) {
        console.error("Search history error:", error);
        historyList.innerHTML = "<p>Could not connect to backend.</p>";
    }
}

function applyHistoryFilters() {
    const input = document.getElementById("historySearchInput");

    if (!input) {
        return;
    }

    if (input.value.trim()) {
        searchHistory();
        return;
    }

    loadHistory();
}

async function loadConversation() {
    const chatBox = document.getElementById("chatBox");
    const titleElement = document.getElementById("conversationTitle");
    const promptInput = document.getElementById("promptInput");
    const threeLLMCheckbox = document.getElementById("threeLLMCheckbox");

    if (!chatBox || !titleElement || !promptInput) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("id");

    if (!conversationId) {
        titleElement.textContent = "New Chat";
        currentConversationId = null;
        renderEmptyChatState(chatBox, "conversation");

        const pendingPrompt = getPendingHomePrompt();
        if (pendingPrompt) {
            promptInput.value = pendingPrompt.prompt;

            if (threeLLMCheckbox) {
                threeLLMCheckbox.checked = pendingPrompt.useThreeLLM;
                saveThreeLLMPreference(pendingPrompt.useThreeLLM);
            }

            clearPendingHomePrompt();
            sendPrompt();
        }

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
        if (!data.messages.length) {
            renderEmptyChatState(chatBox, "conversation");
        } else {
            renderConversationMessages(chatBox, data.messages);
        }

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
    const filterCheckbox = document.getElementById("threeLLMHistoryFilter");

    if (input) {
        input.value = "";
    }

    if (filterCheckbox) {
        filterCheckbox.checked = false;
    }

    if (backButton) {
        backButton.style.display = "none";
    }

    loadHistory();
}

document.addEventListener("DOMContentLoaded", () => {
    initializeThreeLLMCheckbox();
    initializePromptInput();
    initializeChatBox();
    checkLoginStatus();
    loadHistory();
    loadConversation();
});
