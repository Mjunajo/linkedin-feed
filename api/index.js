// api/index.js
const puppeteer = require('puppeteer');

module.exports = async function handler(req, res) {
    const PROFILE_URL = 'https://www.linkedin.com/in/david-territo-758575b3/';
    const POST_LIMIT = 5;

    try {
        const browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();

        await page.goto(PROFILE_URL, { waitUntil: 'networkidle2' });
        await page.waitForTimeout(5000); // let posts load

        const posts = await page.evaluate((limit) => {
            const result = [];
            const nodes = document.querySelectorAll('div.feed-shared-update-v2__description, div.update-components-text');
            for (let i = 0; i < nodes.length && result.length < limit; i++) {
                const text = nodes[i].innerText.trim();
                if (text.length > 20) result.push({ text, url: window.location.href });
            }
            return result;
        }, POST_LIMIT);

        await browser.close();
        res.status(200).json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch LinkedIn posts' });
    }
};
