const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// بياناتك التي سيتم إدخالها في الاستضافة لاحقاً
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(url, { chat_id: CHAT_ID, text: text });
    } catch (error) {
        console.error("Error sending message to Telegram");
    }
}

async function checkTasks() {
    // تشغيل المتصفح الوهمي
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // 1. الذهاب لصفحة تسجيل الدخول (استبدل الرابط برابط صفحة الدخول الفعلي)
        await page.goto('https://www.multimango.com/login', { waitUntil: 'networkidle2' });

        // 2. الموافقة على الشروط (يجب تعديل الـ Selector 'input[type="checkbox"]' بناءً على كود الموقع)
        await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
        await page.click('input[type="checkbox"]');

        // 3. كتابة الإيميل والضغط على Continue
        await page.type('input[type="email"]', EMAIL);
        await page.keyboard.press('Enter'); 
        // أو اضغط على الزر إذا كان له كلاس معين: await page.click('.continue-btn');

        // الانتظار قليلاً حتى تظهر خانة الباسورد
        await new Promise(r => setTimeout(r, 2000));

        // 4. كتابة الباسورد والضغط على Continue
        await page.type('input[type="password"]', PASSWORD);
        await page.keyboard.press('Enter');

        // الانتظار حتى يتم تسجيل الدخول وتحميل الصفحة الرئيسية
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // 5. الآن المتصفح يمتلك الصلاحية (الكوكيز)، نذهب لـ API الفحص
        await page.goto('https://www.multimango.com/api/omni-elo?capability=tts', { waitUntil: 'networkidle2' });
        
        // جلب الرد من الصفحة
        const responseText = await page.evaluate(() => document.body.innerText);

        // 6. آلية فحص الرد
        if (responseText.includes('NO_LANGUAGE_MATCHES')) {
            console.log("No tasks available right now.");
        } else if (responseText.includes('.wav') || responseText.includes('scontent')) {
            await sendTelegramMessage("omni task online 🟢");
            console.log("Task found and message sent!");
        } else {
            console.log("Unknown response: ", responseText);
        }

    } catch (error) {
        console.error("Error during checking process:", error.message);
    } finally {
        await browser.close();
    }
}

// إنشاء مسار (Endpoint) ليقوم الكليكر بزيارته كل 5 دقائق
app.get('/trigger', async (req, res) => {
    res.send("Bot triggered! Checking tasks in the background...");
    await checkTasks();
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
