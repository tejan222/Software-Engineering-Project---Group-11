Feature: Filter conversation history by number of LLM responses
    Scenario: Store number of LLMs used in a conversation
        Given the user is logged in
        When the user sends a prompt with numLLMs set to 3
        Then the conversation is saved with num_llms equal to 3


    Scenario: Filter conversation with 3 LLM responses
        Given the user is logged in
        And multiple coversation exist with different num_llms values
        When the user requests conversation history with numLLMs set to 3
        Then only conversations with num_llms equal to 3 are returned