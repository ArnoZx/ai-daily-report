import * as cheerio from "cheerio";

export interface TrendingRepo {
  rank: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  todayStars: number;
}

/**
 * 获取 GitHub Trending 排行榜
 */
export async function fetchGitHubTrending(): Promise<TrendingRepo[]> {
  const url = "https://github.com/trending";
  console.log(`🔍 Fetching GitHub Trending: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AI-Daily-Report/1.0",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      console.error(`  ✗ GitHub Trending: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const repos = parseTrending(html);
    console.log(`  ✓ GitHub Trending: ${repos.length} repos found`);
    return repos;
  } catch (err) {
    console.error(`  ✗ GitHub Trending: ${(err as Error).message}`);
    return [];
  }
}

/**
 * 解析 GitHub Trending 页面 HTML
 */
function parseTrending(html: string): TrendingRepo[] {
  const $ = cheerio.load(html);
  const repos: TrendingRepo[] = [];
  let rank = 0;

  $("article.Box-row").each((_, el) => {
    rank++;
    const $el = $(el);

    // 仓库全名：owner/repo
    const fullName = $el.find("h2 a").text().replace(/\s+/g, "").trim();
    if (!fullName) return;

    const name = fullName.split("/").pop() ?? fullName;
    const url = `https://github.com/${fullName}`;

    // 描述
    const description = $el.find("p").first().text().trim();

    // 编程语言
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim();

    // 总 star 数
    const starsText = $el
      .find('a[href$="/stargazers"]')
      .first()
      .text()
      .trim()
      .replace(/,/g, "");
    const stars = parseInt(starsText) || 0;

    // 今日 star 数
    const todayText = $el.find("span.d-inline-block.float-sm-right").text().trim();
    const todayMatch = todayText.match(/([\d,]+)\s+stars?\s+today/i);
    const todayStars = todayMatch ? parseInt(todayMatch[1].replace(/,/g, "")) : 0;

    repos.push({ rank, name, fullName, description, url, language, stars, todayStars });
  });

  return repos.slice(0, 15);
}
