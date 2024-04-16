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
            fs.writeFileSync(`./Mastodonimages/image-${counter}.${extension}`, buffer, 'base64');
            counter += 1;
        }
    });

    // Navigate to the Alt News homepage
    await page.goto('https://mastodon.social/explore');

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });
    
    const names = await page.waitForSelector('.display-name');
    const status = await page.waitForSelector('.status__content__text.status__content__text--visible.translate')

    if (!names || !status)  {
        console.error('Selector not found. Check if the website structure has changed.');
        await browser.close();
        return;
    }

    const extractQuotes = async () => {
        const quotesLinks = await page.evaluate((selector) => {
            const Quotes = document.querySelectorAll(selector);
            return Array.from(Quotes, (quote) => quote.textContent.trim());
        }, '.display-name');

        return quotesLinks;
    };
    const extractStatus = async () => {
        const quotesLinks = await page.evaluate((selector) => {
            const Quotes = document.querySelectorAll(selector);
            return Array.from(Quotes, (quote) => quote.textContent.trim());
        }, '.status__content__text.status__content__text--visible.translate');

        return quotesLinks;
    };
    // Scroll logic with delay
    const scrollPage = async () => {
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

        let scrollHeight = 0;
        let counter = 0;
        // Array to store text
        const textArray = [];
        const contentArray = [];
        const videoArray = [];
        while (scrollHeight < pageHeight && counter < 200) {
            const scrollIncrement = viewportHeight * 0.7;
            scrollHeight += scrollIncrement;

            await page.evaluate((scrollIncrement) => {
                window.scrollBy(0, scrollIncrement);
            }, scrollIncrement);

            await delay(1000);
            // Extract the video source URL
            const videoSrc = await page.evaluate(() => {
                const player = document.querySelector('video');
                return player ? player.getAttribute('src') : null;
            });

            const currentText = await extractQuotes();
            textArray.push(...currentText);
            const currentContent = await extractStatus();
            contentArray.push(...currentContent);
            const currentVideo = await videoSrc;
            videoArray.push(currentVideo)

            counter++;
            if (counter === 200) {
                break;
            }
        }
        const uniqueName = Array.from(new Set(textArray))
        const uniqueContent = Array.from(new Set(contentArray))
        const uniqueVideo = Array.from(new Set(videoArray))
        // console.log(uniqueName);
        // console.log(uniqueContent);
        // console.log(uniqueVideo);
        const data = [];
        for (let i = 0; i < uniqueName.length; i++) {
            data.push({
                name: uniqueName[i] || "-",
                content: uniqueContent[i] || "-",
                videolink: uniqueVideo[i] || "-"
            });
        }

        const fields = ["name", "content", "videolink"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        fs.writeFileSync("./mastodonoutput.csv", csv);
        const videoCsv = uniqueVideo.join('\n');
        fs.writeFileSync("./mastodonoutputvideo.csv", videoCsv);
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Close the browser after all tasks are completed
    await scrollPage();
    await browser.close();
})();
