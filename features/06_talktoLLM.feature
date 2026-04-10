Feature: Converse with LLM
    As a user
    I want to ask questions to the LLM
    So that I can get answers and keep my conversation History

    Scenario: Ask a question and get a response as a logged in user
        Given I am logged in as a registered user
        When I send the message "What is Machine Learning?"
        Then I should see a response from the LLM
        And the conversation should be saved in my conversation history