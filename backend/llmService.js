// llmService.js - Multi-LLM service for handling multiple AI providers

const OLLAMA_URL = "http://localhost:11434/api/chat";

// Supported LLM configurations
const LLM_CONFIGS = {
    "qwen2.5:7b": {
        name: "Qwen 2.5 7B",
        provider: "ollama",
        endpoint: OLLAMA_URL,
        model: "qwen2.5:7b",
        enabled: true
    },
    "llama3.2:3b": {
        name: "Llama 3.2 3B",
        provider: "ollama",
        endpoint: OLLAMA_URL,
        model: "llama3.2:3b",
        enabled: true
    },
    "mistral:7b": {
        name: "Mistral 7B",
        provider: "ollama",
        endpoint: OLLAMA_URL,
        model: "mistral:7b",
        enabled: true
    },
    "phi3:mini": {
        name: "Phi-3 Mini",
        provider: "ollama",
        endpoint: OLLAMA_URL,
        model: "phi3:mini",
        enabled: true
    },
    "deepseek-r1:14b ": {
        name: "DeepSeek R1 14B",
        provider: "ollama",
        endpoint: OLLAMA_URL,
        model: "deepseek-r1:14b ",
        enabled: true
    }
};

// Get list of available LLMs
function getAvailableLLMs() {
    return Object.entries(LLM_CONFIGS)
        .filter(([_, config]) => config.enabled)
        .map(([id, config]) => ({
            id: id,
            name: config.name,
            provider: config.provider
        }));
}

// Query a single LLM
async function queryLLM(llmId, prompt) {
    const config = LLM_CONFIGS[llmId];
    if (!config || !config.enabled) {
        throw new Error(`LLM ${llmId} is not available`);
    }

    try {
        const response = await fetch(config.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: config.model,
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
            throw new Error(`Ollama API error for ${config.name}: ${response.status}`);
        }

        const data = await response.json();
        return {
            llmId: llmId,
            llmName: config.name,
            reply: data.message?.content || "",
            success: true
        };
    } catch (error) {
        console.error(`Error querying ${config.name}:`, error.message);
        return {
            llmId: llmId,
            llmName: config.name,
            reply: `Error: ${error.message}`,
            success: false
        };
    }
}

// Query multiple LLMs in parallel
async function queryMultipleLLMs(llmIds, prompt) {
    const queries = llmIds.map(llmId => queryLLM(llmId, prompt));
    const results = await Promise.all(queries);
    return results;
}

// Query all enabled LLMs
async function queryAllLLMs(prompt) {
    const enabledIds = Object.keys(LLM_CONFIGS).filter(id => LLM_CONFIGS[id].enabled);
    return await queryMultipleLLMs(enabledIds, prompt);
}

module.exports = {
    LLM_CONFIGS,
    getAvailableLLMs,
    queryLLM,
    queryMultipleLLMs,
    queryAllLLMs
};