Feature: Highlight best response

  Scenario: Best response is highlighted in a 3 LLM conversation
    Given I am logged in as a registered user
    And I am on the new chat page
    And I check "Have 3 LLMs respond"
    When I send the message "Hello!"
    Then I should see 3 LLM responses
    And exactly 1 response should be highlighted as best