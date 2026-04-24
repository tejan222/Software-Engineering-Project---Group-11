Feature: Select number of LLM responses

    Scenario: User selects 1 LLM
        Given the user is logged in 
        When the user sens a prompt with numLLMs set to 1
        Then the system returns exactly 1 LLM response

    Scenario: User selects 3 LLM
        Given the user is logged in 
        When the user sens a prompt with numLLMs set to 3
        Then the system returns exactly 3 LLM response