Feature: Search Conversation History
    As a user
    I want to search my previous conversations
    So that I can quickly find messages using keywords

    Scenario: Searching Conversation history
        Given I am logged in as a registered user
        When I send a message "Hello!"
        Then the message should be stored in my conversation history
        And I should see my message in conversation history
        When I search for the keyword "Hello"
        Then I should see all matching messages containing "Hello"