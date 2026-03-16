Feature: Logout

    Scenario: User Logout
    Given I am on the landing page   
    When The landing page displays "Logged in as:user's email address"
    And I click the green button "Logout" on the top right corner of the webpage 
    Then My session should end securely
    