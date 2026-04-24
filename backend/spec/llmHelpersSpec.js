const {
    resolveThreeLLMModelsFromLists,
    getFallbackBestIndex,
    buildJudgePrompt,
    parseJudgeReply,
    selectJudgeModel
} = require("../llmHelpers");

describe("llmHelpers", () => {
    describe("resolveThreeLLMModelsFromLists", () => {
        it("prefers configured models that are installed", () => {
            const result = resolveThreeLLMModelsFromLists(
                ["qwen2.5:7b", "llama3.2:3b", "mistral:7b", "phi3:mini"],
                ["qwen2.5:7b", "llama3.2:3b", "mistral:7b"],
                3
            );

            expect(result).toEqual(["qwen2.5:7b", "llama3.2:3b", "mistral:7b"]);
        });

        it("fills missing configured models with other installed models", () => {
            const result = resolveThreeLLMModelsFromLists(
                ["qwen2.5:7b", "phi3:mini", "gemma:2b"],
                ["qwen2.5:7b", "llama3.2:3b", "mistral:7b"],
                3
            );

            expect(result).toEqual(["qwen2.5:7b", "phi3:mini", "gemma:2b"]);
        });

        it("does not duplicate model names", () => {
            const result = resolveThreeLLMModelsFromLists(
                ["qwen2.5:7b", "llama3.2:3b", "mistral:7b"],
                ["qwen2.5:7b", "qwen2.5:7b", "llama3.2:3b"],
                3
            );

            expect(result).toEqual(["qwen2.5:7b", "llama3.2:3b", "mistral:7b"]);
        });

        it("returns fewer than three models when not enough are available", () => {
            const result = resolveThreeLLMModelsFromLists(
                ["qwen2.5:7b", "llama3:latest"],
                ["qwen2.5:7b", "llama3.2:3b", "mistral:7b"],
                3
            );

            expect(result).toEqual(["qwen2.5:7b", "llama3:latest"]);
        });
    });

    describe("getFallbackBestIndex", () => {
        it("returns the index of the longest reply", () => {
            const replies = [
                "short",
                "this is clearly the longest reply here",
                "medium length"
            ];

            expect(getFallbackBestIndex(replies)).toBe(1);
        });

        it("returns zero when the first reply is tied for longest", () => {
            const replies = [
                "same length",
                "same length",
                "short"
            ];

            expect(getFallbackBestIndex(replies)).toBe(0);
        });
    });

    describe("buildJudgePrompt", () => {
        it("includes the user prompt and all three answers", () => {
            const prompt = buildJudgePrompt("What is AI?", ["A1", "A2", "A3"]);

            expect(prompt).toContain("What is AI?");
            expect(prompt).toContain("Answer 1:");
            expect(prompt).toContain("A1");
            expect(prompt).toContain("Answer 2:");
            expect(prompt).toContain("A2");
            expect(prompt).toContain("Answer 3:");
            expect(prompt).toContain("A3");
        });
    });

    describe("parseJudgeReply", () => {
        it("parses reply 1 into index 0", () => {
            expect(parseJudgeReply("1")).toBe(0);
        });

        it("parses reply 3 into index 2 even if extra text exists", () => {
            expect(parseJudgeReply("The best is 3")).toBe(2);
        });

        it("returns null for invalid output", () => {
            expect(parseJudgeReply("best answer is two")).toBeNull();
        });
    });

    describe("selectJudgeModel", () => {
        it("uses the primary model when it is in the list", () => {
            const result = selectJudgeModel("qwen2.5:7b", [
                "qwen2.5:7b",
                "llama3.2:3b",
                "mistral:7b"
            ]);

            expect(result).toBe("qwen2.5:7b");
        });

        it("falls back to the first available model when primary model is missing", () => {
            const result = selectJudgeModel("qwen2.5:7b", [
                "llama3.2:3b",
                "mistral:7b",
                "phi3:mini"
            ]);

            expect(result).toBe("llama3.2:3b");
        });
    });
});
