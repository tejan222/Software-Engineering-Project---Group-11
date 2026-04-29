Feature: Weather Response

Scenario: User asks a weather question in weather mode
    Given I am on the new chat page
    And I enable specialized weather mode
    When I type "What is the weather in New Brunswick today?"  into the chat box
    Then I should see a weather realted response
    