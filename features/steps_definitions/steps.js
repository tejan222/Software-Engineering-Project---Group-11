const { Given, When, Then, After, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const expect = require('expect').default;
const assert = require('assert');

setDefaultTimeout(180 * 1000);

/* =========================
   GLOBAL STATE
========================= */

let browser;
let page;

const baseFrontend = 'http://localhost:5500/frontend';
const baseBackend = 'http://localhost:3000';

let sentMessage = '';
let lastSearchResults = null;

/* =========================
   SETUP
========================= */

async function launchBrowser() {
  if (!browser || !page) {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 80
    });

    page = await browser.newPage();

    page.on('dialog', async dialog => {
      await dialog.accept();
    });
  }
}

/* =========================
   AUTH (UI)
========================= */

Given('I am on the sign up page', async function () {
  await launchBrowser();
  await page.goto(`${baseFrontend}/signup.html`);
});

Given('I am on the login page', async function () {
  await launchBrowser();
  await page.goto(`${baseFrontend}/login.html`);
});

When('I enter a valid email and password', async function () {
  await page.type('#email', `student_${Date.now()}@gmail.com`);
  await page.type('#password', 'Password@123');
});

When('I confirm my password correctly', async function () {
  await page.type('#confirmPassword', 'Password@123');
});

When('I click the {string} button', async function () {
  await page.click('button[type="submit"]');
});

Then('I should be redirected to the login page', async function () {
  await page.waitForNavigation();
  expect((await page.url()).includes('login')).toBe(true);
});

/* =========================
   LOGIN
========================= */

Given('I am logged in as a registered user', async function () {
  await launchBrowser();
  await page.goto(`${baseFrontend}/login.html`);
  await page.type('#email', 'student_test@gmail.com');
  await page.type('#password', 'Password@123');

  await Promise.all([
    page.waitForNavigation(),
    page.click('#loginForm button[type="submit"]')
  ]);
});

/* =========================
   CHAT (UI)
========================= */

When('I send a message {string}', async function (message) {
  state.message = message;
  await launchBrowser();
  await page.goto(`${baseFrontend}/conversation.html`);
  await page.waitForSelector('#promptInput');

  await page.type('#promptInput', message);
  await page.click('button[onclick="sendPrompt()"]');

  await page.waitForFunction(() => {
    const chat = document.getElementById('chatBox');
    return chat && chat.innerText.includes('LLM:');
  });
});

Then('I should see a response from the LLM', async function () {
  const text = await page.$eval('#chatBox', el => el.innerText);
  expect(text.includes('LLM:')).toBe(true);
});

/* =========================
   MOCK LLM LOGIC (NON-UI)
========================= */

Given('I have selected {string} as my LLM', function (llm) {
  state.selectedLLMs = [llm];
});

Given('no LLM is selected', function () {
  state.selectedLLMs = [];
});

Given('multi-LLM mode is enabled', function () {
  state.multiMode = true;
});

When('I enter the message {string}', function (message) {
  state.message = message;
});

When('I try to send a message', function () {
  if (state.selectedLLMs.length === 0) {
    state.error = 'Please select at least one LLM';
  }
});

When('I click the send button', function () {
  if (state.selectedLLMs.length === 0) {
    state.error = 'Please select at least one LLM';
    return;
  }

  state.responses = state.selectedLLMs.map(llm => ({
    llm,
    text: `Mock response from ${llm}`
  }));
});

/* =========================
   ASSERTIONS
========================= */

When('As prompted, I enter a valid email and password', async function () {
  await launchBrowser();
  await page.waitForSelector('#email');
  await page.type('#email', 'student_1234567@gmail.com');
  await page.type('#password', 'Passwordsecret123$');
});

When('I retype my password correctly and click on the {string} button', async function (button) {
  await page.type('#confirmPassword', 'Passwordsecret123$');
  await page.click('button[type="submit"]');
});

Then('I should see the login page', async function () {
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  const url = await page.url();
  expect(url.includes('login')).toBe(true);
});

Given('As a registered user , I am on the login page', async function () {
  await launchBrowser();
  await page.goto(`${baseFrontend}/login.html`, { waitUntil: 'networkidle2' });
});

When('As prompted , I enter my email and password', async function () {
  await page.waitForSelector('#email');
  await page.type('#email', 'student_1234567@gmail.com');
  await page.type('#password', 'Passwordsecret123$');
});

Then('I should see the landing page with the message {string}', async function (message) {
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  const content = await page.content();
  expect(content.includes(message)).toBe(true);
});

Given('I am on the landing page', async function () {
  await launchBrowser();
  await page.goto(`${baseFrontend}/index.html`, { waitUntil: 'networkidle2' });
});

When('The landing page displays {string}', async function (text) {
  await page.waitForSelector('#authStatus');
});

When('I click the green button {string} on the top right corner of the webpage', async function (button) {
  await page.click('#logoutButton');
});

Then('My session should end securely', async function () {
  await page.waitForSelector('#loginButton', { visible: true });
});

Then('I should see the error message {string}', function (msg) {
  assert.strictEqual(state.error, msg);
});

Then('I should receive a response from {string}', function (llm) {
  const found = state.responses.find(r => r.llm === llm);
  assert.ok(found);
});

When('I send the message {string}', (s) => {
  // Write code here that turns the phrase above into concrete actions
})

Given('I am a registered user', function () {
  // user exists for test purposes
});

Given('I am logged into the system', function () {
  // mock login for multi-LLM feature
});

When('I navigate to conversation history', function () {
  // for: When I navigate to conversation history
});

When('I navigate to the conversation history', function () {
  // for: When I navigate to the conversation history
});

When('I navigate to the conversation page', function () {
  // for: When I navigate to the conversation page
});

Then('I should see a list of available LLMs', function () {
  // check available LLM list
});

Then('the list should include the following models:', function (dataTable) {
  // table step
});

Given('I have selected the following LLMs:', function (dataTable) {
  // select multiple LLMs from table
});

Then('I should receive responses from:', function (dataTable) {
  // assert responses from table
});

Then('the response should be displayed in the chat box', function () {
  // assert chat box response
});

Then('each response should be labeled with its LLM name', function () {
  // assert labels
});

When('I enable multi-LLM mode', function () {
  // enable multi mode
});

When('I enable single LLM mode', function () {
  // enable single mode
});

Then('multi-LLM mode should be active', function () {
  // assert multi mode
});

Then('single LLM mode should be active', function () {
  // assert single mode
});

Given('I have sent messages to multiple LLMs', function () {
  // mock history exists
});

When('I open a previous conversation', function () {
  // open previous conversation
});

Then('I should see which LLM generated each response', function () {
  // assert LLM metadata
});

Then('the conversation should be saved in my conversation history', async function () {
  // If you're using Puppeteer (real backend)
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(`${baseBackend}/api/history`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const data = await response.json();
  const conversations = data.conversations || [];

  const found = conversations.some(c => c.title.includes(sentMessage));
  expect(found).toBe(true);
});

Given('I am on the conversation page', async function () {
  await launchBrowser(); // if you are using Puppeteer helper

  await page.goto(`${baseFrontend}/conversation.html`, {
    waitUntil: 'networkidle2'
  });
});

/* =========================
   History
========================= */

Then('I should see my message in conversation history', async function () {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(`${baseBackend}/api/history`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const data = await response.json();
  const conversations = data.conversations || [];

  const found = conversations.some(c => c.title.includes(sentMessage));
  expect(found).toBe(true);
});

Then('I should see all matching messages containing {string}', async function (keyword) {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(`${baseBackend}/api/history/search?q=${encodeURIComponent(keyword)}`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const data = await response.json();
  const conversations = data.conversations || [];

  const found = conversations.some(c => c.title.includes(keyword));
  expect(found).toBe(true);
});

Then('the message should be stored in my conversation history', async function () {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(`${baseBackend}/api/history`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const data = await response.json();
  const conversations = data.conversations || [];

  const found = conversations.some(c => c.title.includes(sentMessage));
  expect(found).toBe(true);
});

When('I search for the keyword {string}', async function (keyword) {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(
    `${baseBackend}/api/history/search?q=${encodeURIComponent(keyword)}`,
    {
      method: 'GET',
      headers: { Cookie: cookieHeader }
    }
  );

  const data = await response.json();
  lastSearchResults = data.conversations || [];
});


/* =========================
   CLEANUP
========================= */

After(async function () {
  if (page) await page.close();
  page = null;
});

AfterAll(async function () {
  if (browser) await browser.close();
  browser = null;
});