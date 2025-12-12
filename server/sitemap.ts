import type { Express } from "express";
import type { IStorage } from "./storage";
import type { Show, Category } from "@shared/schema";

export function setupSitemaps(app: Express, storage: IStorage) {
  const baseUrl = process.env.BASE_URL || "https://streamvault.live";

  // Single comprehensive sitemap with all pages
  app.get("/sitemap.xml", async (_req, res) => {
    try {
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

      // Add shows with images
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

        let showUrl = `
  <url>
    <loc>${baseUrl}/show/${show.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>`;

        // Only add images if URLs exist and are valid
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

        // Add blog article page for this show
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

        // Add episodes for this show
        try {
          const episodes = await storage.getEpisodesByShowId(show.id);
          
          episodes.forEach((episode) => {
            const episodeTitle = `${show.title || ""} - S${episode.season}E${episode.episodeNumber}`;
            const escapedTitle = episodeTitle
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&apos;");

            const thumbnailUrl = (episode.thumbnailUrl || "").replace(/&/g, "&amp;");

            let episodeUrl = `
  <url>
    <loc>${baseUrl}/watch/${show.slug}?season=${episode.season}&amp;episode=${episode.episodeNumber}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>`;

            // Only add image if thumbnail URL exists and is valid
            if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
              episodeUrl += `
    <image:image>
      <image:loc>${thumbnailUrl}</image:loc>
      <image:title>${escapedTitle}</image:title>
    </image:image>`;
            }

            episodeUrl += `
  </url>`;
            allUrls.push(episodeUrl);
          });
        } catch (err) {
          console.error(`Error getting episodes for show ${show.id}:`, err);
        }
      }

      // Add movies with images
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

        let movieUrl = `
  <url>
    <loc>${baseUrl}/movie/${movie.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>`;

        // Only add images if URLs exist and are valid
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

        // Add blog article page for this movie
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

        // Add watch-movie page
        let watchMovieUrl = `
  <url>
    <loc>${baseUrl}/watch-movie/${movie.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>`;

        // Only add image if poster URL exists and is valid
        if (posterUrl && posterUrl.startsWith('http')) {
          watchMovieUrl += `
    <image:image>
      <image:loc>${posterUrl}</image:loc>
      <image:title>Watch ${title} Online Free</image:title>
    </image:image>`;
        }

        watchMovieUrl += `
  </url>`;
        allUrls.push(watchMovieUrl);
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

  console.log("✅ Single comprehensive sitemap configured with all pages");
}
