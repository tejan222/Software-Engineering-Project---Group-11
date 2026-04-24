Feature: Three LLM responses

  Scenario: Logged-in user asks a question with 3 LLM mode enabled
    Given I am logged in as a registered user
    And I am on the new chat page
    And I check "Have 3 LLMs respond"
    When I send the message "Hello!"
    Then I should see 3 LLM responses
    And I close the browser