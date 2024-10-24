const puppeteer = require('puppeteer');
const { load } = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const logger = require('@/utils/logger');

// export const route: Route = {
//     path: '/pricing',
//     categories: ['other'],
//     example: '/tispy/pricing',
//     parameters: { type: '文章类别' },
//     features: {
//         requireConfig: false,
//         requirePuppeteer: true,
//         antiCrawler: false,
//         supportBT: false,
//         supportPodcast: false,
//         supportScihub: false,
//     },
//     name: 'Pricing Changes',
//     maintainers: ['Your GitHub username'],
//     handler,
// };

module.exports = async function handler(ctx) {
    const rootUrl = 'https://www.tispy.net/pricing/';

    try {
        const plans = await ctx.cache.tryGet(
            'tispy:pricing:plans',
            async () => {
                logger.info(`Launching Puppeteer to fetch data from ${rootUrl}`);
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.goto(rootUrl, { waitUntil: 'networkidle2' });

                // 等待特定元素加载完成
                await page.waitForSelector('#plans .col-md-4');

                const content = await page.content();
                const $ = load(content);
                logger.debug('Cheerio loaded');

                const plansData = $('#plans .col-md-4')
                    .toArray()
                    .map((element) => {
                        const $element = $(element);
                        return {
                            name: $element.find('h2').text().trim(),
                            description: $element.find('p').first().text().trim(),
                            priceByMonth: $element.find('.price span').text().trim(),
                            price: $element.find('font[color="red"] strike').text().trim(),
                            discountPrice: $element.find('lable[for="d_90"] b').text().trim(),
                            months: $element
                                .find('lable[for="d_90"] b')
                                .text()
                                .replaceAll(/[^0-9]/g, ''),
                            buttons: $element
                                .find('.buttons')
                                .map((_, button) => ({
                                    name: $(button).text().trim(),
                                    url: $(button).attr('href') || '',
                                }))
                                .get(),
                        };
                    });

                await browser.close();
                logger.info(`Found ${plansData.length} plans`);
                return plansData;
            },
            60 * 60 * 24
        ); // Cache for 24 hours

        const items = [
            {
                title: 'TiSPY Pricing Updated',
                description: generateDescription(plans),
                link: rootUrl,
                pubDate: parseDate(new Date().toUTCString()),
            },
        ];

        logger.debug('Items generated');
        logger.info('Handler completed successfully');

        ctx.state.data = {
            title: 'TiSPY Pricing Changes',
            link: rootUrl,
            item: items,
        };
    } catch (error) {
        logger.error(`Error in handler: ${error}`);
        throw error;
    }
};

function generateDescription(plans) {
    return `
        <h2>Pricing Plans</h2>
        ${plans
            .map(
                (plan) => `
            <h3>${plan.name}</h3>
            <p>${plan.description}</p>
            <p><strong>Price per month:</strong> $${plan.priceByMonth}</p>
            <p><strong>Original price:</strong> $${plan.price}</p>
            <p><strong>Discounted price:</strong> $${plan.discountPrice}</p>
            <p><strong>Duration:</strong> ${plan.months} months</p>
            <h4>Purchase options:</h4>
            <ul>
                ${plan.buttons.map((button) => `<li><a href="${button.url}">${button.name}</a></li>`).join('')}
            </ul>
        `
            )
            .join('')}
    `;
}
