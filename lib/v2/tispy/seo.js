const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const md5 = require('@/utils/md5');

module.exports = async (ctx) => {
    const rootUrl = 'https://tispy.net';
    const cache = await ctx.cache.get(rootUrl);
    const currentDate = new Date().toISOString().slice(0, 10);

    let response;
    if (cache) {
        const cachedData = JSON.parse(cache);
        if (cachedData.date === currentDate) {
            response = { data: cachedData.data, headers: cachedData.headers };
        }
    }

    if (!response) {
        response = await got(rootUrl);
        ctx.cache.set(rootUrl, JSON.stringify({
            date: currentDate,
            data: response.data,
            headers: response.headers
        }), 24 * 60 * 60); // Cache for 24 hours
    }

    const $ = cheerio.load(response.data);

    const content = {
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
    };

    const contentHash = md5(JSON.stringify(content));

    let items = [];
    if (cache) {
        const cachedData = JSON.parse(cache);
        if (cachedData.contentHash !== contentHash) {
            items = [
                {
                    title: 'TiSPY SEO Content Updated',
                    description: `
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
                    `,
                    link: rootUrl,
                    pubDate: parseDate(response.headers['last-modified'], 'EEE, dd MMM yyyy HH:mm:ss z'),
                },
            ];
        }
    } else {
        items = [
            {
                title: 'TiSPY SEO Content Initial Fetch',
                description: `
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
                `,
                link: rootUrl,
                pubDate: parseDate(response.headers['last-modified'], 'EEE, dd MMM yyyy HH:mm:ss z'),
            },
        ];
    }

    ctx.cache.set(rootUrl, JSON.stringify({
        date: currentDate,
        data: response.data,
        headers: response.headers,
        contentHash: contentHash
    }), 24 * 60 * 60); // Cache for 24 hours

    ctx.state.data = {
        title: 'TiSPY SEO Changes',
        link: rootUrl,
        item: items,
    };
};
