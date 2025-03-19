import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';

export const route: Route = {
    path: '/feed',
    categories: ['programming'],
    example: '/mcp-so/feed',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['mcp.so/feed'],
            target: '/feed',
        },
    ],
    name: 'MCP Servers Feed',
    maintainers: ['YourGitHubName'],
    handler,
};

async function handler(ctx) {
    const url = 'https://mcp.so/feed';
    const response = await got({
        method: 'get',
        url,
    });

    const $ = load(response.data);
    const items = [];

    // 直接从网页中提取服务器条目，保持原始顺序
    $('.my-4.cursor-pointer').each((index, element) => {
        const $element = $(element);

        // 基本信息提取
        const serverName = $element.find('h3').text().trim();
        const description = $element.find('.mt-2.text-sm p').text().trim();

        // 提取创建者信息
        let creator = '';
        const createdByText = $element.find('p.mt-0\\.5').text().trim();
        if (createdByText.includes('created by')) {
            creator = createdByText.replace('created by', '').trim();
        }

        // 提取提交时间文本（保持原HTML中的写法，用于显示）
        const submissionTimeText = $element.find('.whitespace-nowrap').text().trim();

        // 生成假的pubDate，确保排序与HTML一致（最新的在前面）
        const now = new Date();
        const fakePubDate = new Date(now.getTime() - index * 60000); // 每个条目间隔1分钟

        // 提取链接
        let link = url;
        const linkElement = $element.find('a.font-medium.text-primary');
        if (linkElement.length > 0) {
            const relativePath = linkElement.attr('href');
            if (relativePath) {
                link = new URL(relativePath, 'https://mcp.so').href;
            }
        }

        // 提取图标
        let imageUrl = '';
        const imageElement = $element.find('img').first(); // 获取第一个img元素，通常是图标
        if (imageElement.length > 0) {
            imageUrl = imageElement.attr('src') || '';
            // 如果是相对路径，转换为绝对路径
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, 'https://mcp.so').href;
            }
        }

        // 生成唯一GUID
        const guid = `mcp-${serverName}-${creator || 'unknown'}-${fakePubDate.getTime()}`;

        // 构建富文本描述，包含原始提交时间
        const richDescription = buildRichDescription(description, creator, submissionTimeText);

        items.push({
            title: serverName,
            author: creator,
            description: richDescription,
            link,
            pubDate: fakePubDate.toUTCString(), // 使用假的标准时间格式
            guid,
            enclosure_url: imageUrl, // 使用enclosure_url来设置图片
            enclosure_type: 'image/jpeg' // 设置enclosure的类型
        });
    });

    return {
        title: 'MCP Servers Feed',
        link: url,
        description: 'MCP Servers and MCP Clients submitted by users recently.',
        item: items,
    };
}

/**
 * 构建富文本描述，包含所有信息
 * @param {string} description - 服务器描述
 * @param {string} creator - 创建者
 * @param {string} submissionTime - 提交时间
 * @returns {string} HTML格式的富文本描述
 */
function buildRichDescription(description, creator, submissionTime) {
    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

    // 添加描述
    if (description) {
        html += `<p>${description}</p>`;
    }

    // 添加元数据（创建者和原始提交时间）
    html += '<div style="margin-top: 10px; font-size: 0.9em; color: #666;">';
    if (creator) {
        html += `<p>Created by: ${creator}</p>`;
    }
    if (submissionTime) {
        html += `<p>submission time: ${submissionTime}</p>`; // 在描述中显示原始提交时间
    }
    html += '</div>';

    html += '</div>';
    return html;
}
