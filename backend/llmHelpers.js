function resolveThreeLLMModelsFromLists(availableModels, configuredModels, requiredCount = 3) {
    const selectedModels = [];

    configuredModels.filter(Boolean).forEach((modelName) => {
        if (availableModels.includes(modelName) && !selectedModels.includes(modelName)) {
            selectedModels.push(modelName);
        }
    });

    availableModels.forEach((modelName) => {
        if (selectedModels.length < requiredCount && !selectedModels.includes(modelName)) {
            selectedModels.push(modelName);
        }
    });

    return selectedModels.slice(0, requiredCount);
}

function getFallbackBestIndex(replies) {
    let bestIndex = 0;

    for (let i = 1; i < replies.length; i += 1) {
        if (replies[i].length > replies[bestIndex].length) {
            bestIndex = i;
        }
    }

    return bestIndex;
}

function buildJudgePrompt(userPrompt, replies) {
    return `
You are evaluating three candidate answers to the same user question.
Choose the best answer based on correctness, relevance, completeness, and clarity.

User question:
"""${userPrompt}"""

Answer 1:
"""${replies[0]}"""

Answer 2:
"""${replies[1]}"""

Answer 3:
"""${replies[2]}"""

Return only one number: 1, 2, or 3.
Do not include any explanation or extra words.
`.trim();
}

function parseJudgeReply(judgeReply) {
    const match = judgeReply.match(/[123]/);
    return match ? Number(match[0]) - 1 : null;
}

function selectJudgeModel(primaryModel, modelNames) {
    return modelNames.includes(primaryModel) ? primaryModel : modelNames[0];
}

module.exports = {
    resolveThreeLLMModelsFromLists,
    getFallbackBestIndex,
    buildJudgePrompt,
    parseJudgeReply,
    selectJudgeModel
};
