Feature: Filter history for 3 LLM conversations

  Scenario: User filters history to only 3 LLM chats
    Given I am logged in as a registered user
    And I have at least one saved 3 LLM conversation
    When I go to the conversation history page
    And I enable the 3 LLM history filter
    Then I should only see conversations marked as 3 LLM