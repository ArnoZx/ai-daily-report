/**
 * 发送消息到 Slack Webhook
 */
export async function sendToSlack(text: string): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("❌ SLACK_WEBHOOK_URL not set");
    console.log("\n--- Report Preview ---\n");
    console.log(text);
    console.log("\n--- End Preview ---\n");
    return false;
  }

  console.log("📤 Sending to Slack...");

  try {
    // Slack webhook 对单条消息有 40,000 字符限制
    // 如果超长需要分段发送
    const chunks = splitMessage(text, 3800);

    for (let i = 0; i < chunks.length; i++) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chunks[i],
          // 可选：使用 blocks 获得更丰富的格式
          // blocks: [{ type: "section", text: { type: "mrkdwn", text: chunks[i] } }],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`  ✗ Slack HTTP ${res.status}: ${body}`);
        return false;
      }

      // 多段之间稍微等一下，避免 rate limit
      if (i < chunks.length - 1) {
        await sleep(500);
      }
    }

    console.log("  ✓ Sent to Slack successfully");
    return true;
  } catch (err) {
    console.error(`  ✗ Slack error: ${(err as Error).message}`);
    return false;
  }
}

/**
 * 按最大长度分割消息，尽量在换行处断开
 */
function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // 在 maxLen 之前找最后一个换行
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt <= 0) splitAt = maxLen;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt + 1);
  }

  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
