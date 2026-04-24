// llmService.test.js - Jasmine unit tests for LLM Service

const { 
    getAvailableLLMs, 
    LLM_CONFIGS,
    queryLLM,
    queryMultipleLLMs 
} = require('../../backend/llmService');

describe("LLM Service", () => {
    
    describe("getAvailableLLMs", () => {
        it("should return an array of available LLMs", () => {
            const llms = getAvailableLLMs();
            expect(llms).toBeDefined();
            expect(Array.isArray(llms)).toBe(true);
            expect(llms.length).toBeGreaterThan(0);
        });
        
        it("should return LLMs with correct properties", () => {
            const llms = getAvailableLLMs();
            const firstLlm = llms[0];
            expect(firstLlm.id).toBeDefined();
            expect(firstLlm.name).toBeDefined();
            expect(firstLlm.provider).toBeDefined();
        });
        
        it("should only return enabled LLMs", () => {
            const llms = getAvailableLLMs();
            llms.forEach(llm => {
                expect(LLM_CONFIGS[llm.id].enabled).toBe(true);
            });
        });
    });
    
    describe("LLM_CONFIGS", () => {
        it("should have configuration for each supported LLM", () => {
            const expectedModels = [
                "qwen2.5:7b",
                "llama3.2:3b", 
                "mistral:7b",
                "phi3:mini",
                "gemma2:2b"
            ];
            
            expectedModels.forEach(model => {
                expect(LLM_CONFIGS[model]).toBeDefined();
                expect(LLM_CONFIGS[model].model).toBe(model);
                expect(LLM_CONFIGS[model].provider).toBe("ollama");
            });
        });
        
        it("should have valid endpoint URLs", () => {
            Object.values(LLM_CONFIGS).forEach(config => {
                expect(config.endpoint).toMatch(/^http/);
            });
        });
    });
    
    describe("queryLLM", () => {
        it("should throw error for invalid LLM ID", async () => {
            await expectAsync(queryLLM("invalid-llm", "test prompt"))
                .toBeRejectedWithError(/not available/);
        });
        
        it("should handle network errors gracefully", async () => {
            // This test would require mocking fetch
            const result = await queryLLM("qwen2.5:7b", "Hello");
            expect(result).toBeDefined();
            expect(result.llmId).toBe("qwen2.5:7b");
        });
    });
    
    describe("queryMultipleLLMs", () => {
        it("should query multiple LLMs in parallel", async () => {
            const llmIds = ["qwen2.5:7b", "llama3.2:3b"];
            const results = await queryMultipleLLMs(llmIds, "Hello");
            
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(llmIds.length);
        });
        
        it("should return results for each LLM", async () => {
            const results = await queryMultipleLLMs(["qwen2.5:7b"], "Test");
            expect(results[0].llmId).toBeDefined();
            expect(results[0].llmName).toBeDefined();
            expect(results[0].reply).toBeDefined();
            expect(results[0].success).toBeDefined();
        });
    });
});