const puppeteer = require('puppeteer');
const { Parser } = require("json2csv");
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    let counter = 0;

    page.on('response', async (response) => {
        const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
        if (matches && matches.length === 2) {
            const extension = matches[1];
            const buffer = await response.buffer();
            fs.writeFileSync(`./altimages/image-${counter}.${extension}`, buffer, 'base64');
            counter += 1;
        }
    });

    // Navigate to the Alt News homepage
    await page.goto('https://www.altnews.in/');

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    const youtubePlayer = await page.waitForSelector('.youtube-player');
    const articles = await page.waitForSelector('h4.entry-title');
    const names = await page.waitForSelector('.byline.meta-info');
    const description = await page.waitForSelector('.posted-on.meta-info');

    if (!articles || !names || !description) {
        console.error('Selector not found. Check if the website structure has changed.');
        await browser.close();
        return;
    }
    // Extract the video source URL
    const videoSrc = await youtubePlayer.evaluate(() => {
        const player = document.querySelector('.youtube-player');
        return player ? player.getAttribute('src') : null;
    });

    const extractNames = async () => {
        const namesLinks = await page.evaluate((selector) => {
            const Names = document.querySelectorAll(selector);
            return Array.from(Names, (name) => name.textContent.trim());
        }, '.byline.meta-info');
        return namesLinks;
    };

    const extractDesc = async () => {
        const DescLinks = await page.evaluate((selector) => {
            const Desc = document.querySelectorAll(selector);
            return Array.from(Desc, (desc) => desc.textContent.trim());
        }, '.posted-on.meta-info');
        return DescLinks;
    };

    const extractQuotes = async () => {
        const quotesLinks = await page.evaluate((selector) => {
            const Quotes = document.querySelectorAll(selector);
            return Array.from(Quotes, (quote) => quote.textContent.trim());
        }, 'h4.entry-title');
        return quotesLinks;
    };

    // Scroll logic with delay
    const scrollPage = async () => {
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

        let scrollHeight = 0;
        let counter = 0;

        while (scrollHeight < pageHeight && counter < 100) {
            const scrollIncrement = viewportHeight * 0.7;
            scrollHeight += scrollIncrement;

            await page.evaluate((scrollIncrement) => {
                window.scrollBy(0, scrollIncrement);
            }, scrollIncrement);

            await delay(1000);

            counter++;
            if (counter === 100) {
                break;
            }
        }

        const quotes = await extractQuotes();
        const names = await extractNames();
        const desc = await extractDesc();
         
        const data = [];
        for (let i = 0; i < quotes.length; i++) {
            data.push({
                Names: names[i] || "-",
               
                Date: desc[i] || "-",
                Quotes: quotes[i] || "-",
               
            });
        }

        console.log(data)
        const fields = ["Names",  "Date", "Quotes"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        fs.writeFileSync("./altoutput.csv", csv);

        fs.writeFileSync("./altoutputvideo.csv", videoSrc);
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await scrollPage();
    await browser.close();
})();
