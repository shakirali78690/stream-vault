/**
 * Google Search Console API - Automated URL Submission (www.streamvault.in ONLY)
 * Submits ONLY show/movie detail pages (not watch pages)
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Configuration - www.streamvault.in ONLY
const SITE_URL = "https://www.streamvault.in";
const TRACKING_FILE = "google-submitted-urls-www.json";

const SERVICE_ACCOUNT_KEY_FILE = join(process.cwd(), "google-service-account.json");

// Scopes required for the Indexing API
const SCOPES = ["https://www.googleapis.com/auth/indexing"];

function getTrackingFilePath(): string {
  return join(process.cwd(), "scripts", TRACKING_FILE);
}

function loadSubmittedUrls(): {
  submittedUrls: string[];
  lastSubmission: string | null;
  totalSubmitted: number;
} {
  try {
    const filePath = getTrackingFilePath();
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    console.log(`⚠️ Could not load submitted URLs tracking file, starting fresh`);
  }
  return { submittedUrls: [], lastSubmission: null, totalSubmitted: 0 };
}

function saveSubmittedUrls(
  data: {
    submittedUrls: string[];
    lastSubmission: string | null;
    totalSubmitted: number;
  }
) {
  try {
    const filePath = getTrackingFilePath();
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`⚠️ Could not save submitted URLs tracking file:`, error);
  }
}

function getAuthClient() {
  try {
    const keyFile = readFileSync(SERVICE_ACCOUNT_KEY_FILE, "utf-8");
    const keys = JSON.parse(keyFile);
    const auth = new google.auth.GoogleAuth({
      credentials: keys,
      scopes: SCOPES,
    });
    return auth;
  } catch (error) {
    console.error("❌ Error loading service account key file for Google");
    throw error;
  }
}

async function submitUrlToGoogle(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<boolean> {
  try {
    const auth = getAuthClient();
    const indexing = google.indexing({ version: "v3", auth });
    const response = await indexing.urlNotifications.publish({
      requestBody: { url, type },
    });

    if (response.status === 200) {
      console.log(`✅ Successfully submitted to Google: ${url}`);
      return true;
    } else {
      console.error(
        `❌ Failed to submit ${url}: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error submitting ${url}:`, error.message);
    return false;
  }
}

async function submitBatchToGoogle(
  urls: string[],
  delayMs: number = 1000
): Promise<{ success: number; failed: number }> {
  console.log(`📦 Submitting ${urls.length} URLs to Google...`);
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Submitting: ${url}`);
    const success = await submitUrlToGoogle(url);
    if (success) successCount++;
    else failedCount++;

    if (i < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`📊 Summary: ✅ ${successCount} ❌ ${failedCount}`);
  return { success: successCount, failed: failedCount };
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

  // Add static pages
  staticPages.forEach((page) => {
    urls.push(`${SITE_URL}${page}`);
  });

  // Add show DETAIL pages ONLY (not watch pages)
  console.log(`📺 Fetching shows from database...`);
  const shows = await storage.getAllShows();
  for (const show of shows) {
    urls.push(`${SITE_URL}/show/${show.slug}`);
    // NO watch pages - skip episodes
  }

  // Add movie DETAIL pages ONLY (not watch-movie pages)
  console.log(`🎬 Fetching movies from database...`);
  const movies = await storage.getAllMovies();
  movies.forEach((movie: any) => {
    urls.push(`${SITE_URL}/movie/${movie.slug}`);
    // NO watch-movie pages
  });

  // Add blog post pages
  console.log(`📝 Fetching blog posts from database...`);
  const blogPosts = await storage.getAllBlogPosts();
  blogPosts.forEach((post: any) => {
    urls.push(`${SITE_URL}/blog/${post.slug}`);
  });

  return urls;
}

async function main() {
  console.log("🚀 Google URL Submission Tool for StreamVault\n");
  console.log("📍 Domain: www.streamvault.in ONLY");
  console.log("📄 Pages: Show/Movie DETAIL pages ONLY (no watch pages)\n");

  try {
    const tracking = loadSubmittedUrls();
    console.log(`📊 Previously submitted: ${tracking.totalSubmitted} URLs\n`);

    const allUrls = await generateDetailPageUrls();
    console.log(`📋 Total detail page URLs found: ${allUrls.length}`);

    const pendingUrls = allUrls.filter((url) => !tracking.submittedUrls.includes(url));

    if (pendingUrls.length === 0) {
      console.log(`🎉 All URLs already submitted!\n`);
      return;
    }

    const urlsToSubmit = pendingUrls.slice(0, 200);
    console.log(`📤 Submitting next ${urlsToSubmit.length} URLs\n`);

    const result = await submitBatchToGoogle(urlsToSubmit, 1000);

    const successfulUrls = urlsToSubmit.slice(0, result.success);
    tracking.submittedUrls.push(...successfulUrls);
    tracking.totalSubmitted += result.success;
    tracking.lastSubmission = new Date().toISOString();
    saveSubmittedUrls(tracking);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Submission complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

export { submitUrlToGoogle, submitBatchToGoogle };

main().catch(console.error);
