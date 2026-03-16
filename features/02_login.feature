Feature: Login

    Scenario: User Login
    Given As a registered user , I am on the login page
    When As prompted , I enter my email and password 
    And I click the "LOGIN" button
    Then I should see the landing page with the message "Welcome! Ask me anything!"


