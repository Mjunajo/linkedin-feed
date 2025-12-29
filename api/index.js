const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join('/tmp', 'linkedin_posts.json'); // Vercel tmp directory
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const PROFILE_URL = 'https://www.linkedin.com/in/david-territo-758575b3/';
const POST_LIMIT = 5;

async function scrapeLinkedIn() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto(PROFILE_URL, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000);

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
        let posts = [];

        // Check if cache exists and is fresh
        if (fs.existsSync(CACHE_FILE)) {
            const stats = fs.statSync(CACHE_FILE);
            const age = Date.now() - stats.mtimeMs;
            if (age < CACHE_TTL) {
                posts = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
                return res.status(200).json(posts);
            }
        }

        // Cache is missing or expired → scrape LinkedIn
        posts = await scrapeLinkedIn();

        // Save to cache
        fs.writeFileSync(CACHE_FILE, JSON.stringify(posts, null, 2));

        res.status(200).json(posts);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch LinkedIn posts' });
    }
};
