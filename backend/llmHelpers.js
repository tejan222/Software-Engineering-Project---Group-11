const OLLAMA_URL = "http://localhost:11434/api/chat";

const DEFAULT_SINGLE_MODEL = "qwen2.5:7b";
const THREE_LLM_MODELS = [
    "qwen2.5:7b",
    "mistral:7b",
    "llama2:7b"
];

async function fetchOllamaReply(model, prompt) {
    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            stream: false
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed for ${model}: ${errorText}`);
    }

    const data = await response.json();

    return {
        model,
        reply: data.message?.content || ""
    };
}

async function getSingleLLMResponse(prompt) {
    return fetchOllamaReply(DEFAULT_SINGLE_MODEL, prompt);
}

async function getThreeLLMResponses(prompt) {
    const settledResponses = await Promise.allSettled(
        THREE_LLM_MODELS.map(model => fetchOllamaReply(model, prompt))
    );

    return settledResponses.map((result, index) => {
        if (result.status === "fulfilled") {
            return result.value;
        }

        return {
            model: THREE_LLM_MODELS[index],
            reply: `Error: ${result.reason.message}`
        };
    });
}

function chooseBestResponse(responses) {
    const validResponses = responses.filter(
        response => response.reply && !response.reply.startsWith("Error:")
    );

    if (validResponses.length === 0) {
        return null;
    }

    let best = validResponses[0];

    for (const response of validResponses) {
        if (response.reply.length > best.reply.length) {
            best = response;
        }
    }

    return best.model;
}

function buildConversationTurns(messages, modelResponses) {
    const userMessages = messages.filter(message => message.sender === "user");

    return userMessages.map(userMessage => {
        const turnResponses = modelResponses
            .filter(response => response.user_message_id === userMessage.id)
            .map(response => ({
                id: response.id,
                model_name: response.model_name,
                response_text: response.response_text,
                is_best: response.is_best,
                created_at: response.created_at
            }));

        return {
            userMessage,
            modelResponses: turnResponses
        };
    });
}

function filterThreeLLMConversations(conversations) {
    return conversations.filter(conversation => conversation.used_three_llms === 1);
}

function searchConversationsByKeyword(conversations, keyword) {
    const trimmedKeyword = (keyword || "").trim().toLowerCase();

    if (!trimmedKeyword) {
        return conversations;
    }

    return conversations.filter(conversation => {
        const title = (conversation.title || "").toLowerCase();
        return title.includes(trimmedKeyword);
    });
}

module.exports = {
    DEFAULT_SINGLE_MODEL,
    THREE_LLM_MODELS,
    getSingleLLMResponse,
    getThreeLLMResponses,
    chooseBestResponse,
    buildConversationTurns,
    filterThreeLLMConversations,
    searchConversationsByKeyword
};