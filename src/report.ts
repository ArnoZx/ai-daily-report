import type { NewsItem } from "./rss.js";
import type { PHProduct } from "./producthunt.js";

/**
 * 生成不依赖 LLM 的基础日报（Slack mrkdwn 格式）
 */
export function generateBasicReport(
  news: NewsItem[],
  phProducts: PHProduct[],
  date: string
): string {
  const lines: string[] = [];

  lines.push(`📰 *AI 日报 | ${date}*`);
  lines.push("");

  // --- AI 新闻 ---
  if (news.length > 0) {
    lines.push("*🔥 AI 行业动态*");
    lines.push("");

    // 按来源分组，每个来源取前 3 条
    const bySource = new Map<string, NewsItem[]>();
    for (const item of news) {
      const list = bySource.get(item.source) ?? [];
      list.push(item);
      bySource.set(item.source, list);
    }

    // 取各源的头条，总共最多 15 条
    const topNews: NewsItem[] = [];
    for (const [, items] of bySource) {
      topNews.push(...items.slice(0, 3));
    }
    topNews.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

    for (const item of topNews.slice(0, 15)) {
      const sourceBadge = `\`${item.source}\``;
      lines.push(`• ${sourceBadge} <${item.link}|${escapeSlack(item.title)}>`);
      if (item.summary) {
        lines.push(`  ${truncate(item.summary, 120)}`);
      }
    }
  } else {
    lines.push("_今日暂无 AI 新闻更新_");
  }

  lines.push("");

  // --- Product Hunt ---
  if (phProducts.length > 0) {
    lines.push("*🚀 Product Hunt AI 新品*");
    lines.push("");

    for (const p of phProducts.slice(0, 10)) {
      const votes = p.upvotes > 0 ? ` (↑${p.upvotes})` : "";
      const tagline = p.tagline ? ` — ${p.tagline}` : "";
      lines.push(`• <${p.url}|${escapeSlack(p.name)}>${tagline}${votes}`);
      if (p.topics.length > 0) {
        lines.push(`  _${p.topics.slice(0, 4).join(" · ")}_`);
      }
    }
  } else {
    lines.push("_今日暂无 Product Hunt 数据_");
  }

  lines.push("");
  lines.push("---");
  lines.push(`_🤖 由 AI Daily Report 自动生成 | ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}_`);

  return lines.join("\n");
}

/**
 * 组合 AI 摘要和兜底报告
 */
export function buildFinalReport(
  aiSummary: string | null,
  news: NewsItem[],
  phProducts: PHProduct[],
  date: string
): string {
  if (aiSummary) {
    // AI 摘要存在时，加上头部和尾部
    const header = `📰 *AI 日报 | ${date}*\n`;
    const footer = `\n---\n_🤖 由 Claude AI 分析生成 | ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}_`;
    return header + aiSummary + footer;
  }

  // 兜底：纯 RSS 聚合报告
  return generateBasicReport(news, phProducts, date);
}

function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}
