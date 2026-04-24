const request = require("supertest");
const { app, db } = require("../server");

describe("Chat API", () => {

    let agent;

    beforeEach((done) => {
        agent = request.agent(app);

        db.serialize(() => {
            db.run("DELETE FROM messages");
            db.run("DELETE FROM conversations");

            db.run(
                "INSERT OR IGNORE INTO users (id, email, password_hash) VALUES (1, 'test@test.com', 'hash')",
                () => done()
            );
        });
    });

    // Authentication check
    it("should return 401 when user is not logged in", async () => {
        const res = await request(app)
            .post("/api/chat")
            .send({ prompt: "Hello" });

        expect(res.status).toBe(401);
    });


    // UNIT TESTS FOR USER STORY 1

    // Checking if 1 LLM Responds when 1 LLM Option is picked
    it("should return 1 LLM response when numLLMs = 1", async () => {
        /* const agent = request.agent(app);
         // Create a session
         await agent
             .post("/api/test-login")
             .send();
         // Call in chat with session
         const res = await agent
             .post("/api/chat")
             .send({
                 prompt: "Hello",
                 numLLMs: 1
             });
         expect(res.status).toBe(200);
         // expect(res.body.replies).toBeDefined();
         expect(res.body.replies.length).toBe(1);*/

        await agent.post("/api/test-login");
        const res = await agent.post("/api/chat").send({
            prompt: "Hello",
            numLLMs: 1
        });

        expect(res.status).toBe(200);
        expect(res.body.replies.length).toBe(1);

    });

    // Checking if 3 LLMs Respond when 3 LLM option is picked
    it("should return 3 LLM response when numLLMs = 3", async () => {
        /* const agent = request.agent(app);
         // Create a session
         await agent
             .post("/api/test-login")
             .send();
         // Call in chat with session
         const res = await agent
             .post("/api/chat")
             .send({
                 prompt: "Hello",
                 numLLMs: 3
             });
         expect(res.status).toBe(200);
         expect(res.body.replies).toBeDefined();
         expect(res.body.replies.length).toBe(3); */

        await agent.post("/api/test-login");
        const res = await agent.post("/api/chat").send({
            prompt: "Hello",
            numLLMs: 3
        });

        expect(res.status).toBe(200);
        expect(res.body.replies.length).toBe(3);

    });

    // UNIT TESTS FOR USER STORY 2
    it("should return longestResponse as the best answer", async () => {
        await agent.post("/api/test-login");
        const res = await agent.post("/api/chat").send({
            prompt: "Hello",
            numLLMs: 3
        });

        expect(res.status).toBe(200);

        const { replies, longestResponse } = res.body;
        expect(longestResponse).toBeDefined();

        const match = replies.find(r =>
            r.model === longestResponse.model &&
            r.content === longestResponse.content
        );

        expect(match).toBeDefined();

        const expectedLongest = replies.reduce((max, curr) =>
            curr.content.length > max.content.length ? curr : max
            , replies[0]);

        expect(longestResponse.content.length)
            .toBe(expectedLongest.content.length);
    });


    // UNIT TESTS FOR USER STORY 3
    // Checking if numLLMs is getting stored in conversation history
    it("should store numLLMs in conversation history", async () => {
        /*const agent = request.agent(app);

        await agent.post("/api/test-login").send();

        await agent.post("/api/chat").send({
            prompt: "Hello",
            numLLMs: 3
        });

        const res = await agent.get("/api/history");

        expect(res.status).toBe(200);

        const convo = res.body.conversations[0];

        expect(convo.num_llms).toBe(3);*/

        await agent.post("/api/test-login");

        await agent.post("/api/chat").send({
            prompt: "Hello",
            numLLMs: 3
        });

        const res = await agent.get("/api/history");

        expect(res.status).toBe(200);

        const found = res.body.conversations.find(c => c.num_llms === 3);
        expect(found).toBeDefined();

    });

    // Checking if history is filtered properly (by 3 llms and 1 llm)
    it("should filter history by numLLMs", async () => {

        await agent.post("/api/test-login");

        await agent.post("/api/chat").send({
            prompt: "A",
            numLLMs: 3
        });

        await new Promise(r => setTimeout(r, 100));

        await agent.post("/api/chat").send({
            prompt: "B",
            numLLMs: 1
        });

        await new Promise(r => setTimeout(r, 100));

        const res = await agent
            .get("/api/history?numLLMs=3");

        expect(res.status).toBe(200);
        expect(res.body.conversations.length).toBe(1);

        const hasWrong = res.body.conversations.some(c => c.num_llms !== 3);
        expect(hasWrong).toBe(false);

        /* res.body.conversations.forEach(c => {
             expect(c.num_llms).toBe(3);
         }); */


    });


});





