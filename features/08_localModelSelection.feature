Feature: Local Model Selection

  Scenario: User selects a local model
    Given I am on the new chat page
    When I check the "Local" model section 
    And I select the local model "qwen2.5"
    Then the local model "qwen2.5" should be selected
    