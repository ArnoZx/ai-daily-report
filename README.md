# AI Daily Report 📰

自动聚合 AI 行业新闻 + Product Hunt 每日 AI 新品，生成中文日报并推送到 Slack。

## 架构

```
RSS Feeds (免费)          Product Hunt (爬虫)
     │                          │
     ├──────── 聚合 ────────────┤
     │                          │
     ▼                          ▼
  Claude API (可选)  ──→  中文分析摘要
     │
     ▼
  Slack Webhook ──→ 频道推送
```

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，至少填写 SLACK_WEBHOOK_URL

# 3. 立即执行一次（测试）
npm run dev

# 4. 定时执行模式（默认每天 9:00）
npm run cron
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `SLACK_WEBHOOK_URL` | ✅ | Slack Incoming Webhook URL |
| `AI_PROVIDER` | ❌ | `glm`（默认）或 `anthropic` |
| `GLM_API_KEY` | ❌ | 智谱 API Key（推荐，便宜） |
| `GLM_MODEL` | ❌ | 默认 `glm-5`，普通任务可改 `glm-4.7` 省额度 |
| `ANTHROPIC_API_KEY` | ❌ | Claude API Key（备选） |
| `CRON_SCHEDULE` | ❌ | Cron 表达式，默认 `0 9 * * *`（每天 9:00） |
| `PH_DAY_OFFSET` | ❌ | Product Hunt 查几天前的数据，默认 `1`（昨天） |

> **💡 GLM-5 用量提示**：高峰期（14:00-18:00）消耗 3 倍额度，非高峰 2 倍。建议日报定时在早上 9:00 跑（默认）。普通任务用 `glm-4.7` 更省。

## 两种运行模式

### 模式 A：无 AI Key（纯聚合）
只需 `SLACK_WEBHOOK_URL`，输出原始新闻列表 + PH 排行榜。

### 模式 B：有 AI 摘要（推荐）
设置 `GLM_API_KEY`（智谱，便宜）或 `ANTHROPIC_API_KEY`，AI 会从原始数据中：
- 提炼 5-8 条最值得关注的新闻
- 按重要性排序并提供中文分析
- 添加趋势洞察总结

## 部署建议

### 方案 1：服务器 cron（最简单）
```bash
# 用 pm2 保持后台运行
npm install -g pm2
pm2 start npm --name "ai-report" -- run cron
pm2 save
pm2 startup
```

### 方案 2：系统 crontab
```bash
# 编辑 crontab
crontab -e

# 添加每天 9:00 执行
0 9 * * * cd /path/to/ai-daily-report && /usr/local/bin/npx tsx src/index.ts --now >> /var/log/ai-report.log 2>&1
```

### 方案 3：GitHub Actions（免费）
在 `.github/workflows/daily-report.yml` 中配置：
```yaml
name: AI Daily Report
on:
  schedule:
    - cron: '0 1 * * 1-5'  # UTC 1:00 = 北京时间 9:00，周一到周五
  workflow_dispatch:         # 手动触发

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run dev
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          AI_PROVIDER: glm
          GLM_API_KEY: ${{ secrets.GLM_API_KEY }}
          GLM_MODEL: glm-5
```

## 自定义 RSS 源

编辑 `src/feeds.ts`，添加或移除 RSS 源：

```typescript
export const AI_FEEDS: FeedSource[] = [
  {
    name: "机器之心",
    url: "https://www.jiqizhixin.com/rss",
    maxItems: 10,
  },
  // ...
];
```

## 输出示例

```
📰 AI 日报 | 2026/03/01 星期六

🔥 AI 行业动态

1. *OpenAI 完成 1100 亿美元融资*
   估值达 8400 亿美元，Amazon 投资 500 亿...
   <https://example.com|阅读原文>

2. *Perplexity 发布 Computer 多模型 Agent*
   协调 19 个前沿模型自主执行工作流...
   <https://example.com|阅读原文>

🚀 Product Hunt AI 新品

1. KiloClaw — 托管版 OpenClaw (↑682)
2. Notion Custom Agents (↑372)
3. Opal 2.0 by Google Labs (↑337)

📊 趋势洞察
Agent 生态正从概念走向产品化...
```
