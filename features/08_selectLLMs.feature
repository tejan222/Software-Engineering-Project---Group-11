Feature: Select Specific LLMs for Comparison
    As a user
    I want to choose which LLMs to include in my query
    So that I can compare only the models I am interested in

    Scenario: Send a prompt to selected LLMs only
        Given I am logged in as a registered user
        When I select "Ollama (Local)" and "Gemini"
        And I send the message "Explain gravity"
        Then I should see responses from exactly 2 LLMs
        And I should not see a response from "GPT-3.5"