# Software Engineering Course Project - Group 11 - Individual
This is the GitHub Repository for Group 11's Iteration 1 of Software Engineering (14:332:452) course project.
Group 11: Tejashree Nagaraj, Shruthi Shankar, Yeshaswini Karthik Babu, Chen Chen, Yang Chen, Anthony Daoud

This project implements a web-based authentication system for accessing an LLM service.  
Users can create an account, log in, and log out through a web interface.  
The backend is implemented using Node.js, Express, and SQLite, and authentication logic is tested using Jasmine.

## Features Implemented
- User registration with email and password
- Email format validation
- Password validation (special character requirement)
- User login with session authentication
- User logout
- SQLite database for user storage
- Jasmine unit tests for authentication helpers

## Project Structure
backend/
    server.js                  Express backend server
    users.db                   SQLite database (will be created automatically when the server first runs)
    authValidation.js          Input validation helpers
    authHelpers.js             Authentication helper functions
    spec/
        authValidationSpec.js
        authHelpersSpec.js
    package.json

frontend/
    index.html                 Landing page
    login.html                 Login page
    signup.html                Signup page
    js/app.js                  Frontend logic
    css/styles.css             Styling


## Requirements
- Node.js (v18+ recommended)
- npm
- A modern web browser

## Installation
1. Clone the repository:
git clone https://github.com/tejan222/Software-Engineering-Project---Group-11.git
cd Software-Engineering-Project---Group-11

2. Install Dependencies:
### Install backend dependencies
cd backend
npm install

### Return to root
cd ..

## Execution Instructions
1. Start Ollama Service:
ollama serve

2. Start Backend Server:
cd backend
npm start

The server will start at:
http://localhost:3000

3. Serve Frontend:
py -m http.server 5500

The frontend will run at:
http://localhost:5500

4. Access Application:
Open browser and navigate to: http://localhost:5500

If using VS Code Live Server:
1. Open the project in VS Code
2. Click Manage in the bottom right corner of VS Code, then Settings
3. Search "live server host"
4. Change Live Server > Settings: Host to `localhost`
5. Right-click `index.html`
6. Click **Open with Live Server**

## Running Unit Tests
From the backend directory:
npm test

This runs the Jasmine test suites:
- authValidationSpec.js
- authHelpersSpec.js

## Running End to End Tests
We are using Cucumber and Puppeteer to simulate real user interactions.
- Ensure that the Backend Server is running at 'http://localhost:3000'
- Ensure the Frontend is running via Live Server at 'http://localhost:5500'
- From root directory run : npx cucumber-js

# Multi-LLM Chat Application - Group 11 - Individual

## Overview
A web application that allows users to query multiple Large Language Models (LLMs) simultaneously and compare their responses.

### Supported LLMs
- Qwen 2.5 7B
- Llama 3.2 3B
- Mistral 7B
- Phi-3 Mini
- Deepseek-r1:14b 

## Prerequisites

### Required Software
1. **Node.js** (v18 or higher)
2. **Ollama** (for running LLMs locally)

### Installing Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai/download


Important Things
the "authValidation.test.js" and "llmService.test.js" should be in the "tests" folder, I dont know how to create the folder in GitHub, so that I just upload these two files in the branch.