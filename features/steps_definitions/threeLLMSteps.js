const { Given, When, Then, After, setDefaultTimeout } = require("@cucumber/cucumber");
const puppeteer = require("puppeteer");
const expect = require("expect").default;
const fs = require("fs");

setDefaultTimeout(120 * 1000);

const baseFrontend = "http://localhost:5500/frontend";
const mockUser = {
    id: 1,
    email: "student_1234567@gmail.com"
};

let browser;
let page;
let mockState;

function resolveChromeExecutablePath() {
    const candidatePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    ];

    return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
}


function createConversation(createdAt, id, title) {
    return {
        id,
        title,
        created_at: createdAt,
        updated_at: createdAt
    };
}

function buildDefaultMockState() {
    const sharedTimestamp = "2026-04-23T18:30:00.000Z";

    return {
        chatResponse: {
            message: "Chat successful.",
            conversationId: 42,
            responses: [
                {
                    model: "qwen2.5:7b",
                    reply: "Recursion means a function solving a problem by calling itself on a smaller version of the same problem."
                },
                {
                    model: "llama3.2:3b",
                    reply: "Recursion is when a function keeps calling itself until it reaches a stopping point called the base case."
                },
                {
                    model: "mistral:7b",
                    reply: "Recursion is a step-by-step method where the same rule is applied repeatedly to smaller inputs."
                }
            ],
            bestIndex: 1
        },
        historyConversations: [
            createConversation(sharedTimestamp, 42, "[3LLM] Explain recursion"),
            createConversation(sharedTimestamp, 43, "Normal single-LLM chat"),
            createConversation(sharedTimestamp, 44, "[3LLM] Compare TCP and UDP")
        ],
        conversationDetails: {
            42: {
                conversation: createConversation(sharedTimestamp, 42, "[3LLM] Explain recursion"),
                messages: [
                    {
                        id: 1,
                        sender: "user",
                        content: "Explain recursion",
                        created_at: sharedTimestamp
                    },
                    {
                        id: 2,
                        sender: "llm1|qwen2.5:7b",
                        content: "Recursion is a method where a function calls itself.",
                        created_at: sharedTimestamp
                    },
                    {
                        id: 3,
                        sender: "llm2|llama3.2:3b|best",
                        content: "Recursion is when a function repeatedly calls itself until a base case stops the process.",
                        created_at: sharedTimestamp
                    },
                    {
                        id: 4,
                        sender: "llm3|mistral:7b",
                        content: "Recursion solves a large problem by reducing it into smaller copies of the same problem.",
                        created_at: sharedTimestamp
                    }
                ]
            }
        }
    };
}

async function respondWithJson(request, status, body) {
    await request.respond({
        status,
        contentType: "application/json",
        headers: {
            "Access-Control-Allow-Origin": "http://localhost:5500",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        },
        body: JSON.stringify(body)
    });
}


async function handleMockedApiRequest(request) {
    const url = request.url();
    const method = request.method();

    if (!url.startsWith("http://localhost:3000/api/")) {
    await request.continue();
    return;
}

    if (method === "OPTIONS") {
        await request.respond({
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "http://localhost:5500",
                "Access-Control-Allow-Credentials": "true",
             "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
            },
         body: ""
        });
     return;
    }

    if (url === "http://localhost:3000/api/auth/me" && method === "GET") {
        await respondWithJson(request, 200, { user: mockUser });
        return;
    }

    if (url === "http://localhost:3000/api/auth/logout" && method === "POST") {
        await respondWithJson(request, 200, { message: "Logout successful." });
        return;
    }

    if (url === "http://localhost:3000/api/chat" && method === "POST") {
        await respondWithJson(request, 200, mockState.chatResponse);
        return;
    }

    if (url === "http://localhost:3000/api/history" && method === "GET") {
        await respondWithJson(request, 200, {
            conversations: mockState.historyConversations
        });
        return;
    }

    if (url.startsWith("http://localhost:3000/api/history/search") && method === "GET") {
        const searchUrl = new URL(url);
        const query = (searchUrl.searchParams.get("q") || "").toLowerCase();
        const filteredConversations = mockState.historyConversations.filter((conversation) =>
            conversation.title.toLowerCase().includes(query)
        );

        await respondWithJson(request, 200, {
            conversations: filteredConversations
        });
        return;
    }

    const detailMatch = url.match(/^http:\/\/localhost:3000\/api\/history\/(\d+)$/);
    if (detailMatch && method === "GET") {
        const conversationId = Number(detailMatch[1]);
        const detail = mockState.conversationDetails[conversationId];

        if (!detail) {
            await respondWithJson(request, 404, { message: "Conversation not found." });
            return;
        }

        await respondWithJson(request, 200, detail);
        return;
    }

    await respondWithJson(request, 404, { message: "Mock route not found." });
}

async function launchMockedBrowser() {
    mockState = buildDefaultMockState();
    const executablePath = resolveChromeExecutablePath();
    const launchOptions = { headless: true };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    page.on("dialog", async (dialog) => {
        await dialog.dismiss();
    });

    await page.evaluateOnNewDocument(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    await page.setRequestInterception(true);
    page.on("request", (request) => {
        handleMockedApiRequest(request).catch(async (error) => {
            console.error("Mock request handling error:", error);
            try {
                await request.abort();
            } catch (abortError) {
                console.error("Mock abort error:", abortError);
            }
        });
    });
}

After(async function () {
    if (page) {
        await page.close();
        page = null;
    }

    if (browser) {
        await browser.close();
        browser = null;
    }

    mockState = null;
});

Given("I am on the conversation page with mocked 3-LLM responses", async function () {
    await launchMockedBrowser();
    await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: "networkidle2" });
    await page.waitForSelector("#promptInput");
});

When("I enable the 3-LLM checkbox and send the prompt {string}", async function (prompt) {
    await page.click("#threeLLMCheckbox");
    await page.type("#promptInput", prompt);
    await page.click(".search-container button");
    await page.waitForFunction(
        () => document.querySelectorAll(".response-card").length === 3,
        { timeout: 10000 }
    );
});

Then("I should see three mocked model responses", async function () {
    const labels = await page.$$eval(".response-label", (elements) =>
        elements.map((element) => element.textContent.trim())
    );

    expect(labels).toEqual([
        "qwen2.5:7b",
        "llama3.2:3b",
        "mistral:7b"
    ]);
});

Then("I should see exactly one best-answer badge", async function () {
    const bestBadgeCount = await page.$$eval(".response-badge", (elements) => elements.length);
    const highlightedCardCount = await page.$$eval(".response-best", (elements) => elements.length);

    expect(bestBadgeCount).toBe(1);
    expect(highlightedCardCount).toBe(1);
});

Given("I open a saved mocked 3-LLM conversation", async function () {
    await launchMockedBrowser();
    await page.goto(`${baseFrontend}/conversation.html?id=42`, { waitUntil: "networkidle2" });
    await page.waitForFunction(
        () => document.querySelectorAll(".response-card").length === 3,
        { timeout: 10000 }
    );
});

Then("I should see the mocked stored model names", async function () {
    const labels = await page.$$eval(".response-label", (elements) =>
        elements.map((element) => element.textContent.trim())
    );

    expect(labels).toEqual([
        "qwen2.5:7b",
        "llama3.2:3b",
        "mistral:7b"
    ]);
});

Then("I should see one stored best response highlighted", async function () {
    const bestBadgeCount = await page.$$eval(".response-badge", (elements) => elements.length);
    const highlightedLabels = await page.$$eval(".response-best .response-label", (elements) =>
        elements.map((element) => element.textContent.trim())
    );

    expect(bestBadgeCount).toBe(1);
    expect(highlightedLabels).toEqual(["llama3.2:3b"]);
});

Given("I am on the history page with mixed mocked conversations", async function () {
    await launchMockedBrowser();
    await page.goto(`${baseFrontend}/history.html`, { waitUntil: "networkidle2" });
    await page.waitForFunction(
        () => document.querySelectorAll(".history-item").length === 3,
        { timeout: 10000 }
    );
});

When("I enable the 3-LLM history filter", async function () {
    await page.click("#threeLLMHistoryFilter");
    await page.waitForFunction(
        () => document.querySelectorAll(".history-item").length === 2,
        { timeout: 10000 }
    );
});

Then("I should only see mocked 3-LLM conversations in the history list", async function () {
    const badges = await page.$$eval(".history-badge", (elements) =>
        elements.map((element) => element.textContent.trim())
    );
    const titles = await page.$$eval(".history-title-text", (elements) =>
        elements.map((element) => element.textContent.trim())
    );

    expect(badges).toEqual(["3 LLM", "3 LLM"]);
    expect(titles).toEqual([
        "Explain recursion",
        "Compare TCP and UDP"
    ]);
});
