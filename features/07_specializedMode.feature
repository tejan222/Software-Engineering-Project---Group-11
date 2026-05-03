Feature: Specialized Mode

  Scenario: User enables specialized mode and chooses math
    Given  I am on the new chat page
    When I check the "Specialized Mode" checkbox
    And I select the "Math" option
    Then the math mode should be enabled
    