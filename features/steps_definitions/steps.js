const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const expect = require('expect').default;

setDefaultTimeout(180 * 1000);

let browser;
let page;
let baseFrontend = 'http://localhost:5500/frontend';
let baseBackend = 'http://localhost:3000';
let sentMessage = '';
let lastHistory = null;
let lastSearchResults = null;
let lastChatText = '';

Given('I am on the sign up page', async function () {
    if (!browser) {
        browser = await puppeteer.launch({ headless: false, slowMo: 150 });
        page = await browser.newPage();

        // This now waits 2 seconds to read the popup 
        // before the script clicks "OK" automatically.
        page.on('dialog', async dialog => {
            console.log(`Grader is reading alert: ${dialog.message()}`);
            //waiting so that the viewers can see the popups
            await new Promise(r => setTimeout(r, 2000)); 
            await dialog.accept();
        });
    }
    await page.goto('http://localhost:5500/frontend/signup.html');
});

When('As prompted, I enter a valid email and password', async function () {
    await page.waitForSelector('#email');
    await page.type('#email', `student_1234567@gmail.com`); 
    await page.type('#password', 'Passwordsecret123$');
});

When('I retype my password correctly and click on the "SIGN UP" button', async function () {
    await page.type('#confirmPassword', 'Passwordsecret123$');
    await page.click('#signupForm button[type="submit"]');
});

Then('I should see the login page', async function () {
    // Because the popup is auto-clicked after 2 seconds, the browser will navigate
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    const url = await page.url();
    if (!url.includes('login.html')) {
        throw new Error("Did not redirect to login page.");
    }
});

// --- LOGIN SECTION ---

Given('As a registered user , I am on the login page', async function () {
    await page.goto('http://localhost:5500/frontend/login.html');
});

When('As prompted , I enter my email and password', async function () {
    await page.waitForSelector('#email');
    await page.type('#email', 'student_1234567@gmail.com'); 
    await page.type('#password', 'Passwordsecret123$'); 
});

When('I click the "LOGIN" button', async function () {
    await page.click('#loginForm button[type="submit"]');
});

Then('I should see the landing page with the message "Welcome! Ask me anything!"', async function () {
    await page.waitForNavigation();
    const content = await page.content();
    if (!content.includes('Welcome')) {
        throw new Error("Landing page message not found!");
    }
});

// --- LOGOUT SECTION ---

Given('I am on the landing page', async function () {
    // Session continues
});

When('The landing page displays "Logged in as:user\'s email address"', async function () {
    await page.waitForSelector('#authStatus');
});

When('I click the green button "Logout" on the top right corner of the webpage', async function () {
    await page.click('#logoutButton');
});

Then('My session should end securely', async function () {
    await page.waitForSelector('#loginButton' ,{visible: true});
    const statusText = await page.$eval('#authStatus', el => el.textContent);
    if (!statusText.includes('Not logged in')){
        throw new Error("Auth status did not revert to 'Not logged in'");
    }
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
});

// ITERATION 2
// -- TALK TO LLM FEATURE --
Given('I am logged in as a registered user', async function () {
  browser = await puppeteer.launch({
    headless: false,
    slowMo: 80,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  page = await browser.newPage();

  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  await page.goto(`${baseFrontend}/login.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#email');
  await page.click('#email', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#email', 'student_1234567@gmail.com');

  await page.click('#password', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#password', 'Passwordsecret123$');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('#loginForm button[type="submit"]')
  ]);

  await page.goto(`${baseFrontend}/index.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#authStatus');
  const authText = await page.$eval('#authStatus', el => el.textContent);
  expect(authText.includes('Logged in as:')).toBe(true);
});

When('I send a message {string}', async function (message) {
  sentMessage = message;

  await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#promptInput');
  await page.type('#promptInput', message);
  await page.click('button[onclick="sendPrompt()"]');
  await page.waitForFunction(
    () => {
      const chatBox = document.getElementById('chatBox');
      return chatBox &&
             chatBox.innerText.includes('LLM:') &&
             !chatBox.innerText.includes('Loading');
    },
    { timeout: 180000 }
  );
  lastChatText = await page.evaluate(() => {
    const chatBox = document.getElementById('chatBox');
    return chatBox ? chatBox.textContent.trim() : '';
  });
});

When('I send the message {string}', async function (message) {
  sentMessage = message;

  await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#promptInput');
  await page.type('#promptInput', message);
  await page.click('button[onclick="sendPrompt()"]');
  await page.waitForFunction(
    () => {
      const chatBox = document.getElementById('chatBox');
      return chatBox &&
             chatBox.innerText.includes('LLM:') &&
             !chatBox.innerText.includes('Loading');
    },
    { timeout: 180000 }
  );
  lastChatText = await page.evaluate(() => {
    const chatBox = document.getElementById('chatBox');
    return chatBox ? chatBox.textContent.trim() : '';
  });
});

Then('I should see a response from the LLM', async function () {
  expect(lastChatText.includes('LLM:')).toBe(true);
});

Then('the conversation should be saved in my conversation history', async function () {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  let found = false;

  for (let i = 0; i < 5; i++) {
    const response = await fetch(`${baseBackend}/api/history`, {
      method: 'GET',
      headers: { Cookie: cookieHeader }
    });

    const data = await response.json();
    lastHistory = data.conversations || [];

    found = lastHistory.some(c => c.title.includes(sentMessage));
    if (found) break;

    await new Promise(r => setTimeout(r, 500));
  }

  expect(found).toBe(true);

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
});

Then('the message should be stored in my conversation history', async function () {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(`${baseBackend}/api/history`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const data = await response.json();
  lastHistory = data.conversations || [];

  const found = lastHistory.some(c => c.title.includes(sentMessage));
  expect(found).toBe(true);
});

Then('I should see my message in conversation history', async function () {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const historyResponse = await fetch(`${baseBackend}/api/history`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const historyData = await historyResponse.json();
  const conversations = historyData.conversations || [];
  expect(conversations.length).toBeGreaterThan(0);

  const matchingConversation = conversations.find(c => c.title.includes(sentMessage));
  expect(!!matchingConversation).toBe(true);

  const conversationResponse = await fetch(`${baseBackend}/api/history/${matchingConversation.id}`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const conversationData = await conversationResponse.json();
  const found = (conversationData.messages || []).some(m => m.content.includes(sentMessage));
  expect(found).toBe(true);
});

When('I search for the keyword {string}', async function (keyword) {
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await fetch(`${baseBackend}/api/history/search?q=${encodeURIComponent(keyword)}`, {
    method: 'GET',
    headers: { Cookie: cookieHeader }
  });

  const data = await response.json();
  lastSearchResults = data.conversations || [];
});

Then('I should see all matching messages containing {string}', async function (keyword) {
  const found = lastSearchResults.some(c => c.title.includes(keyword));
  expect(found).toBe(true);

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
});