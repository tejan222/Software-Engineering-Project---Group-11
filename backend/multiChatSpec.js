const { selectLLMs, formatMultiChatResults, validateMultiChatPrompt } = require("../multiChatHelpers");

describe("multiChatHelpers", () => {

    describe("validateMultiChatPrompt", () => {
        it("returns error for empty prompt", () => {
            expect(validateMultiChatPrompt("")).toBe("Prompt is required.");
        });

        it("returns error for whitespace-only prompt", () => {
            expect(validateMultiChatPrompt("   ")).toBe("Prompt is required.");
        });

        it("returns null for valid prompt", () => {
            expect(validateMultiChatPrompt("What is machine learning?")).toBeNull();
        });
    });

    describe("selectLLMs", () => {
        const allLLMs = [
            { name: "Ollama (Local)", model: "qwen2.5:7b" },
            { name: "GPT-3.5", model: "gpt-3.5-turbo" },
            { name: "Gemini", model: "gemini-pro" }
        ];

        it("returns all LLMs when no selection provided", () => {
            const result = selectLLMs(allLLMs, []);
            expect(result.length).toBe(3);
        });

        it("returns only selected LLMs", () => {
            const result = selectLLMs(allLLMs, ["Ollama (Local)", "GPT-3.5"]);
            expect(result.length).toBe(2);
            expect(result[0].name).toBe("Ollama (Local)");
        });

        it("returns empty array for unrecognized LLM names", () => {
            const result = selectLLMs(allLLMs, ["UnknownLLM"]);
            expect(result.length).toBe(0);
        });

        it("returns single LLM when one is selected", () => {
            const result = selectLLMs(allLLMs, ["Gemini"]);
            expect(result.length).toBe(1);
            expect(result[0].name).toBe("Gemini");
        });
    });

    describe("formatMultiChatResults", () => {
        it("formats successful results correctly", () => {
            const results = [
                { llm: "Ollama (Local)", reply: "Hello!", responseTime: 200, success: true },
                { llm: "GPT-3.5", reply: "Hi there!", responseTime: 300, success: true }
            ];
            const formatted = formatMultiChatResults(results);
            expect(formatted.length).toBe(2);
            expect(formatted[0].llm).toBe("Ollama (Local)");
        });

        it("marks failed results correctly", () => {
            const results = [
                { llm: "Ollama (Local)", reply: "Error: connection refused", responseTime: 100, success: false }
            ];
            const formatted = formatMultiChatResults(results);
            expect(formatted[0].success).toBe(false);
        });

        it("returns empty array for empty results", () => {
            const formatted = formatMultiChatResults([]);
            expect(formatted.length).toBe(0);
        });

        it("includes responseTime in formatted results", () => {
            const results = [
                { llm: "GPT-3.5", reply: "Hello!", responseTime: 450, success: true }
            ];
            const formatted = formatMultiChatResults(results);
            expect(formatted[0].responseTime).toBe(450);
        });
    });
});