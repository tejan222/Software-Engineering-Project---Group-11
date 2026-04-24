# Software Engineering Course Project Individual Iteration - Group 11
This is the GitHub Repository for Group 11's individual iteration of the Software Engineering (14:332:452) course project.  
This individual iteration was completed by Yang Chen.

This project extends the existing web-based LLM chat application.  
Users can already register, log in, log out, save conversation history, view saved history, and search previous conversations.  
In this individual iteration, the project adds optional 3-LLM responses, best-answer highlighting, and filtering for 3-LLM conversations.

## Features Implemented in This Individual Iteration
- Optional "Have 3 LLMs respond" mode
- Three LLM responses shown for a single user prompt
- Best answer automatically selected and highlighted
- 3-LLM conversations marked with `[3LLM]` in history
- History filter for showing only 3-LLM conversations
- Jasmine unit tests for 3-LLM helper logic
- Cucumber and Puppeteer acceptance tests for the 3-LLM workflow

## Project Structure
backend/
    server.js                  Express backend server
    llmHelpers.js              Helper logic for 3-LLM mode and best-answer selection
    authValidation.js          Input validation helpers
    authHelpers.js             Authentication helper functions
    spec/
        authValidationSpec.js
        authHelpersSpec.js
        llmHelpersSpec.js
    package.json

frontend/
    index.html                 Landing page
    login.html                 Login page
    signup.html                Sign-up page
    conversation.html          Main chat page
    history.html               Conversation history page
    js/app.js                  Frontend logic
    css/styles.css             Styling

features/
    04_saveHist.feature
    05_searchHist.feature
    06_talktoLLM.feature
    07_threeLLM.feature
    steps_definitions/
        steps.js
        threeLLMSteps.js

## Requirements
- Node.js (v18+ recommended)
- npm
- A modern web browser
- VS Code Live Server (recommended for frontend)
- Ollama running locally

## Installation
1. Clone the repository:
git clone <repo-url>

2. Install dependencies from the project root:
npm install

3. Navigate to the backend directory:
cd backend

4. Install backend dependencies if needed:
npm install

## Running the Backend Server
From the backend directory:
node server.js

The server will start at:
http://localhost:3000

## Running the Frontend
Open the frontend files using a local server.

If using VS Code Live Server:
1. Open the project in VS Code
2. Click Manage in the bottom right corner of VS Code, then Settings
3. Search "live server host"
4. Change Live Server > Settings: Host to `localhost`
5. Right-click `frontend/index.html`
6. Click **Open with Live Server**

The frontend will run at:
http://localhost:5500/frontend/index.html

Use `localhost` consistently for both frontend and backend.

## Running Unit Tests
From the backend directory:
npx.cmd jasmine

This runs the Jasmine test suites, including:
- authValidationSpec.js
- authHelpersSpec.js
- llmHelpersSpec.js

## Running Acceptance Tests
We are using Cucumber and Puppeteer to simulate real user interactions.

Before running the tests:
- Ensure that the backend server is running at `http://localhost:3000`
- Ensure the frontend is running via Live Server at `http://localhost:5500`

From the project root directory run:
npx.cmd cucumber-js features/07_threeLLM.feature

This runs the acceptance tests for:
- enabling 3-LLM mode
- displaying three responses
- highlighting the best answer
- filtering 3-LLM conversations in history

## Notes
- The project continues using the existing `conversations` and `messages` tables
- No database schema change was required for identifying 3-LLM conversations
- 3-LLM conversations are identified through the `[3LLM]` title prefix
- Best-answer selection uses backend helper logic with judge-model support and fallback handling

## Author
Yang Chen

