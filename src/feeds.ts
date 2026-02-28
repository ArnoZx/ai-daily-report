/**
 * RSS 源配置
 * 每个源包含名称、URL 和可选的关键词过滤
 */
export interface FeedSource {
  name: string;
  url: string;
  /** 只保留标题/描述中包含这些关键词的文章（不区分大小写）。为空则保留全部 */
  keywords?: string[];
  /** 最多保留几条 */
  maxItems?: number;
}

export const AI_FEEDS: FeedSource[] = [
  // ---- 核心 AI 媒体 ----
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    maxItems: 10,
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
    maxItems: 10,
  },
  {
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    maxItems: 10,
  },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    keywords: ["ai", "artificial intelligence", "llm", "model", "agent", "openai", "anthropic", "google", "deepmind"],
    maxItems: 8,
  },
  {
    name: "Ars Technica AI",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    keywords: ["ai", "artificial intelligence", "llm", "chatgpt", "claude", "gemini", "openai", "anthropic", "model"],
    maxItems: 8,
  },

  // ---- 开发者向 ----
  {
    name: "Hacker News (AI)",
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+Anthropic+OR+OpenAI&points=50",
    maxItems: 10,
  },

  // ---- 中文 AI 媒体 (可按需添加) ----
  // {
  //   name: "机器之心",
  //   url: "https://www.jiqizhixin.com/rss",
  //   maxItems: 10,
  // },
];

/**
 * Product Hunt 相关配置
 */
export const PRODUCT_HUNT_CONFIG = {
  /** PH 每日排行榜基础 URL */
  leaderboardBaseUrl: "https://www.producthunt.com/leaderboard/daily",
  /** 只保留 AI 相关的 Topic */
  aiTopics: [
    "artificial-intelligence",
    "ai",
    "machine-learning",
    "developer-tools",
    "open-source",
    "vibe-coding",
    "ai-agents",
  ],
  /** 最多展示几条 */
  maxItems: 15,
};
