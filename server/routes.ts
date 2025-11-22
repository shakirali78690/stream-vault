import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { watchlistSchema, viewingProgressSchema } from "@shared/schema";
import type { InsertEpisode } from "@shared/schema";
import { readFileSync, existsSync } from "fs";

// Admin credentials (in production, use environment variables and hashed passwords)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "streamvault2024";

// Simple session storage for admin auth
const adminSessions = new Set<string>();

// Simple session ID from header or generate one
function getSessionId(req: any): string {
  return req.headers["x-session-id"] || "default-session";
}

// Admin authentication middleware
function requireAdmin(req: any, res: any, next: any) {
  const authToken = req.headers["x-admin-token"];
  
  if (!authToken || !adminSessions.has(authToken)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all shows
  app.get("/api/shows", async (_req, res) => {
    try {
      const shows = await storage.getAllShows();
      res.json(shows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shows" });
    }
  });

  // Search shows
  app.get("/api/shows/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query required" });
      }

      const shows = await storage.searchShows(query);
      res.json(shows);
    } catch (error) {
      res.status(500).json({ error: "Failed to search shows" });
    }
  });

  // Get show by slug
  app.get("/api/shows/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const show = await storage.getShowBySlug(slug);

      if (!show) {
        return res.status(404).json({ error: "Show not found" });
      }

      res.json(show);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch show" });
    }
  });

  // Get episodes by show ID
  app.get("/api/episodes/:showId", async (req, res) => {
    try {
      const { showId } = req.params;
      const episodes = await storage.getEpisodesByShowId(showId);
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch episodes" });
    }
  });

  // Get all categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const watchlist = await storage.getWatchlist(sessionId);
      res.json(watchlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const item = watchlistSchema.parse(req.body);
      const entry = await storage.addToWatchlist(sessionId, item);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid watchlist item", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:showId", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const { showId } = req.params;
      await storage.removeFromWatchlist(sessionId, showId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Viewing progress endpoints
  app.get("/api/progress", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const progress = await storage.getViewingProgress(sessionId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch viewing progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const progress = viewingProgressSchema.parse(req.body);
      const entry = await storage.updateViewingProgress(sessionId, progress);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid progress data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update viewing progress" });
    }
  });

  // ========== ADMIN ROUTES ==========
  
  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Generate a simple token (in production, use JWT or similar)
        const token = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        adminSessions.add(token);
        
        res.json({ 
          success: true, 
          token,
          message: "Login successful" 
        });
      } else {
        res.status(401).json({ 
          success: false, 
          error: "Invalid credentials" 
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", async (req, res) => {
    const authToken = req.headers["x-admin-token"] as string;
    if (authToken) {
      adminSessions.delete(authToken);
    }
    res.json({ success: true, message: "Logged out" });
  });

  // Verify admin session
  app.get("/api/admin/verify", async (req, res) => {
    const authToken = req.headers["x-admin-token"] as string;
    const isValid = authToken && adminSessions.has(authToken);
    res.json({ valid: isValid });
  });
  
  // Add new show
  app.post("/api/admin/shows", requireAdmin, async (req, res) => {
    try {
      const show = await storage.createShow(req.body);
      res.json(show);
    } catch (error) {
      res.status(500).json({ error: "Failed to create show" });
    }
  });

  // Update show
  app.put("/api/admin/shows/:showId", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      console.log("Updating show:", showId, "with data:", req.body);
      const show = await storage.updateShow(showId, req.body);
      console.log("Updated show:", show);
      res.json(show);
    } catch (error: any) {
      console.error("Update show error:", error);
      res.status(500).json({ error: "Failed to update show", details: error.message });
    }
  });

  // Delete show
  app.delete("/api/admin/shows/:showId", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      await storage.deleteShow(showId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete show" });
    }
  });

  // Delete all shows
  app.delete("/api/admin/shows", requireAdmin, async (req, res) => {
    try {
      const shows = await storage.getAllShows();
      let deleted = 0;
      
      for (const show of shows) {
        await storage.deleteShow(show.id);
        deleted++;
      }
      
      console.log(`🗑️ Deleted ${deleted} shows and their episodes`);
      res.json({ success: true, deleted });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete all shows" });
    }
  });

  // Add new episode
  app.post("/api/admin/episodes", requireAdmin, async (req, res) => {
    try {
      const episode = await storage.createEpisode(req.body);
      res.json(episode);
    } catch (error) {
      res.status(500).json({ error: "Failed to create episode" });
    }
  });

  // Bulk add episodes to a show by slug
  app.post("/api/admin/episodes/bulk", requireAdmin, async (req, res) => {
    try {
      const { slug, episodes } = req.body;
      
      if (!slug || !episodes || !Array.isArray(episodes)) {
        return res.status(400).json({ error: "Slug and episodes array are required" });
      }

      // Find show by slug
      const show = await storage.getShowBySlug(slug);
      if (!show) {
        return res.status(404).json({ error: `Show with slug "${slug}" not found` });
      }

      console.log(`🚀 Adding episodes to: ${show.title}`);

      // Get existing episodes to avoid duplicates
      const existingEpisodes = await storage.getEpisodesByShowId(show.id);
      const existingKeys = new Set(
        existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
      );

      let added = 0;
      let skipped = 0;

      for (const ep of episodes) {
        const key = `${ep.season}-${ep.episodeNumber}`;
        
        if (existingKeys.has(key)) {
          console.log(`   ⏭️  Skipping S${ep.season}E${ep.episodeNumber} (already exists)`);
          skipped++;
          continue;
        }

        const newEpisode: InsertEpisode = {
          showId: show.id,
          season: ep.season,
          episodeNumber: ep.episodeNumber,
          title: ep.title || `Episode ${ep.episodeNumber}`,
          description: ep.description || `Episode ${ep.episodeNumber} of ${show.title}`,
          thumbnailUrl: ep.thumbnailUrl || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`,
          duration: ep.duration || 45,
          googleDriveUrl: ep.googleDriveUrl,
          airDate: ep.airDate || new Date().toISOString().split("T")[0],
        };

        try {
          await storage.createEpisode(newEpisode);
          console.log(`   ✅ Added S${ep.season}E${ep.episodeNumber}`);
          added++;
        } catch (error) {
          console.error(`   ❌ Failed to add S${ep.season}E${ep.episodeNumber}:`, error);
          skipped++;
        }
      }

      console.log(`\n✨ Completed! Added: ${added}, Skipped: ${skipped}`);

      res.json({
        success: true,
        show: show.title,
        added,
        skipped,
        total: added + skipped
      });
    } catch (error: any) {
      console.error("❌ Bulk add failed:", error);
      res.status(500).json({ 
        error: "Failed to add episodes", 
        details: error.message 
      });
    }
  });

  // Update episode
  app.put("/api/admin/episodes/:episodeId", requireAdmin, async (req, res) => {
    try {
      const { episodeId } = req.params;
      const episode = await storage.updateEpisode(episodeId, req.body);
      res.json(episode);
    } catch (error) {
      res.status(500).json({ error: "Failed to update episode" });
    }
  });

  // Delete episode
  app.delete("/api/admin/episodes/:episodeId", requireAdmin, async (req, res) => {
    try {
      const { episodeId } = req.params;
      await storage.deleteEpisode(episodeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete episode" });
    }
  });

  // Import shows and episodes from JSON file
  app.post("/api/admin/import-shows-episodes", requireAdmin, async (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      console.log(`🚀 Starting show and episode import from: ${filePath}`);

      // Check if file exists
      if (!existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return res.status(404).json({ 
          error: "File not found", 
          details: `The file "${filePath}" does not exist. Please check the path and try again.` 
        });
      }

      // Read and parse JSON
      let rawData: string;
      let importData: any;
      try {
        rawData = readFileSync(filePath, "utf-8");
        importData = JSON.parse(rawData);
      } catch (error: any) {
        return res.status(400).json({ 
          error: "Invalid JSON file", 
          details: error.message 
        });
      }

      console.log(`📊 Found ${importData.total_shows} shows with ${importData.total_episodes} episodes`);

      let showsCreated = 0;
      let showsSkipped = 0;
      let episodesImported = 0;
      let episodesSkipped = 0;

      // Process each show
      for (const importedShow of importData.shows) {
        // Check if show already exists
        const existingShow = await storage.getShowBySlug(importedShow.slug);
        
        let showId: string;
        if (existingShow) {
          console.log(`⏭️  Show already exists: ${importedShow.title}`);
          showId = existingShow.id;
          showsSkipped++;
        } else {
          // Create new show with default values
          const totalSeasons = Object.keys(importedShow.seasons).length;
          const newShow = await storage.createShow({
            title: importedShow.title,
            slug: importedShow.slug,
            description: `${importedShow.title} - Hindi Dubbed Series`,
            posterUrl: "https://images.unsplash.com/photo-1574267432644-f65e2d32b5c1?w=600&h=900&fit=crop",
            backdropUrl: "https://images.unsplash.com/photo-1574267432644-f65e2d32b5c1?w=1920&h=800&fit=crop",
            year: 2024,
            rating: "TV-14",
            imdbRating: "7.5",
            genres: ["Drama"],
            language: "Hindi",
            totalSeasons: totalSeasons,
            cast: [],
            creators: [],
            featured: false,
            trending: false,
            category: "drama"
          });
          showId = newShow.id;
          showsCreated++;
          console.log(`✅ Created show: ${importedShow.title}`);
        }

        // Import episodes for this show
        const existingEpisodes = await storage.getEpisodesByShowId(showId);
        const existingEpisodeKeys = new Set(
          existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
        );

        for (const [seasonKey, episodes] of Object.entries(importedShow.seasons)) {
          const seasonNumber = parseInt(seasonKey.replace("season_", ""));
          
          for (const episode of episodes as any[]) {
            const episodeKey = `${seasonNumber}-${episode.episode}`;
            
            if (existingEpisodeKeys.has(episodeKey)) {
              episodesSkipped++;
              continue;
            }

            const newEpisode: InsertEpisode = {
              showId: showId,
              season: seasonNumber,
              episodeNumber: episode.episode,
              title: `Episode ${episode.episode}`,
              description: `Episode ${episode.episode} of ${importedShow.title}`,
              thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`,
              duration: 45,
              googleDriveUrl: episode.embed_url,
              airDate: new Date().toISOString().split("T")[0],
            };

            try {
              await storage.createEpisode(newEpisode);
              episodesImported++;
            } catch (error) {
              episodesSkipped++;
            }
          }
        }
      }

      const summary = {
        showsCreated,
        showsSkipped,
        episodesImported,
        episodesSkipped,
        totalShows: showsCreated + showsSkipped,
        totalEpisodes: episodesImported + episodesSkipped
      };

      console.log(`\n\n📊 Import Summary:`);
      console.log(`   Shows created: ${showsCreated}`);
      console.log(`   Shows skipped: ${showsSkipped}`);
      console.log(`   Episodes imported: ${episodesImported}`);
      console.log(`   Episodes skipped: ${episodesSkipped}`);
      console.log(`\n✨ Import completed!`);

      res.json({
        success: true,
        message: "Import completed successfully",
        summary
      });
    } catch (error: any) {
      console.error("❌ Import failed:", error);
      res.status(500).json({ 
        error: "Failed to import", 
        details: error.message 
      });
    }
  });

  // Import episodes from JSON file
  app.post("/api/admin/import-episodes", requireAdmin, async (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      console.log(`🚀 Starting episode import from: ${filePath}`);

      // Check if file exists
      if (!existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return res.status(404).json({ 
          error: "File not found", 
          details: `The file "${filePath}" does not exist. Please check the path and try again.` 
        });
      }

      // Read the JSON file
      let rawData: string;
      try {
        rawData = readFileSync(filePath, "utf-8");
      } catch (readError: any) {
        console.error(`❌ Error reading file:`, readError);
        return res.status(500).json({ 
          error: "Failed to read file", 
          details: readError.message 
        });
      }

      // Parse JSON
      let importData: any;
      try {
        importData = JSON.parse(rawData);
      } catch (parseError: any) {
        console.error(`❌ Error parsing JSON:`, parseError);
        return res.status(400).json({ 
          error: "Invalid JSON file", 
          details: `The file contains invalid JSON: ${parseError.message}` 
        });
      }

      console.log(`📊 Found ${importData.total_shows} shows with ${importData.total_episodes} episodes`);

      // Get all existing shows from the database
      const existingShows = await storage.getAllShows();
      console.log(`💾 Found ${existingShows.length} shows in database`);

      // Create a map of slug to show ID
      const slugToShowMap = new Map<string, string>();
      existingShows.forEach(show => {
        slugToShowMap.set(show.slug, show.id);
      });

      let totalImported = 0;
      let totalSkipped = 0;
      let showsMatched = 0;
      let showsNotFound = 0;
      const notFoundShows: string[] = [];

      // Process each show in the import data
      for (const importedShow of importData.shows) {
        const showId = slugToShowMap.get(importedShow.slug);
        
        if (!showId) {
          console.log(`⚠️  Show not found in database: ${importedShow.title} (${importedShow.slug})`);
          notFoundShows.push(`${importedShow.title} (${importedShow.slug})`);
          showsNotFound++;
          totalSkipped += importedShow.total_episodes;
          continue;
        }

        showsMatched++;
        console.log(`✅ Processing: ${importedShow.title}`);

        // Get existing episodes for this show to avoid duplicates
        const existingEpisodes = await storage.getEpisodesByShowId(showId);
        const existingEpisodeKeys = new Set(
          existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
        );

        // Process each season
        for (const [seasonKey, episodes] of Object.entries(importedShow.seasons)) {
          const seasonNumber = parseInt(seasonKey.replace("season_", ""));
          
          for (const episode of episodes as any[]) {
            const episodeKey = `${seasonNumber}-${episode.episode}`;
            
            // Skip if episode already exists
            if (existingEpisodeKeys.has(episodeKey)) {
              console.log(`   ⏭️  Skipping S${seasonNumber}E${episode.episode} (already exists)`);
              totalSkipped++;
              continue;
            }

            // Create the episode
            const newEpisode: InsertEpisode = {
              showId: showId,
              season: seasonNumber,
              episodeNumber: episode.episode,
              title: `Episode ${episode.episode}`,
              description: `Episode ${episode.episode} of ${importedShow.title}`,
              thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`,
              duration: 45,
              googleDriveUrl: episode.embed_url,
              airDate: new Date().toISOString().split("T")[0],
            };

            try {
              await storage.createEpisode(newEpisode);
              console.log(`   ✅ Added S${seasonNumber}E${episode.episode}`);
              totalImported++;
            } catch (error) {
              console.error(`   ❌ Failed to add S${seasonNumber}E${episode.episode}:`, error);
              totalSkipped++;
            }
          }
        }
      }

      const summary = {
        showsMatched,
        showsNotFound,
        notFoundShows,
        episodesImported: totalImported,
        episodesSkipped: totalSkipped,
        totalProcessed: totalImported + totalSkipped
      };

      console.log(`\n\n📊 Import Summary:`);
      console.log(`   Shows matched: ${showsMatched}`);
      console.log(`   Shows not found: ${showsNotFound}`);
      console.log(`   Episodes imported: ${totalImported}`);
      console.log(`   Episodes skipped: ${totalSkipped}`);
      console.log(`\n✨ Import completed!`);

      res.json({
        success: true,
        message: "Import completed successfully",
        summary
      });
    } catch (error: any) {
      console.error("❌ Import failed:", error);
      res.status(500).json({ 
        error: "Failed to import episodes", 
        details: error.message 
      });
    }
  });

  // SEO: Generate sitemap.xml
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const shows = await storage.getAllShows();
      const baseUrl = process.env.BASE_URL || "https://streamvault-production.up.railway.app";
      
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Homepage
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}/</loc>\n`;
      sitemap += '    <changefreq>daily</changefreq>\n';
      sitemap += '    <priority>1.0</priority>\n';
      sitemap += '  </url>\n';
      
      // Show pages
      for (const show of shows) {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/show/${show.slug}</loc>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '    <priority>0.8</priority>\n';
        sitemap += '  </url>\n';
        
        // Episode watch pages
        const episodes = await storage.getEpisodesByShowId(show.id);
        for (const episode of episodes) {
          sitemap += '  <url>\n';
          sitemap += `    <loc>${baseUrl}/watch/${show.slug}?episode=${episode.id}</loc>\n`;
          sitemap += '    <changefreq>monthly</changefreq>\n';
          sitemap += '    <priority>0.6</priority>\n';
          sitemap += '  </url>\n';
        }
      }
      
      sitemap += '</urlset>';
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      res.status(500).send('Error generating sitemap');
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
