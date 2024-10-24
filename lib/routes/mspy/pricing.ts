import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { Route } from '@/types';
import logger from '@/utils/logger';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/pricing',
    categories: ['other'],
    example: '/mspy/pricing',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'mSpy Pricing',
    maintainers: ['Your GitHub username'],
    handler,
};

async function handler() {
    const rootUrl = 'https://www.mspy.net/price.html';

    try {
        const plans = await cache.tryGet(
            'mspy:pricing:plans',
            async () => {
                logger.info(`Launching Puppeteer to fetch data from ${rootUrl}`);
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.goto(rootUrl, { waitUntil: 'networkidle2' });

                // 等待特定元素加载完成
                await page.waitForSelector('.funnel-concept__plans .plan_item');

                const content = await page.content();
                const $ = load(content);
                logger.debug('Cheerio loaded');

                const plansData = $('.funnel-concept__plans .plan_item')
                    .toArray()
                    .map((element) => {
                        const $element = $(element);
                        return {
                            name: $element.find('.plan_item--period').text().trim(),
                            description: $element.find('.plan_item--description').text().trim(),
                            price: $element.find('.plan_item--price-value').text().trim(),
                            features: $element
                                .find('.plan_item--features_text')
                                .map((_, el) => $(el).text().trim())
                                .get(),
                        };
                    });

                await browser.close();
                logger.info(`Found ${plansData.length} plans`);
                return plansData;
            },
            60 * 60 * 12
        ); // Cache for 24 hours

        const items = plans.map((plan) => ({
            title: `mSpy Plan: ${plan.name}`,
            description: `
                <p>${plan.description}</p>
                <p><strong>Price:</strong> ${plan.price}</p>
                <ul>
                    ${plan.features.map((feature) => `<li>${feature}</li>`).join('')}
                </ul>
            `,
            link: rootUrl,
            pubDate: parseDate(new Date().toUTCString()),
        }));

        logger.info('Handler completed successfully');

        return {
            title: 'mSpy Pricing',
            link: rootUrl,
            item: items,
        };
    } catch (error) {
        logger.error(`Error in handler: ${error}`);
        throw error;
    }
}
