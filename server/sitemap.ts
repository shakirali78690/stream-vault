import type { Express, Request } from "express";
import type { IStorage } from "./storage";
import type { Show, Movie, Anime, Category } from "@shared/schema";

// Get base URL from request host
function getBaseUrl(req: Request): string {
  const host = req.get('host') || 'streamvault.live';
  const protocol = req.protocol || 'https';

  // Handle known domains
  if (host.includes('streamvault.in')) {
    return 'https://streamvault.in';
  }
  return 'https://streamvault.live';
}

export function setupSitemaps(app: Express, storage: IStorage) {
  // Dynamic robots.txt based on domain
  app.get("/robots.txt", (req, res) => {
    const baseUrl = getBaseUrl(req);

    const robotsTxt = `# StreamVault - Free Streaming Platform
# ${baseUrl}

User-agent: *

# Main Pages
Allow: /
Allow: /series
Allow: /movies
Allow: /trending
Allow: /search
Allow: /browse
Allow: /browse/shows
Allow: /browse/movies
Allow: /watchlist
Allow: /continue-watching
Allow: /sitemap

# Content Detail Pages (main canonical pages)
Allow: /show/*
Allow: /movie/*
Allow: /anime/*
Allow: /category/*

# Blog & Articles (SEO content)
Allow: /blog
Allow: /blog/*

# User Features
Allow: /request
Allow: /report

# Info Pages
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms
Allow: /dmca
Allow: /help
Allow: /faq

# Block watch pages (thin content, use canonical to detail pages)
Disallow: /watch/*
Disallow: /watch-movie/*
Disallow: /watch-anime/*

# Block admin and API endpoints
Disallow: /admin
Disallow: /admin/*
Disallow: /api/
Disallow: /api/*

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1
`;

    res.header("Content-Type", "text/plain");
    res.send(robotsTxt);
  });

  // Single comprehensive sitemap with all pages - DOMAIN AWARE
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const lastmod = new Date().toISOString().split("T")[0];

      // Static pages - all public routes
      const staticPages = [
        // Main pages
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/series", priority: "0.9", changefreq: "daily" },
        { url: "/movies", priority: "0.9", changefreq: "daily" },
        { url: "/trending", priority: "0.9", changefreq: "daily" },
        { url: "/blog", priority: "0.9", changefreq: "daily" },
        { url: "/search", priority: "0.8", changefreq: "weekly" },
        // Browse pages
        { url: "/browse", priority: "0.8", changefreq: "daily" },
        { url: "/browse/shows", priority: "0.8", changefreq: "daily" },
        { url: "/browse/movies", priority: "0.8", changefreq: "daily" },
        // Anime
        { url: "/anime", priority: "0.9", changefreq: "daily" },
        // User features
        { url: "/watchlist", priority: "0.7", changefreq: "weekly" },
        { url: "/continue-watching", priority: "0.7", changefreq: "weekly" },
        { url: "/request", priority: "0.7", changefreq: "monthly" },
        { url: "/report", priority: "0.7", changefreq: "monthly" },
        // Info pages
        { url: "/about", priority: "0.6", changefreq: "monthly" },
        { url: "/contact", priority: "0.6", changefreq: "monthly" },
        { url: "/help", priority: "0.6", changefreq: "monthly" },
        { url: "/faq", priority: "0.6", changefreq: "monthly" },
        { url: "/privacy", priority: "0.5", changefreq: "monthly" },
        { url: "/terms", priority: "0.5", changefreq: "monthly" },
        { url: "/dmca", priority: "0.5", changefreq: "monthly" },
        { url: "/sitemap", priority: "0.5", changefreq: "weekly" },
      ];

      let allUrls: string[] = [];

      // Add static pages
      staticPages.forEach(page => {
        allUrls.push(`
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
      });

      // Add categories
      const categories = await storage.getAllCategories();
      categories.forEach((category: Category) => {
        allUrls.push(`
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
      });

      // Add shows (ONLY detail pages, NOT watch pages)
      const shows = await storage.getAllShows();
      for (const show of shows) {
        const title = (show.title || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const description = (show.description || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const posterUrl = (show.posterUrl || "").replace(/&/g, "&amp;");
        const backdropUrl = (show.backdropUrl || "").replace(/&/g, "&amp;");

        // Show detail page (canonical page)
        let showUrl = `
  <url>
    <loc>${baseUrl}/show/${show.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>`;

        if (posterUrl && posterUrl.startsWith('http')) {
          showUrl += `
    <image:image>
      <image:loc>${posterUrl}</image:loc>
      <image:title>${title}</image:title>
      <image:caption>${description}</image:caption>
    </image:image>`;
        }
        if (backdropUrl && backdropUrl.startsWith('http')) {
          showUrl += `
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Backdrop</image:title>
    </image:image>`;
        }

        showUrl += `
  </url>`;
        allUrls.push(showUrl);

        // Blog article page for show
        let blogShowUrl = `
  <url>
    <loc>${baseUrl}/blog/show/${show.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

        if (backdropUrl && backdropUrl.startsWith('http')) {
          blogShowUrl += `
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Complete Guide, Cast &amp; Reviews</image:title>
    </image:image>`;
        }

        blogShowUrl += `
  </url>`;
        allUrls.push(blogShowUrl);

        // NOTE: Removed episode watch URLs to fix duplicate content issues
        // Watch pages now have canonical tags pointing to show detail pages
      }

      // Add movies (detail pages and blog, NOT watch-movie pages in robots)
      const movies = await storage.getAllMovies();
      for (const movie of movies) {
        const title = (movie.title || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const description = (movie.description || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const posterUrl = (movie.posterUrl || "").replace(/&/g, "&amp;");
        const backdropUrl = (movie.backdropUrl || "").replace(/&/g, "&amp;");

        // Movie detail page (canonical)
        let movieUrl = `
  <url>
    <loc>${baseUrl}/movie/${movie.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>`;

        if (posterUrl && posterUrl.startsWith('http')) {
          movieUrl += `
    <image:image>
      <image:loc>${posterUrl}</image:loc>
      <image:title>${title}</image:title>
      <image:caption>${description}</image:caption>
    </image:image>`;
        }
        if (backdropUrl && backdropUrl.startsWith('http')) {
          movieUrl += `
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Backdrop</image:title>
    </image:image>`;
        }

        movieUrl += `
  </url>`;
        allUrls.push(movieUrl);

        // Blog article page for movie
        let blogMovieUrl = `
  <url>
    <loc>${baseUrl}/blog/movie/${movie.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

        if (backdropUrl && backdropUrl.startsWith('http')) {
          blogMovieUrl += `
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Complete Guide, Cast &amp; Reviews</image:title>
    </image:image>`;
        }

        blogMovieUrl += `
  </url>`;
        allUrls.push(blogMovieUrl);

        // NOTE: Removed watch-movie URLs - robots.txt disallows them
        // Watch pages have canonical tags pointing to movie detail pages
      }

      // Add anime (detail pages and blog)
      const allAnime = await storage.getAllAnime();
      for (const anime of allAnime) {
        const title = (anime.title || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const description = (anime.description || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const posterUrl = (anime.posterUrl || "").replace(/&/g, "&amp;");
        const backdropUrl = (anime.backdropUrl || "").replace(/&/g, "&amp;");

        // Anime detail page (canonical)
        let animeUrl = `
  <url>
    <loc>${baseUrl}/anime/${anime.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>`;

        if (posterUrl && posterUrl.startsWith('http')) {
          animeUrl += `
    <image:image>
      <image:loc>${posterUrl}</image:loc>
      <image:title>${title}</image:title>
      <image:caption>${description}</image:caption>
    </image:image>`;
        }
        if (backdropUrl && backdropUrl.startsWith('http')) {
          animeUrl += `
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Backdrop</image:title>
    </image:image>`;
        }

        animeUrl += `
  </url>`;
        allUrls.push(animeUrl);

        // Blog article page for anime
        let blogAnimeUrl = `
  <url>
    <loc>${baseUrl}/blog/anime/${anime.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

        if (backdropUrl && backdropUrl.startsWith('http')) {
          blogAnimeUrl += `
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Complete Guide, Cast &amp; Reviews</image:title>
    </image:image>`;
        }

        blogAnimeUrl += `
  </url>`;
        allUrls.push(blogAnimeUrl);
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${allUrls.join("")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  console.log("✅ Dynamic sitemap and robots.txt configured for both domains");
}

