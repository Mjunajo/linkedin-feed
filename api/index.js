const puppeteer = require('puppeteer');

const PROFILE_URL = 'https://www.linkedin.com/in/david-territo-758575b3/';
const POST_LIMIT = 5;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-memory cache
let cachedPosts = null;
let cacheTime = 0;

async function scrapeLinkedIn() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto(PROFILE_URL, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000); // wait for posts to load

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
    return posts;
}

module.exports = async function handler(req, res) {
    try {
        const now = Date.now();

        // Serve cached posts if not expired
        if (cachedPosts && (now - cacheTime < CACHE_TTL)) {
            return res.status(200).json(cachedPosts);
        }

        // Fetch fresh posts
        const posts = await scrapeLinkedIn();

        // Update cache
        cachedPosts = posts;
        cacheTime = now;

        res.status(200).json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch LinkedIn posts' });
    }
};
