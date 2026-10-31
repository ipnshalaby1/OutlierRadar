const puppeteer = require('puppeteer');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(url, { chat_id: CHAT_ID, text: text });
    } catch (error) {
        console.error("Error sending message to Telegram:", error.message);
    }
}

async function checkTasks() {
    console.log("Starting browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log("Going to login page...");
        await page.goto('https://www.multimango.com/login', { waitUntil: 'networkidle2' });

        // محاولة الضغط على علامة الصح، وإن لم يجدها يتخطاها ويكمل
        try {
            console.log("Looking for the checkbox...");
            await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
            await page.click('input[type="checkbox"]');
            console.log("Checkbox clicked.");
        } catch (e) {
            console.log("Checkbox not found or skipped. Continuing...");
        }

        console.log("Typing email...");
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.type('input[type="email"]', EMAIL);
        await page.keyboard.press('Enter'); 
        
        console.log("Waiting for password field...");
        await new Promise(r => setTimeout(r, 3000)); // ننتظر 3 ثوانٍ ليظهر مربع الباسورد

        console.log("Typing password...");
        await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        await page.type('input[type="password"]', PASSWORD);
        await page.keyboard.press('Enter');

        console.log("Waiting for login to finish...");
        // ننتظر 5 ثوانٍ بعد ضغطة الدخول لضمان تحميل الموقع
        await new Promise(r => setTimeout(r, 5000));

        console.log("Navigating to API page...");
        await page.goto('https://www.multimango.com/api/omni-elo?capability=tts', { waitUntil: 'networkidle2' });
        
        const responseText = await page.evaluate(() => document.body.innerText);
        console.log("API Response snippet:", responseText.substring(0, 100)); // يطبع أول 100 حرف من الرد للتأكد

        if (responseText.includes('NO_LANGUAGE_MATCHES') || responseText.includes('No comparison candidates')) {
            console.log("No tasks available right now.");
        } else if (responseText.includes('.wav') || responseText.includes('scontent')) {
            await sendTelegramMessage("omni task online 🟢");
            console.log("Task found and message sent!");
        } else {
            console.log("Unknown response.");
        }
    } catch (error) {
        console.error("Error during execution:", error.message);
    } finally {
        await browser.close();
        console.log("Browser closed.");
    }
}

checkTasks();
