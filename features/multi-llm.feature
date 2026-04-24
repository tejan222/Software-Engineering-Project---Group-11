Feature: Multi-LLM Chat Support
  As a user
  I want to query multiple LLMs simultaneously
  So that I can compare responses from different AI models

  Background:
    Given I am a registered user
    Given I am logged into the system
    When I navigate to conversation history
    Then I should see a list of available LLMs

  Scenario: View available LLMs
    When I navigate to the conversation page
    Then I should see a list of available LLMs
    And the list should include the following models:
      | Qwen       |
      | Llama      |
      | Mistral    |
      | Phi-3      |
      | DeepSeek   |
      
  Scenario: Send message to a single LLM
    Given I have selected "Qwen 2.5 7B" as my LLM
    When I enter the message "What is artificial intelligence?"
    And I click the send button
    Then I should receive a response from "Qwen 2.5 7B"
    And the response should be displayed in the chat box

  Scenario: Send message to multiple LLMs simultaneously
    Given I have selected the following LLMs:
      | Qwen 2.5 7B   |
      | Llama 3.2 3B  |
      | DeepSeek 7B   |
    And multi-LLM mode is enabled
    When I enter the message "Explain quantum computing"
    And I click the send button
    Then I should receive responses from:
      | Qwen 2.5 7B   |
      | Llama 3.2 3B  |
      | DeepSeek 7B   |
    And each response should be labeled with its LLM name

  Scenario: Handle LLM selection validation
    Given no LLM is selected
    When I try to send a message
    Then I should see the error message "Please select at least one LLM"

  Scenario: Toggle between single and multi-LLM mode
    Given I am on the conversation page
    When I enable multi-LLM mode
    Then multi-LLM mode should be active
    When I enable single LLM mode
    Then single LLM mode should be active

  Scenario: View conversation history with LLM metadata
    Given I have sent messages to multiple LLMs
    When I navigate to the conversation history
    And I open a previous conversation
    Then I should see which LLM generated each response