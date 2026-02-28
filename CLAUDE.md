# AI Daily Report

AI 行业日报自动生成器：RSS 聚合 + Product Hunt 爬虫 + GitHub Trending + AI 摘要 + Slack 推送。

## 技术栈

- **运行时**: Node.js 20+, TypeScript (ESM)
- **构建**: tsx 直接运行 .ts，无编译步骤
- **AI**: Anthropic SDK（兼容智谱 GLM 和 Claude）
- **数据源**: rss-parser（RSS）、cheerio（Product Hunt / GitHub Trending HTML 爬虫）
- **推送**: Slack Incoming Webhook
- **定时**: node-cron
- **CI**: GitHub Actions（周一到周五 UTC 1:00 = 北京时间 9:00）

## 常用命令

```bash
npm run dev          # 立即执行一次（--now）
npm run cron         # 定时执行模式（默认每天 9:00）
npm start            # 同 dev
```

## 项目结构

```
src/
├── index.ts         # CLI 入口，.env 加载，cron 调度
├── feeds.ts         # RSS 源配置 + Product Hunt 配置（FeedSource, PRODUCT_HUNT_CONFIG）
├── rss.ts           # RSS 抓取与去重（fetchAllNews）
├── producthunt.ts       # Product Hunt 排行榜 HTML 爬虫（fetchProductHuntDaily）
├── github-trending.ts   # GitHub Trending 爬虫（fetchGitHubTrending）
├── summarize.ts         # AI 摘要生成，使用 Anthropic SDK（generateSummary）
├── report.ts        # 报告组装，Slack mrkdwn 格式（buildFinalReport）
└── slack.ts         # Slack Webhook 发送，支持消息分段（sendToSlack）
```

## 核心流程

1. 并发抓取三个数据源：`fetchAllNews()`、`fetchProductHuntDaily()`、`fetchGitHubTrending()`
2. `generateSummary()` — 调用 AI（GLM/Claude）生成中文分析摘要，无 key 时跳过
3. `buildFinalReport()` — 有 AI 摘要用摘要，否则降级为纯聚合报告
4. `sendToSlack()` — 发送到 Slack，超长消息自动分段

## 环境变量

通过 `.env` 文件配置（项目自带简易 .env 解析，无 dotenv 依赖）：

- `SLACK_WEBHOOK_URL` — 必填，Slack Webhook 地址
- `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_API_KEY` — AI 摘要所需的 API Key
- `ANTHROPIC_BASE_URL` — 智谱 GLM 需设为 `https://open.bigmodel.cn/api/anthropic`
- `AI_MODEL` — 模型名，默认 `glm-5`
- `CRON_SCHEDULE` — cron 表达式，默认 `0 9 * * *`
- `PH_DAY_OFFSET` — PH 查几天前的数据，默认 `1`

## 编码规范

- ESM 模块（`"type": "module"`），导入路径带 `.js` 后缀
- TypeScript strict 模式
- 错误处理采用 graceful degradation：单个 RSS 源失败不影响整体，AI 失败降级为纯聚合
- Slack 消息使用 mrkdwn 格式（`*bold*`, `_italic_`, `<url|text>`），不用 Markdown
- 日志使用 emoji 前缀标记状态（✓ 成功、✗ 失败、⚠️ 警告）
