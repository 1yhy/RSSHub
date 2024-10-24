import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { Route } from '@/types';
import logger from '@/utils/logger';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/home',
    categories: ['other'],
    example: '/mspy/home',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'mSpy Home',
    maintainers: ['Your GitHub username'],
    handler,
};

async function handler() {
    const rootUrl = 'https://www.mspy.net/';

    try {
        const data = await cache.tryGet(
            'mspy:home:data',
            async () => {
                logger.info(`Launching Puppeteer to fetch data from ${rootUrl}`);
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.goto(rootUrl, { waitUntil: 'networkidle2' });

                const content = await page.content();
                const $ = load(content);
                logger.debug('Cheerio loaded');

                const seoData = {
                    title: $('title').text(),
                    description: $('meta[name="description"]').attr('content'),
                    keywords: $('meta[name="keywords"]').attr('content'),
                    h1: $('h1').text(),
                    h2: $('h2')
                        .map((_, el) => $(el).text())
                        .get()
                        .join(', '),
                    canonicalUrl: $('link[rel="canonical"]').attr('href'),
                    ogTitle: $('meta[property="og:title"]').attr('content'),
                    ogDescription: $('meta[property="og:description"]').attr('content'),
                    ogImage: $('meta[property="og:image"]').attr('content'),
                    twitterCard: $('meta[name="twitter:card"]').attr('content'),
                    twitterTitle: $('meta[name="twitter:title"]').attr('content'),
                    twitterDescription: $('meta[name="twitter:description"]').attr('content'),
                    twitterImage: $('meta[name="twitter:image"]').attr('content'),
                    structuredData: $('script[type="application/ld+json"]').html(),
                };

                await browser.close();
                logger.info('Data fetched successfully');
                return seoData;
            },
            60 * 60 * 12
        ); // Cache for 24 hours

        const items = [
            {
                title: 'mSpy Home Page',
                description: generateDescription(data),
                link: rootUrl,
                pubDate: parseDate(new Date().toUTCString()),
            },
        ];

        logger.info('Handler completed successfully');

        return {
            title: 'mSpy Home',
            link: rootUrl,
            item: items,
        };
    } catch (error) {
        logger.error(`Error in handler: ${error}`);
        throw error;
    }
}

function generateDescription(data) {
    return `
        <h2>Basic SEO Elements</h2>
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Keywords:</strong> ${data.keywords}</p>
        <p><strong>H1:</strong> ${data.h1}</p>
        <p><strong>H2:</strong> ${data.h2}</p>
        <p><strong>Canonical URL:</strong> ${data.canonicalUrl}</p>

        <h2>Open Graph Data</h2>
        <p><strong>OG Title:</strong> ${data.ogTitle}</p>
        <p><strong>OG Description:</strong> ${data.ogDescription}</p>
        <p><strong>OG Image:</strong> ${data.ogImage}</p>

        <h2>Twitter Card Data</h2>
        <p><strong>Twitter Card:</strong> ${data.twitterCard}</p>
        <p><strong>Twitter Title:</strong> ${data.twitterTitle}</p>
        <p><strong>Twitter Description:</strong> ${data.twitterDescription}</p>
        <p><strong>Twitter Image:</strong> ${data.twitterImage}</p>

        <h2>Structured Data</h2>
        <pre>${data.structuredData}</pre>
    `;
}
