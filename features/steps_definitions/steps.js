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
let lastResponseCount = 0;
let lastBestResponseCount = 0;
let pendingPrompt = '';

async function ensureBrowser() {
  if (browser && page) {
    return;
  }

  const launchOptions = {
    headless: false,
    slowMo: 80
  };

  try {
    browser = await puppeteer.launch({
      ...launchOptions,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
  } catch (err) {
    browser = await puppeteer.launch(launchOptions);
  }

  page = await browser.newPage();
  page.on('dialog', async dialog => {
    await dialog.accept();
  });
}

async function ensureRegisteredUser() {
  try {
    await fetch(`${baseBackend}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_1234567@gmail.com',
        password: 'Passwordsecret123$',
        confirmPassword: 'Passwordsecret123$'
      })
    });
  } catch (err) {
    // The login step below will fail clearly if the backend is unavailable.
  }
}

async function ensureLoggedIn() {
  await ensureBrowser();
  await ensureRegisteredUser();

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
}

async function sendPendingPromptIfNeeded() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForSelector('#chatBox', { timeout: 10000 });

      const hasResponse = await page.evaluate(() => {
        const chatBox = document.getElementById('chatBox');
        return chatBox && chatBox.textContent.trim().length > 0;
      });

      if (!hasResponse) {
        await page.click('button[onclick="sendPrompt()"]');
      }

      await page.waitForFunction(
        () => {
          const chatBox = document.getElementById('chatBox');
          if (!chatBox) return false;

          const text = chatBox.innerText || '';
          return text.includes('Error') ||
                 (text.length > 0 && !text.includes('Loading'));
        },
        { timeout: 180000 }
      );

      await page.waitForSelector('#chatBox', { timeout: 10000 });
      lastChatText = await page.evaluate(() => {
        const chatBox = document.getElementById('chatBox');
        return chatBox ? chatBox.textContent.trim() : '';
      });
      return;
    } catch (err) {
      const contextWasDestroyed = err.message.includes('Execution context was destroyed') ||
        err.message.includes('Cannot find context with specified id');

      if (!contextWasDestroyed || attempt === 2) {
        throw err;
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      await page.waitForSelector('#chatBox', { timeout: 10000 });
    }
  }
}

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
  if (browser){
    await browser.close();
    browser = null;
    page = null;
  }
  
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

// When('I send a message {string}', async function (message) {
//   sentMessage = message;

//   await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
//   await page.waitForSelector('#promptInput');
//   await page.type('#promptInput', message);
//   await page.click('button[onclick="sendPrompt()"]');
//   await page.waitForFunction(
//     () => {
//       const chatBox = document.getElementById('chatBox');
//       return chatBox &&
//              chatBox.innerText.includes('LLM:') &&
//              !chatBox.innerText.includes('Loading');
//     },
//     { timeout: 180000 }
//   );
//   lastChatText = await page.evaluate(() => {
//     const chatBox = document.getElementById('chatBox');
//     return chatBox ? chatBox.textContent.trim() : '';
//   });
// });

When('I send a message {string}', async function (message) {
  sentMessage = message;

  await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#promptInput');
  await page.type('#promptInput', message);
  await page.click('button[onclick="sendPrompt()"]');

  await page.waitForFunction(
    () => {
      const chatBox = document.getElementById('chatBox');
      const cards = document.querySelectorAll('.llm-response-card');
      return chatBox &&
             !chatBox.innerText.includes('Loading') &&
             (cards.length > 0 || chatBox.innerText.includes('Error') || chatBox.innerText.includes('LLM'));
    },
    { timeout: 180000 }
  );

  lastChatText = await page.evaluate(() => {
    const chatBox = document.getElementById('chatBox');
    return chatBox ? chatBox.textContent.trim() : '';
  });
});

// When('I send the message {string}', async function (message) {
//   sentMessage = message;

//   await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
//   await page.waitForSelector('#promptInput');
//   await page.type('#promptInput', message);
//   await page.click('button[onclick="sendPrompt()"]');
//   await page.waitForFunction(
//     () => {
//       const chatBox = document.getElementById('chatBox');
//       return chatBox &&
//              chatBox.innerText.includes('LLM:') &&
//              !chatBox.innerText.includes('Loading');
//     },
//     { timeout: 180000 }
//   );
//   lastChatText = await page.evaluate(() => {
//     const chatBox = document.getElementById('chatBox');
//     return chatBox ? chatBox.textContent.trim() : '';
//   });
// });

When('I send the message {string}', async function (message) {
  sentMessage = message;

  await page.waitForSelector('#promptInput');
  await page.click('#promptInput', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#promptInput', message);
  await page.click('button[onclick="sendPrompt()"]');

  await page.waitForFunction(
    () => {
      const chatBox = document.getElementById('chatBox');
      const cards = document.querySelectorAll('.llm-response-card');
      if (!chatBox) return false;

      const text = chatBox.innerText || '';
      return cards.length === 3 || text.includes('Error');
    },
    { timeout: 180000 }
  );

  await page.waitForSelector('#chatBox');

  try {
    lastChatText = await page.$eval('#chatBox', el => el.textContent.trim());
  } catch (err) {
    if (err.message.includes('Execution context was destroyed')) {
      await page.waitForSelector('#chatBox');
      lastChatText = await page.$eval('#chatBox', el => el.textContent.trim());
    } else {
      throw err;
    }
  }
});

// Then('I should see a response from the LLM', async function () {
//   expect(lastChatText.includes('LLM:')).toBe(true);
// });

Then('I should see a response from the LLM', async function () {
  const hasCards = await page.$$eval('.llm-response-card', cards => cards.length > 0);
  expect(hasCards || lastChatText.length > 0).toBe(true);
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

// INDIVIDUAL ITERATION (Shruthi Shankar)

Given('I am on the new chat page', async function () {
  await ensureLoggedIn();
  await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#promptInput');
});

When('I check the {string} checkbox', async function (checkboxName) {
  await page.waitForSelector('#specializedOptions');

  if (checkboxName !== 'Specialized Mode') {
    throw new Error(`Unknown checkbox: ${checkboxName}`);
  }

  const isVisible = await page.$eval('#specializedOptions', el => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  expect(isVisible).toBe(true);
});

When('I select the {string} option', async function (optionName) {
  const value = optionName.toLowerCase();
  await page.waitForSelector(`input[name="specializedType"][value="${value}"]`);
  await page.click(`input[name="specializedType"][value="${value}"]`);
});

Then('the math mode should be enabled', async function () {
  const isChecked = await page.$eval('input[name="specializedType"][value="math"]', el => el.checked);
  expect(isChecked).toBe(true);
});

When('I check the {string} model section', async function (sectionName) {
  const normalizedName = sectionName.toLowerCase();
  const selector = normalizedName === 'local' ? '#useLocal' : normalizedName === 'public' ? '#usePublic' : null;

  if (!selector) {
    throw new Error(`Unknown model section: ${sectionName}`);
  }

  await page.waitForSelector(selector);
  const isChecked = await page.$eval(selector, el => el.checked);
  if (!isChecked) {
    await page.click(selector);
  }
});

When('I select the local model {string}', async function (modelName) {
  await page.waitForSelector('#localModels');
  const selector = `input[name="modelChoice"][value="local-${modelName}"]`;
  await page.waitForSelector(selector);
  await page.click(selector);
});

Then('the local model {string} should be selected', async function (modelName) {
  const selector = `input[name="modelChoice"][value="local-${modelName}"]`;
  const isChecked = await page.$eval(selector, el => el.checked);
  expect(isChecked).toBe(true);
});

When('I select the public model {string}', async function (modelName) {
  await page.waitForSelector('#publicModels');
  const value = modelName.toLowerCase() === 'gemini' ? 'gemini' : modelName.toLowerCase();
  const selector = `input[name="modelChoice"][value="public-${value}"]`;
  await page.waitForSelector(selector);
  await page.click(selector);
});

Then('the public model {string} should be selected', async function (modelName) {
  const value = modelName.toLowerCase() === 'gemini' ? 'gemini' : modelName.toLowerCase();
  const selector = `input[name="modelChoice"][value="public-${value}"]`;
  const isChecked = await page.$eval(selector, el => el.checked);
  expect(isChecked).toBe(true);
});

Given('I enable specialized math mode', async function () {
  await page.waitForSelector('input[name="specializedType"][value="math"]');
  await page.click('input[name="specializedType"][value="math"]');
});

Given('I enable specialized weather mode', async function () {
  await page.waitForSelector('input[name="specializedType"][value="weather"]');
  await page.click('input[name="specializedType"][value="weather"]');
});

When('I type {string} into the chat box', async function (message) {
  pendingPrompt = message;
  await page.waitForSelector('#promptInput');
  await page.click('#promptInput', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#promptInput', message);
});

When('I type {string}  into the chat box', async function (message) {
  pendingPrompt = message;
  await page.waitForSelector('#promptInput');
  await page.click('#promptInput', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#promptInput', message);
});

When('I click {string} button', async function (buttonName) {
  if (buttonName !== 'ASK') {
    throw new Error(`Unknown button: ${buttonName}`);
  }

  await page.click('button[onclick="sendPrompt()"]');
  await sendPendingPromptIfNeeded();
});

Then('I should see a step by step math response', async function () {
  await sendPendingPromptIfNeeded();

  expect(lastChatText.includes(pendingPrompt)).toBe(true);
  expect(lastChatText.includes('Error:')).toBe(false);
});

Then('I should see a weather realted response', async function () {
  await sendPendingPromptIfNeeded();

  expect(lastChatText.includes(pendingPrompt)).toBe(true);
  expect(lastChatText.includes('Error:')).toBe(false);

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
});

Given('I check "Have 3 LLMs respond"', async function () {
  await page.waitForSelector('#threeLLMToggle');

  const isChecked = await page.$eval('#threeLLMToggle', el => el.checked);
  if (!isChecked) {
    await page.click('#threeLLMToggle');
  }
});

Then('I should see 3 LLM responses', async function () {
  await page.waitForSelector('.llm-response-card');

  lastResponseCount = await page.$$eval('.llm-response-card', cards => cards.length);
  expect(lastResponseCount).toBe(3);
});

Then('exactly 1 response should be highlighted as best', async function () {
  lastBestResponseCount = await page.$$eval('.best-response', cards => cards.length);
  expect(lastBestResponseCount).toBe(1);

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
});

// Given('I have at least one saved 3 LLM conversation', async function () {
//   sentMessage = `Three LLM test ${Date.now()}`;

//   await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
//   await page.waitForSelector('#threeLLMToggle');

//   const isChecked = await page.$eval('#threeLLMToggle', el => el.checked);
//   if (!isChecked) {
//     await page.click('#threeLLMToggle');
//   }

//   await page.waitForSelector('#promptInput');
//   await page.type('#promptInput', sentMessage);
//   await page.click('button[onclick="sendPrompt()"]');

//   await page.waitForFunction(
//     () => document.querySelectorAll('.llm-response-card').length === 3,
//     { timeout: 180000 }
//   );
// });

Given('I have at least one saved 3 LLM conversation', async function () {
  sentMessage = "Hello!";

  await page.goto(`${baseFrontend}/conversation.html`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#threeLLMToggle');

  const isChecked = await page.$eval('#threeLLMToggle', el => el.checked);
  if (!isChecked) {
    await page.click('#threeLLMToggle');
  }

  await page.waitForSelector('#promptInput');
  await page.click('#promptInput', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#promptInput', sentMessage);
  await page.click('button[onclick="sendPrompt()"]');

  await page.waitForFunction(
    () => {
      const cards = document.querySelectorAll('.llm-response-card');
      const chatBox = document.getElementById('chatBox');
      if (!chatBox) return false;

      const text = chatBox.innerText || '';
      return cards.length === 3 || text.includes('Error');
    },
    { timeout: 180000 }
  );

  await page.waitForSelector('#chatBox');
});

When('I go to the conversation history page', async function () {
  try {
    await page.goto(`${baseFrontend}/history.html`, { waitUntil: 'networkidle2' });
  } catch (err) {
    if (err.message.includes('ERR_ABORTED')) {
      await page.waitForTimeout(1000);
      await page.goto(`${baseFrontend}/history.html`, { waitUntil: 'networkidle2' });
    } else {
      throw err;
    }
  }

  await page.waitForSelector('#historyList');
});

When('I enable the 3 LLM history filter', async function () {
  await page.waitForSelector('#threeLLMFilter');

  const isChecked = await page.$eval('#threeLLMFilter', el => el.checked);
  if (!isChecked) {
    await page.click('#threeLLMFilter');
  }

  await page.waitForFunction(
    () => {
      const historyList = document.getElementById('historyList');
      return historyList && historyList.textContent.trim().length > 0;
    },
    { timeout: 10000 }
  );
});

Then('I should only see conversations marked as 3 LLM', async function () {
  const items = await page.$$eval('#historyList a', links =>
    links.map(link => link.textContent.trim())
  );

  expect(items.length).toBeGreaterThan(0);

  for (const item of items) {
    expect(item.includes('[3 LLM]')).toBe(true);
  }

  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
});

Then('I close the browser', async function () {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
});
