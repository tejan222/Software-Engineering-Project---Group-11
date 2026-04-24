// multiChatHelpers.js
// Helper functions for the multi-LLM chat feature

function validateMultiChatPrompt(prompt) {
    if (!prompt || !prompt.trim()) {
        return "Prompt is required.";
    }
    return null;
}

function selectLLMs(allLLMs, selectedNames) {
    if (!selectedNames || selectedNames.length === 0) {
        return allLLMs;
    }
    return allLLMs.filter(llm => selectedNames.includes(llm.name));
}

function formatMultiChatResults(results) {
    return results.map(result => ({
        llm: result.llm,
        reply: result.reply,
        responseTime: result.responseTime,
        success: result.success
    }));
}

module.exports = {
    validateMultiChatPrompt,
    selectLLMs,
    formatMultiChatResults
};