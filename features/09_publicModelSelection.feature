Feature: Public Model Selection

  Scenario: User selects a public model
    Given I am on the new chat page
    When I check the "Public" model section
    And I select the public model "Gemini"
    Then the public model "Gemini" should be selected
