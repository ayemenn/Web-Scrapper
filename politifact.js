const puppeteer = require('puppeteer');
const { Parser } = require("json2csv");
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let counter = 0;
  page.on('response', async (response) => {
    const matches = /.*\.(jpg|png|svg|gif)$/.exec(response.url());
    if (matches && (matches.length === 2)) {
      const extension = matches[1];
      const buffer = await response.buffer();
      fs.writeFileSync(`./images/image-${counter}.${extension}`, buffer, 'base64');
      counter += 1;
    }
  });//stackoverflow

  // Navigate to the Politifact homepage
  await page.goto('https://www.politifact.com/');

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });
  const data = [];
  // Wait for the articles to be present
  await page.waitForSelector('article.m-statement');
  await page.waitForSelector('.m-teaser')
  // Iterate through articles
  const articles = await page.$$('article.m-statement');
  const listItems = await page.$$('.m-teaser')
 
  for (const article of articles) {

    const names = await article.$('.m-statement__name');
    const articlesText = await article.$('.m-statement__quote');
    const description = await article.$('.m-statement__desc');
    const footer = await article.$('.m-statement__footer');

    const name = names ? await names.evaluate(element => element.textContent.trim()) : '-';
    const articleText = articlesText ? await articlesText.evaluate(element => element.textContent.trim()) : '-';
    const desc = description ? await description.evaluate(element => element.textContent.trim()) : '-';
    const foot = footer ? await footer.evaluate(element => element.textContent.trim()) : '-';

    data.push({
      Names: name,
      Title: articleText,
      Description: desc,
      Footer: foot,
    });
  }
  for(const items of listItems)
  {

   // const names = await items.$('.m-statement__name');
    const articlesText = await items.$('.m-teaser__title');
    //const description = await items.$('.m-teaser__meta');
    const footer = await items.$('.m-teaser__meta');

    //const name = names ? await names.evaluate(element => element.textContent.trim()) : '-';
    const articleText = articlesText ? await articlesText.evaluate(element => element.textContent.trim()) : '-';
    //const desc = description ? await description.evaluate(element => element.textContent.trim()) : '-';
    const foot = footer ? await footer.evaluate(element => element.textContent.trim()) : '-';

    data.push({
    //  Names: name,
      Title: articleText,
     // Description: desc,
       Footer: foot,
    });
  }
  console.log(data);

  const fields = ["Names", "Title", "Description", "Footer"];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);
  fs.writeFileSync("./output.csv", csv);

  await browser.close();
})();
