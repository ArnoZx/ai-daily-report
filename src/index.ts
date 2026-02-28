import cron from "node-cron";
import { fetchAllNews } from "./rss.js";
import { fetchProductHuntDaily, filterAiProducts } from "./producthunt.js";
import { generateSummary } from "./summarize.js";
import { buildFinalReport } from "./report.js";
import { sendToSlack } from "./slack.js";

// ---- 加载 .env (简易实现，无需 dotenv 依赖) ----
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log("✓ Loaded .env");
}

// ---- 核心任务 ----

async function runDailyReport(): Promise<void> {
  const startTime = Date.now();
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`🚀 AI Daily Report - ${today}`);
  console.log(`${"=".repeat(50)}\n`);

  try {
    // 1. 获取 RSS 新闻
    const news = await fetchAllNews();

    // 2. 获取 Product Hunt 排行榜
    const phAll = await fetchProductHuntDaily();
    const phAi = filterAiProducts(phAll);
    // 如果 AI 过滤后太少，就用全部
    const phProducts = phAi.length >= 3 ? phAi : phAll;

    console.log(`\n📊 Data collected: ${news.length} news + ${phProducts.length} PH products`);

    // 3. 尝试 AI 摘要
    const aiSummary = await generateSummary(news, phProducts, today);

    // 4. 构建最终报告
    const report = buildFinalReport(aiSummary, news, phProducts, today);

    // 5. 发送到 Slack
    await sendToSlack(report);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Done in ${elapsed}s`);
  } catch (err) {
    console.error(`\n❌ Fatal error: ${(err as Error).message}`);
    console.error((err as Error).stack);

    // 尝试发送错误通知到 Slack
    try {
      await sendToSlack(`❌ *AI 日报生成失败*\n\`\`\`${(err as Error).message}\`\`\``);
    } catch {
      // 忽略
    }
  }
}

// ---- CLI 入口 ----

const args = process.argv.slice(2);

if (args.includes("--now") || args.includes("-n")) {
  // 立即执行一次
  console.log("🏃 Running immediately...");
  runDailyReport().then(() => process.exit(0));
} else if (args.includes("--cron") || args.includes("-c")) {
  // 定时执行模式
  const schedule = process.env.CRON_SCHEDULE ?? "0 9 * * *";

  if (!cron.validate(schedule)) {
    console.error(`❌ Invalid cron expression: ${schedule}`);
    process.exit(1);
  }

  console.log(`⏰ Cron mode: scheduled at "${schedule}"`);
  console.log("   (Press Ctrl+C to stop)\n");

  cron.schedule(schedule, () => {
    runDailyReport();
  });

  // 保持进程运行
  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down...");
    process.exit(0);
  });
} else {
  // 默认：立即执行
  console.log("Usage:");
  console.log("  npm run dev     # 立即执行一次");
  console.log("  npm run cron    # 定时执行模式");
  console.log("");
  console.log("Running once now...\n");
  runDailyReport().then(() => process.exit(0));
}
