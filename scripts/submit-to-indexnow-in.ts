/**
 * IndexNow API - Automated URL Submission (www.streamvault.in ONLY)
 * Submits ONLY show/movie detail pages (not watch pages)
 */

import { readFileSync } from "fs";
import { join } from "path";

// Configuration - www.streamvault.in ONLY
const SITE_URL = "https://www.streamvault.in";
const FIXED_API_KEY = "d3f0e531922e4e1785c3e8617e27eee6";

const API_KEY_FILE = join(process.cwd(), "indexnow-key-in.txt");

// Official shared IndexNow endpoint
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function getOrCreateApiKey(): string {
  try {
    const existing = readFileSync(API_KEY_FILE, "utf-8").trim();
    if (existing === FIXED_API_KEY) {
      console.log("✅ Using existing IndexNow API key");
      return existing;
    }
  } catch {
    // ignore missing file
  }

  console.log("✅ Using fixed IndexNow API key:", FIXED_API_KEY);
  return FIXED_API_KEY;
}

async function submitBatchToIndexNow(
  urls: string[],
  apiKey: string,
): Promise<boolean> {
  if (urls.length === 0) {
    console.log("⚠️ No URLs to submit");
    return true;
  }

  const payload = {
    host: new URL(SITE_URL).hostname, // www.streamvault.in
    key: apiKey,
    keyLocation: `${SITE_URL}/${apiKey}.txt`,
    urlList: urls,
  };

  console.log(
    `📦 Submitting ${urls.length} URLs to IndexNow for ${payload.host}...`,
  );

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log("🔎 Status:", response.status, response.statusText);
    console.log("🔎 Response body:", text);

    if (response.status === 200 || response.status === 202) {
      console.log("✅ URLs submitted successfully to IndexNow");
      return true;
    } else {
      console.error("❌ IndexNow submission failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Error submitting to IndexNow:", error);
    return false;
  }
}

async function generateDetailPageUrls(): Promise<string[]> {
  const urls: string[] = [];
  const { storage } = await import("../server/storage.js");

  // Static pages
  const staticPages = [
    "",
    "/shows",
    "/movies",
    "/browse-shows",
    "/browse-movies",
    "/search",
    "/about",
    "/contact",
    "/help",
    "/faq",
    "/privacy",
    "/terms",
    "/dmca",
    "/blog", // Blog index page
  ];

  staticPages.forEach((page) => {
    urls.push(`${SITE_URL}${page}`);
  });

  // Add show DETAIL pages ONLY (not watch pages)
  console.log("📺 Fetching shows from database...");
  const shows = await storage.getAllShows();
  console.log(` Found ${shows.length} shows`);

  for (const show of shows) {
    urls.push(`${SITE_URL}/show/${show.slug}`);
    // NO watch pages - skip episodes
  }

  // Add movie DETAIL pages ONLY (not watch-movie pages)
  console.log("🎬 Fetching movies from database...");
  const movies = await storage.getAllMovies();
  console.log(` Found ${movies.length} movies`);

  movies.forEach((movie: any) => {
    urls.push(`${SITE_URL}/movie/${movie.slug}`);
    // NO watch-movie pages
  });

  // Add blog post pages
  console.log("📝 Fetching blog posts from database...");
  const blogPosts = await storage.getAllBlogPosts();
  console.log(` Found ${blogPosts.length} blog posts`);

  blogPosts.forEach((post: any) => {
    urls.push(`${SITE_URL}/blog/${post.slug}`);
  });

  return urls;
}

async function main() {
  console.log("🚀 IndexNow URL Submission Tool for StreamVault\n");
  console.log("📍 Domain: www.streamvault.in ONLY");
  console.log("📄 Pages: Show/Movie DETAIL pages ONLY (no watch pages)\n");

  const apiKey = getOrCreateApiKey();

  const allUrls = await generateDetailPageUrls();
  console.log(`📋 Total detail page URLs: ${allUrls.length}`);

  // FIRST: test with a very small batch
  const testUrls = allUrls.slice(0, 3);
  console.log("\n🧪 Testing IndexNow with first 3 URLs:");
  console.log(testUrls.join("\n"));

  const testOk = await submitBatchToIndexNow(testUrls, apiKey);
  if (!testOk) {
    console.log(
      "\n⚠️ Test batch failed. Check the status/response above before sending all URLs.",
    );
    return;
  }

  // If test passed, you can now safely send the full list.
  console.log("\n✅ Test batch succeeded. Submitting all URLs...\n");
  await submitBatchToIndexNow(allUrls, apiKey);
}

export { getOrCreateApiKey, submitBatchToIndexNow };

main().catch(console.error);
