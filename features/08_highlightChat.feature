Feature: Identify the best LLM response
    Scenario: System returns the best response 
        Given the user is logged in 
        When the user sends a promp with multiple LLMs 
        Then the system returns a list of responses
        And the system identifies the longest response as the best response
        And the best response is included in the return results
