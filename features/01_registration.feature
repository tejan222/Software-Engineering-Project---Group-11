Feature: Registration

    Scenario: User Registration
    Given I am on the sign up page 
    When As prompted, I enter a valid email and password
    And I retype my password correctly and click on the "SIGN UP" button
    Then I should see the login page


