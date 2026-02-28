import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "./rss.js";
import type { PHProduct } from "./producthunt.js";

const SYSTEM_PROMPT = `你是一位资深 AI 行业分析师，负责撰写每日 AI 行业日报。

要求：
1. 用中文撰写，语言简洁专业
2. 从提供的原始新闻中提炼出 5-8 条最值得关注的新闻
3. 按重要性排序，每条新闻包含：标题、1-2 句核心分析、原文链接
4. 分为两个板块：「🔥 AI 行业动态」和「🚀 Product Hunt AI 新品」
5. 在末尾加一段 「📊 趋势洞察」，用 2-3 句话总结当天的整体趋势
6. 使用 Slack mrkdwn 格式（*bold*, _italic_, <url|text> 超链接）
7. 不要使用 Markdown 的 # 标题和 ** 加粗，用 Slack 的格式`;

/**
 * 使用 AI 生成中文分析日报
 * 
 * 支持两种配置方式：
 * 1. 智谱 GLM：设置 ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic + ANTHROPIC_AUTH_TOKEN
 * 2. Anthropic：设置 ANTHROPIC_API_KEY（原生）
 * 
 * 通过 AI_MODEL 环境变量指定模型，默认 glm-5
 */
export async function generateSummary(
  news: NewsItem[],
  phProducts: PHProduct[],
  date: string
): Promise<string | null> {
  // Anthropic SDK 自动读取 ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("⚠️  No API key configured, skipping AI summary");
    console.log("   Set ANTHROPIC_AUTH_TOKEN (for GLM) or ANTHROPIC_API_KEY (for Claude)");
    return null;
  }

  const model = process.env.AI_MODEL ?? "glm-5";
  const baseURL = process.env.ANTHROPIC_BASE_URL;

  console.log(`🤖 Generating summary with model=${model}${baseURL ? ` via ${baseURL}` : ""}...`);

  const client = new Anthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const newsText = news
    .slice(0, 30)
    .map((n, i) => `[${i + 1}] [${n.source}] ${n.title}\n    ${n.summary}\n    ${n.link}`)
    .join("\n\n");

  const phText = phProducts
    .map(
      (p, i) =>
        `[${i + 1}] ${p.name} - ${p.tagline} (↑${p.upvotes} 💬${p.comments})\n    Topics: ${p.topics.join(", ")}\n    ${p.url}`
    )
    .join("\n\n");

  const userPrompt = `以下是 ${date} 的 AI 相关新闻和 Product Hunt 发布数据，请生成今日 AI 日报。

=== AI 新闻（RSS 聚合） ===
${newsText || "(今日暂无新闻)"}

=== Product Hunt 每日排行榜 ===
${phText || "(今日暂无数据)"}

请生成日报。`;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    console.log(`  ✓ Summary generated (${text.length} chars)`);
    return text;
  } catch (err) {
    console.error(`  ✗ API error: ${(err as Error).message}`);
    return null;
  }
}
