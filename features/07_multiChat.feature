Feature: Query Multiple LLMs Simultaneously
    As a user
    I want to send one prompt to multiple LLMs at the same time
    So that I can compare their responses side by side

    Scenario: Send a prompt to all available LLMs
        Given I am logged in as a registered user
        When I send the message "What is machine learning?" to all LLMs
        Then I should see a response from "Ollama (Local)"
        And I should see a response from "Gemini"