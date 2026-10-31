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
        console.error("Error sending message:", error.message);
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
        await page.goto('https://www.multimango.com/login', { waitUntil: 'networkidle2' });

        await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
        await page.click('input[type="checkbox"]');

        await page.type('input[type="email"]', EMAIL);
        await page.keyboard.press('Enter'); 
        
        await new Promise(r => setTimeout(r, 2000));

        await page.type('input[type="password"]', PASSWORD);
        await page.keyboard.press('Enter');

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        await page.goto('https://www.multimango.com/api/omni-elo?capability=tts', { waitUntil: 'networkidle2' });
        
        const responseText = await page.evaluate(() => document.body.innerText);

        if (responseText.includes('NO_LANGUAGE_MATCHES')) {
            console.log("No tasks available right now.");
        } else if (responseText.includes('.wav') || responseText.includes('scontent')) {
            await sendTelegramMessage("omni task online 🟢");
            console.log("Task found and message sent!");
        } else {
            console.log("Unknown response.");
        }
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await browser.close();
    }
}

checkTasks();
