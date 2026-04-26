const OLLAMA_URL = "http://localhost:11434/api/chat";

const DEFAULT_SINGLE_MODEL = "qwen2.5:7b";
const THREE_LLM_MODELS = ["qwen2.5:7b", "mistral:7b", "llama2:7b"];

async function fetchOllamaReply(model, prompt) {
    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            stream: false
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed for ${model}: ${errorText}`);
    }

    const data = await response.json();
    return { model, reply: data.message?.content || "" };
}

async function getSingleLLMResponse(prompt) {
    return fetchOllamaReply(DEFAULT_SINGLE_MODEL, prompt);
}

async function getThreeLLMResponses(prompt) {
    const settledResponses = await Promise.allSettled(
        THREE_LLM_MODELS.map(model => fetchOllamaReply(model, prompt))
    );

    return settledResponses.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        return { model: THREE_LLM_MODELS[index], reply: `Error: ${result.reason.message}` };
    });
}


async function fetchGeminiReply(prompt, systemPrompt = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini request failed: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { model: "gemini", reply };
}

async function fetchGroqReply(prompt, systemPrompt = null) {
    const apiKey = process.env.GROQ_API_KEY;

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: 512
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq request failed: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";
    return { model: "llama3", reply };
}

async function fetchClaudeReply(prompt) {
    const apiKey = process.env.CLAUDE_API_KEY;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude request failed: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "";
    return { model: "claude", reply };
}

async function getPublicLLMResponse(modelName, prompt, systemPrompt = null) {
    if (modelName === "gemini") return fetchGeminiReply(prompt, systemPrompt);
    if (modelName === "llama3") return fetchGroqReply(prompt, systemPrompt);
    throw new Error(`Unknown public model: ${modelName}`);
}

function chooseBestResponse(responses) {
    const validResponses = responses.filter(
        r => r.reply && !r.reply.startsWith("Error:")
    );
    if (validResponses.length === 0) return null;
    return validResponses.reduce((best, r) =>
        r.reply.length > best.reply.length ? r : best
    ).model;
}

function buildConversationTurns(messages, modelResponses) {
    const userMessages = messages.filter(m => m.sender === "user");
    return userMessages.map(userMessage => {
        const turnResponses = modelResponses
            .filter(r => r.user_message_id === userMessage.id)
            .map(r => ({
                id: r.id,
                model_name: r.model_name,
                response_text: r.response_text,
                is_best: r.is_best,
                created_at: r.created_at
            }));
        return { userMessage, modelResponses: turnResponses };
    });
}

function filterThreeLLMConversations(conversations) {
    return conversations.filter(c => c.used_three_llms === 1);
}

function searchConversationsByKeyword(conversations, keyword) {
    const trimmed = (keyword || "").trim().toLowerCase();
    if (!trimmed) return conversations;
    return conversations.filter(c =>
        (c.title || "").toLowerCase().includes(trimmed)
    );
}

module.exports = {
    DEFAULT_SINGLE_MODEL,
    THREE_LLM_MODELS,
    getSingleLLMResponse,
    getThreeLLMResponses,
    getPublicLLMResponse,
    chooseBestResponse,
    buildConversationTurns,
    filterThreeLLMConversations,
    searchConversationsByKeyword
};