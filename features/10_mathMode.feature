Feature: Math Response

Scenario: User asks a math question in math mode
    Given I am on the new chat page
    And I enable specialized math mode
    When I type "Solve 2x + 3 = 7" into the chat box
    And I click "ASK" button
    Then I should see a step by step math response

    