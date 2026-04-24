# Individual Iteration: 3-LLM Chat Features

This repository contains my individual iteration work for the Software Engineering course project. The project is a web app that lets users chat with a local LLM, save conversations, view conversation history, and search past chats.

## Main Features in This Iteration

### 1. Optional 3-LLM Response Mode
Users can enable a checkbox labeled **"Have 3 LLMs respond"** on the chat page.  
When enabled, the frontend sends a `useThreeLLM` flag to the backend and the system returns three LLM responses instead of one.

### 2. Best Answer Highlighting
When three responses are generated, one response is selected as the best answer and highlighted in the chat interface.  
The backend includes helper logic for response selection and fallback handling.

### 3. 3-LLM Conversation Identification and Filtering
Conversations created in 3-LLM mode are marked with the prefix **[3LLM]** in their titles.  
The history page also includes a filter option so users can view only 3-LLM conversations.

## Additional Improvements
- Homepage updated as a landing page instead of a full chat page
- Dedicated conversation page for full chat interaction
- Improved empty-state text and page layout
- UI updates for readability and workflow clarity

## Project Structure

- `backend/` - server logic and backend helper functions
- `frontend/` - HTML, CSS, and JavaScript for the user interface
- `features/` - Cucumber acceptance tests and step definitions

## Tests

### Unit Tests
Jasmine is used for backend unit testing.  
This iteration adds tests for the 3-LLM helper logic, including:
- model selection
- judge prompt construction
- judge response parsing
- fallback best-answer selection

Main unit test file:
- `backend/spec/llmHelpersSpec.js`

### Acceptance Tests
Cucumber and Puppeteer are used for browser-based acceptance testing.  
This iteration adds scenarios for:
- enabling 3-LLM mode
- viewing three responses with one highlighted best answer
- reopening saved 3-LLM conversations
- filtering history to show only 3-LLM conversations

Main acceptance test files:
- `features/07_threeLLM.feature`
- `features/steps_definitions/threeLLMSteps.js`

## How to Run the Project

### Backend
From the project root:
```bash
cd backend
node server.js
