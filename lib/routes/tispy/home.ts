import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { Route } from '@/types';

export const route: Route = {
    path: '/home',
    categories: ['other'],
    example: '/tispy/home',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'SEO Changes',
    maintainers: ['Your GitHub username'],
    handler,
};

async function handler() {
    const rootUrl = 'https://tispy.net';

    const { data: response } = await got(rootUrl);

    const $ = load(response);

    const content = await cache.tryGet('tispy:seo:content', () => ({
            title: $('title').text(),
            description: $('meta[name="description"]').attr('content'),
            keywords: $('meta[name="keywords"]').attr('content'),
            h1: $('h1').text(),
            h2: $('h2').map((_, el) => $(el).text()).get().join(', '),
            canonicalUrl: $('link[rel="canonical"]').attr('href'),
            ogTitle: $('meta[property="og:title"]').attr('content'),
            ogDescription: $('meta[property="og:description"]').attr('content'),
            ogImage: $('meta[property="og:image"]').attr('content'),
            twitterCard: $('meta[name="twitter:card"]').attr('content'),
            twitterTitle: $('meta[name="twitter:title"]').attr('content'),
            twitterDescription: $('meta[name="twitter:description"]').attr('content'),
            twitterImage: $('meta[name="twitter:image"]').attr('content'),
            structuredData: $('script[type="application/ld+json"]').html(),
        }), 60 * 60 * 12); // Cache for 24 hours

    const items = [{
        title: 'TiSPY SEO Content Updated',
        description: generateDescription(content),
        link: rootUrl,
        pubDate: parseDate(new Date().toUTCString()),
    }];

    return {
        title: 'TiSPY SEO Changes',
        link: rootUrl,
        item: items,
    };
}

function generateDescription(content) {
    return `
        <h2>Basic SEO Elements</h2>
        <p><strong>Title:</strong> ${content.title}</p>
        <p><strong>Description:</strong> ${content.description}</p>
        <p><strong>Keywords:</strong> ${content.keywords}</p>
        <p><strong>H1:</strong> ${content.h1}</p>
        <p><strong>H2:</strong> ${content.h2}</p>
        <p><strong>Canonical URL:</strong> ${content.canonicalUrl}</p>

        <h2>Open Graph Data</h2>
        <p><strong>OG Title:</strong> ${content.ogTitle}</p>
        <p><strong>OG Description:</strong> ${content.ogDescription}</p>
        <p><strong>OG Image:</strong> ${content.ogImage}</p>

        <h2>Twitter Card Data</h2>
        <p><strong>Twitter Card:</strong> ${content.twitterCard}</p>
        <p><strong>Twitter Title:</strong> ${content.twitterTitle}</p>
        <p><strong>Twitter Description:</strong> ${content.twitterDescription}</p>
        <p><strong>Twitter Image:</strong> ${content.twitterImage}</p>

        <h2>Structured Data</h2>
        <pre>${content.structuredData}</pre>
    `;
}
