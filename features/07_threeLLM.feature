Feature: 3-LLM conversation support
    As a logged-in user
    I want optional 3-LLM responses, best-answer highlighting, and history filtering
    So that I can compare multiple answers and find those conversations later

    Scenario: User enables 3-LLM mode and sees three responses
        Given I am on the conversation page with mocked 3-LLM responses
        When I enable the 3-LLM checkbox and send the prompt "Explain recursion"
        Then I should see three mocked model responses
        And I should see exactly one best-answer badge

    Scenario: User opens a saved 3-LLM conversation and sees the stored best answer
        Given I open a saved mocked 3-LLM conversation
        Then I should see the mocked stored model names
        And I should see one stored best response highlighted

    Scenario: User filters history to only 3-LLM conversations
        Given I am on the history page with mixed mocked conversations
        When I enable the 3-LLM history filter
        Then I should only see mocked 3-LLM conversations in the history list
