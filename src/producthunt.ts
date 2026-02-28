import * as cheerio from "cheerio";
import { PRODUCT_HUNT_CONFIG } from "./feeds.js";

export interface PHProduct {
  rank: number;
  name: string;
  tagline: string;
  url: string;
  upvotes: number;
  comments: number;
  topics: string[];
  isAiRelated: boolean;
}

/**
 * 获取 Product Hunt 指定日期的排行榜
 * @param date YYYY/M/D 格式或 Date 对象
 */
export async function fetchProductHuntDaily(date?: Date): Promise<PHProduct[]> {
  const d = date ?? getTargetDate();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const url = `${PRODUCT_HUNT_CONFIG.leaderboardBaseUrl}/${year}/${month}/${day}`;

  console.log(`🔍 Fetching Product Hunt: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AI-Daily-Report/1.0",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      console.error(`  ✗ Product Hunt: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const products = parseLeaderboard(html);
    console.log(`  ✓ Product Hunt: ${products.length} products found`);
    return products;
  } catch (err) {
    console.error(`  ✗ Product Hunt: ${(err as Error).message}`);
    return [];
  }
}

/**
 * 解析排行榜 HTML
 */
function parseLeaderboard(html: string): PHProduct[] {
  const $ = cheerio.load(html);
  const products: PHProduct[] = [];
  let rank = 0;

  // PH 的产品卡片通常是链接到 /products/ 的元素
  // 从页面文本中提取结构化数据
  $('a[href^="/products/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href") ?? "";

    // 跳过非产品链接（如 reviews, categories）
    if (href.includes("/reviews") || href.includes("/categories")) return;

    const name = $el.text().trim();
    if (!name || name.length > 60) return;

    // 查找相邻的 tagline 和 upvote 信息
    const $parent = $el.closest("div");
    const parentText = $parent.text();

    // 提取 topics
    const topics: string[] = [];
    $parent.find('a[href^="/topics/"]').each((_, topicEl) => {
      const topicHref = $(topicEl).attr("href") ?? "";
      const topicSlug = topicHref.replace("/topics/", "");
      if (topicSlug) topics.push(topicSlug);
    });

    // 判断是否 AI 相关
    const isAiRelated =
      topics.some((t) => PRODUCT_HUNT_CONFIG.aiTopics.some((at) => t.includes(at))) ||
      /\b(ai|artificial.intelligence|llm|gpt|claude|agent|ml|machine.learning)\b/i.test(parentText);

    rank++;
    products.push({
      rank,
      name,
      tagline: "", // 将从更完整的解析中填充
      url: `https://www.producthunt.com${href}`,
      upvotes: 0,
      comments: 0,
      topics,
      isAiRelated,
    });
  });

  // 去重（同一 href 可能出现多次）
  const seen = new Set<string>();
  const unique = products.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  // 补充解析：从页面文本提取 upvotes 等数字
  enrichFromPageText($, unique);

  return unique.slice(0, PRODUCT_HUNT_CONFIG.maxItems);
}

/**
 * 从页面文本中补充提取产品信息
 */
function enrichFromPageText($: cheerio.CheerioAPI, products: PHProduct[]): void {
  const bodyText = $("body").text();

  // 尝试提取带数字的模式：产品名 + 描述 + 数字(upvotes) + 数字(comments)
  for (const product of products) {
    const nameEscaped = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 查找产品名之后的文本块
    const pattern = new RegExp(`${nameEscaped}\\s+(.{10,120}?)\\s+(\\d+)\\s+(\\d+)`, "i");
    const match = bodyText.match(pattern);
    if (match) {
      product.tagline = match[1].trim();
      // 较大的数字通常是 upvotes
      const num1 = parseInt(match[2]);
      const num2 = parseInt(match[3]);
      if (num1 > num2) {
        product.upvotes = num1;
        product.comments = num2;
      } else {
        product.comments = num1;
        product.upvotes = num2;
      }
    }
  }
}

/**
 * 获取目标日期（默认昨天，因为今天的数据可能不完整）
 */
function getTargetDate(): Date {
  const offset = parseInt(process.env.PH_DAY_OFFSET ?? "1", 10);
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d;
}

/**
 * 只返回 AI 相关的产品
 */
export function filterAiProducts(products: PHProduct[]): PHProduct[] {
  return products.filter((p) => p.isAiRelated);
}
