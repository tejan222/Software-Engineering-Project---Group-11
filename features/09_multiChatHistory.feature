Feature: Save Multi-LLM Chat to History
    As a user
    I want my multi-LLM conversations to be saved automatically
    So that I can revisit and compare responses later

    Scenario: Multi-chat is saved to conversation history
        Given I am logged in as a registered user
        When I send the message "What is AI?" to all LLMs
        Then the conversation should be saved in my conversation history
        And the conversation title should start with "[Multi]"
