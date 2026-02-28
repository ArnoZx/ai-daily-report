import Parser from "rss-parser";
import { AI_FEEDS, type FeedSource } from "./feeds.js";

const parser = new Parser({
  timeout: 10_000,
  headers: {
    "User-Agent": "AI-Daily-Report/1.0",
  },
});

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  summary: string;
  pubDate: string;
  /** ISO date string for sorting */
  isoDate: string;
}

/**
 * 判断文章是否匹配关键词过滤
 */
function matchesKeywords(item: { title?: string; contentSnippet?: string }, keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) return true;
  const text = `${item.title ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

/**
 * 判断文章是否在最近 N 小时内发布
 */
function isRecent(isoDate: string | undefined, hoursAgo = 36): boolean {
  if (!isoDate) return true; // 没有日期就保留
  const pubTime = new Date(isoDate).getTime();
  const cutoff = Date.now() - hoursAgo * 60 * 60 * 1000;
  return pubTime >= cutoff;
}

/**
 * 从单个 RSS 源获取文章
 */
async function fetchFeed(source: FeedSource): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items ?? [])
      .filter((item) => matchesKeywords(item, source.keywords))
      .filter((item) => isRecent(item.isoDate))
      .slice(0, source.maxItems ?? 10)
      .map((item) => ({
        source: source.name,
        title: item.title?.trim() ?? "(no title)",
        link: item.link ?? "",
        summary: (item.contentSnippet ?? "").slice(0, 300).trim(),
        pubDate: item.pubDate ?? "",
        isoDate: item.isoDate ?? new Date().toISOString(),
      }));
    console.log(`  ✓ ${source.name}: ${items.length} articles`);
    return items;
  } catch (err) {
    console.error(`  ✗ ${source.name}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * 从所有 RSS 源获取 AI 新闻，按时间倒序排列
 */
export async function fetchAllNews(): Promise<NewsItem[]> {
  console.log("📡 Fetching RSS feeds...");

  const results = await Promise.allSettled(AI_FEEDS.map(fetchFeed));

  const allItems = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // 去重（同一标题）
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 按时间倒序
  unique.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

  console.log(`📰 Total unique articles: ${unique.length}`);
  return unique;
}
