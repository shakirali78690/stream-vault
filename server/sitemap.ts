import type { Express } from "express";
import type { IStorage } from "./storage";
import type { Show, Category } from "@shared/schema";

export function setupSitemaps(app: Express, storage: IStorage) {
  const baseUrl = process.env.BASE_URL || "https://streamvault.live";

  // Main sitemap index
  app.get("/sitemap.xml", async (_req, res) => {
    const lastmod = new Date().toISOString().split("T")[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-main.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-shows.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-categories.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-episodes.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  });

  // Main pages sitemap
  app.get("/sitemap-main.xml", async (_req, res) => {
    const lastmod = new Date().toISOString().split("T")[0];

    const pages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/series", priority: "0.9", changefreq: "daily" },
      { url: "/movies", priority: "0.9", changefreq: "daily" },
      { url: "/trending", priority: "0.9", changefreq: "daily" },
      { url: "/search", priority: "0.8", changefreq: "weekly" },
      { url: "/watchlist", priority: "0.7", changefreq: "weekly" },
    ];

    const urls = pages
      .map(
        (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  });

  // Categories sitemap
  app.get("/sitemap-categories.xml", async (_req, res) => {
    const lastmod = new Date().toISOString().split("T")[0];
    const categories = await storage.getAllCategories();

    const urls = categories
      .map(
        (category: Category) => `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  });

  // Shows sitemap with images and metadata
  app.get("/sitemap-shows.xml", async (_req, res) => {
    try {
      const lastmod = new Date().toISOString().split("T")[0];
      const shows = await storage.getAllShows();

      if (!shows || shows.length === 0) {
        const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>`;
        res.header("Content-Type", "application/xml");
        return res.send(emptyXml);
      }

      const urls = shows
        .map((show: Show) => {
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

          // Escape URLs for XML
          const posterUrl = (show.posterUrl || "").replace(/&/g, "&amp;");
          const backdropUrl = (show.backdropUrl || "").replace(/&/g, "&amp;");

          return `
  <url>
    <loc>${baseUrl}/show/${show.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${posterUrl}</image:loc>
      <image:title>${title}</image:title>
      <image:caption>${description}</image:caption>
    </image:image>
    <image:image>
      <image:loc>${backdropUrl}</image:loc>
      <image:title>${title} - Backdrop</image:title>
    </image:image>
  </url>`;
        })
        .join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Error generating shows sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Episodes sitemap - all individual episode watch pages
  app.get("/sitemap-episodes.xml", async (_req, res) => {
    try {
      const lastmod = new Date().toISOString().split("T")[0];
      const shows = await storage.getAllShows();
      
      if (!shows || shows.length === 0) {
        const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>`;
        res.header("Content-Type", "application/xml");
        return res.send(emptyXml);
      }
      
      let allEpisodeUrls: string[] = [];

      // Get all episodes for all shows
      for (const show of shows) {
        try {
          const episodes = await storage.getEpisodesByShowId(show.id);
          
          if (!episodes || episodes.length === 0) continue;
          
          const episodeUrls = episodes.map((episode) => {
            const episodeTitle = `${show.title || ""} - S${episode.season}E${episode.episodeNumber}`;
            const escapedTitle = episodeTitle
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&apos;");

            // Escape thumbnail URL for XML
            const thumbnailUrl = (episode.thumbnailUrl || "").replace(/&/g, "&amp;");

            return `
  <url>
    <loc>${baseUrl}/watch/${show.slug}/${episode.season}/${episode.episodeNumber}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${thumbnailUrl}</image:loc>
      <image:title>${escapedTitle}</image:title>
    </image:image>
  </url>`;
          });

          allEpisodeUrls = allEpisodeUrls.concat(episodeUrls);
        } catch (err) {
          console.error(`Error getting episodes for show ${show.id}:`, err);
          continue;
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${allEpisodeUrls.join("")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Error generating episodes sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  console.log("✅ Sitemaps configured with episodes");
}
