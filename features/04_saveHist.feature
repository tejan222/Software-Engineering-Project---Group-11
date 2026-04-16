Feature: Save conversation History
    As a user
    I want my conversation with the LLM to be saved
    So that I can view the conversation and continue it later.

    Scenario: Saving Conversation History
        Given I am logged in as a registered user
        When I send a message "Hello!"
        Then the message should be stored in my conversation history
        And I should see my message in conversation history