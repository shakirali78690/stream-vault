import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { watchlistSchema, viewingProgressSchema, insertBlogPostSchema } from "@shared/schema";
import type { InsertEpisode, BlogPost } from "@shared/schema";
import { readFileSync, existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setupSitemaps } from "./sitemap";
import { sendContentRequestEmail, sendIssueReportEmail } from "./email-service";
import webpush from "web-push";

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Setup dynamic sitemaps
  setupSitemaps(app, storage);

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

  // Get all episodes (for admin)
  app.get("/api/all-episodes", requireAdmin, async (_req, res) => {
    try {
      const episodes = await storage.getAllEpisodes();
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all episodes" });
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

  // Movie routes
  // Get all movies
  app.get("/api/movies", async (_req, res) => {
    try {
      const movies = await storage.getAllMovies();
      res.json(movies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch movies" });
    }
  });

  // Search movies
  app.get("/api/movies/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter required" });
      }
      const movies = await storage.searchMovies(query);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ error: "Failed to search movies" });
    }
  });

  // Get movie by slug
  app.get("/api/movies/:slug", async (req, res) => {
    try {
      const movie = await storage.getMovieBySlug(req.params.slug);
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.json(movie);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch movie" });
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

  app.delete("/api/watchlist/movie/:movieId", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const { movieId } = req.params;
      await storage.removeFromWatchlist(sessionId, movieId, true);
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

  // Admin movie routes
  // Add new movie
  app.post("/api/admin/movies", requireAdmin, async (req, res) => {
    try {
      const movie = await storage.createMovie(req.body);
      res.json(movie);
    } catch (error) {
      res.status(500).json({ error: "Failed to create movie" });
    }
  });

  // Update movie
  app.put("/api/admin/movies/:movieId", requireAdmin, async (req, res) => {
    try {
      const { movieId } = req.params;
      const movie = await storage.updateMovie(movieId, req.body);
      res.json(movie);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update movie", details: error.message });
    }
  });

  // Delete movie
  app.delete("/api/admin/movies/:movieId", requireAdmin, async (req, res) => {
    try {
      const { movieId } = req.params;
      await storage.deleteMovie(movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete movie" });
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

        // Generate thumbnail from Google Drive if not provided
        let thumbnailUrl = ep.thumbnailUrl;
        if (!thumbnailUrl && ep.googleDriveUrl) {
          const driveIdMatch = ep.googleDriveUrl.match(/\/d\/([^\/]+)/);
          if (driveIdMatch) {
            const fileId = driveIdMatch[1];
            thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`;
          }
        }
        if (!thumbnailUrl) {
          thumbnailUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`;
        }

        const newEpisode: InsertEpisode = {
          showId: show.id,
          season: ep.season,
          episodeNumber: ep.episodeNumber,
          title: ep.title || `Episode ${ep.episodeNumber}`,
          description: ep.description || `Episode ${ep.episodeNumber} of ${show.title}`,
          thumbnailUrl,
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

  // Delete all episodes for a show's season
  app.delete("/api/admin/shows/:showId/seasons/:seasonNumber", requireAdmin, async (req, res) => {
    try {
      const { showId, seasonNumber } = req.params;
      const season = parseInt(seasonNumber);

      // Get all episodes for this show
      const allEpisodes = await storage.getEpisodesByShowId(showId);

      // Filter episodes for this season
      const seasonEpisodes = allEpisodes.filter(ep => ep.season === season);

      // Delete each episode
      let deleted = 0;
      for (const episode of seasonEpisodes) {
        await storage.deleteEpisode(episode.id);
        deleted++;
      }

      console.log(`🗑️ Deleted ${deleted} episodes from season ${season}`);

      res.json({
        success: true,
        deleted,
        season
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete season episodes" });
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

      // Handle new format (single show with episodes array)
      if (importData.showSlug && importData.episodes) {
        console.log(`📊 Found episodes for show: ${importData.showSlug}`);

        // Find the show by slug
        const existingShow = await storage.getShowBySlug(importData.showSlug);

        if (!existingShow) {
          return res.status(404).json({
            error: "Show not found",
            details: `No show found with slug "${importData.showSlug}". Please create the show first.`
          });
        }

        let episodesImported = 0;
        let episodesSkipped = 0;

        // Get existing episodes
        const existingEpisodes = await storage.getEpisodesByShowId(existingShow.id);
        const existingEpisodeKeys = new Set(
          existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
        );

        // Import each episode
        for (const episode of importData.episodes) {
          const episodeKey = `${episode.seasonNumber}-${episode.episodeNumber}`;

          if (existingEpisodeKeys.has(episodeKey)) {
            episodesSkipped++;
            continue;
          }

          // Generate thumbnail from Google Drive if not provided
          let thumbnailUrl = episode.thumbnailUrl;
          if (!thumbnailUrl && episode.videoUrl) {
            // Extract Google Drive file ID and create thumbnail URL
            const driveIdMatch = episode.videoUrl.match(/\/d\/([^\/]+)/);
            if (driveIdMatch) {
              const fileId = driveIdMatch[1];
              thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`;
            }
          }
          // Fallback to random Unsplash image if still no thumbnail
          if (!thumbnailUrl) {
            thumbnailUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`;
          }

          const newEpisode: InsertEpisode = {
            showId: existingShow.id,
            season: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            description: episode.description,
            thumbnailUrl,
            googleDriveUrl: episode.videoUrl,
            duration: episode.duration,
            airDate: null
          };

          await storage.createEpisode(newEpisode);
          episodesImported++;
        }

        // Update totalSeasons if needed
        const allEpisodes = await storage.getEpisodesByShowId(existingShow.id);
        const maxSeason = Math.max(...allEpisodes.map(ep => ep.season));
        if (maxSeason > existingShow.totalSeasons) {
          await storage.updateShow(existingShow.id, {
            totalSeasons: maxSeason
          });
          console.log(`📊 Updated totalSeasons to ${maxSeason}`);
        }

        console.log(`✅ Import complete!`);
        console.log(`   Episodes imported: ${episodesImported}`);
        console.log(`   Episodes skipped: ${episodesSkipped}`);

        return res.json({
          success: true,
          summary: {
            showsCreated: 0,
            showsSkipped: 1,
            episodesImported,
            episodesSkipped,
            showTitle: existingShow.title,
            totalEpisodes: importData.episodes.length
          }
        });
      }

      // Handle old format (multiple shows with seasons)
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
            genres: "Drama",
            language: "Hindi",
            totalSeasons: totalSeasons,
            cast: "",
            creators: "",
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

  // Admin: Get all content requests
  app.get("/api/admin/content-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getAllContentRequests();
      res.json(requests);
    } catch (error: any) {
      console.error('Error fetching content requests:', error);
      res.status(500).json({ error: 'Failed to fetch content requests' });
    }
  });

  // Admin: Get all issue reports
  app.get("/api/admin/issue-reports", requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getAllIssueReports();
      res.json(reports);
    } catch (error: any) {
      console.error('Error fetching issue reports:', error);
      res.status(500).json({ error: 'Failed to fetch issue reports' });
    }
  });

  // Admin: Get all comments
  app.get("/api/admin/comments", requireAdmin, async (req, res) => {
    try {
      const comments = await storage.getAllComments();
      res.json(comments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // Admin: Delete comment
  app.delete("/api/admin/comments/:commentId", requireAdmin, async (req, res) => {
    try {
      const { commentId } = req.params;
      await storage.deleteComment(commentId);
      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  // Handle issue reports
  app.post("/api/report-issue", async (req, res) => {
    try {
      const { issueType, title, description, url, email } = req.body;

      // Save to storage
      const report = await storage.createIssueReport({
        issueType,
        title,
        description,
        url,
        email,
      });

      console.log('📝 Issue Report Received:', report.id);
      console.log('Type:', issueType);
      console.log('Title:', title);
      console.log('---');

      // Send email notification (don't wait for it)
      sendIssueReportEmail(report).catch(err =>
        console.error('Failed to send issue report email:', err)
      );

      res.json({
        success: true,
        message: 'Report submitted successfully',
        reportId: report.id
      });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit report'
      });
    }
  });

  // Handle content requests
  app.post("/api/request-content", async (req, res) => {
    try {
      const { contentType, title, year, genre, description, reason, email } = req.body;

      // Save to storage (increments count if duplicate)
      const request = await storage.createContentRequest({
        contentType,
        title,
        year,
        genre,
        description,
        reason,
        email,
      });

      console.log('🎬 Content Request:', request.title, `(${request.requestCount} requests)`);

      // Send email notification (don't wait for it)
      sendContentRequestEmail(request).catch(err =>
        console.error('Failed to send content request email:', err)
      );

      res.json({
        success: true,
        message: 'Content request submitted successfully',
        requestCount: request.requestCount
      });
    } catch (error: any) {
      console.error('Error submitting content request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit content request'
      });
    }
  });

  // Get top content requests
  app.get("/api/top-requests", async (_req, res) => {
    try {
      const topRequests = await storage.getTopContentRequests(5);
      res.json(topRequests);
    } catch (error: any) {
      console.error('Error fetching top requests:', error);
      res.status(500).json({ error: 'Failed to fetch top requests' });
    }
  });

  // Comments - Get comments for an episode
  app.get("/api/comments/episode/:episodeId", async (req, res) => {
    try {
      const { episodeId } = req.params;
      const comments = await storage.getCommentsByEpisodeId(episodeId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Comments - Get comments for a movie
  app.get("/api/comments/movie/:movieId", async (req, res) => {
    try {
      const { movieId } = req.params;
      const comments = await storage.getCommentsByMovieId(movieId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Comments - Create a new comment
  app.post("/api/comments", async (req, res) => {
    try {
      const { episodeId, movieId, parentId, userName, comment } = req.body;

      // Validate input
      if (!userName || !comment) {
        return res.status(400).json({ error: "userName and comment are required" });
      }

      if (!episodeId && !movieId) {
        return res.status(400).json({ error: "Either episodeId or movieId is required" });
      }

      const newComment = await storage.createComment({
        episodeId: episodeId || null,
        movieId: movieId || null,
        parentId: parentId || null,
        userName,
        comment,
      });

      res.status(201).json(newComment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // ============ BLOG POSTS API ============

  // Get all published blog posts (public)
  app.get("/api/blog", async (_req, res) => {
    try {
      const posts = await storage.getPublishedBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get blog post by slug (public)
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Only return published posts to public
      if (!post.published) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Admin: Get all blog posts (including unpublished)
  app.get("/api/admin/blog", requireAdmin, async (_req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Admin: Get blog post by ID
  app.get("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getBlogPostById(id);

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Admin: Create blog post
  app.post("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid blog post data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  // Admin: Update blog post
  app.put("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.updateBlogPost(id, req.body);
      res.json(post);
    } catch (error: any) {
      if (error.message === "Blog post not found") {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  // Admin: Delete blog post
  app.delete("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBlogPost(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // ========== NEWSLETTER SUBSCRIPTION ==========

  const SUBSCRIBERS_FILE = path.join(__dirname, "..", "data", "subscribers.json");

  // Subscribe to newsletter
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }

      // Read existing subscribers
      let data = { subscribers: [] as any[] };
      if (existsSync(SUBSCRIBERS_FILE)) {
        data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      }

      // Check if already subscribed
      const exists = data.subscribers.some((s: any) => s.email === email);
      if (exists) {
        return res.json({ success: true, message: "Already subscribed" });
      }

      // Add new subscriber
      data.subscribers.push({
        email,
        subscribedAt: new Date().toISOString(),
        source: "footer"
      });

      // Save to file
      writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));

      console.log(`📧 New newsletter subscriber: ${email}`);

      res.json({ success: true, message: "Successfully subscribed!" });
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Get subscriber count (admin only)
  app.get("/api/admin/newsletter/subscribers", requireAdmin, async (_req, res) => {
    try {
      if (!existsSync(SUBSCRIBERS_FILE)) {
        return res.json({ count: 0, subscribers: [] });
      }
      const data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      res.json({
        count: data.subscribers.length,
        subscribers: data.subscribers
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  // ==========================================
  // PUSH NOTIFICATIONS
  // ==========================================

  const PUSH_SUBSCRIPTIONS_FILE = path.join(__dirname, "..", "data", "push-subscriptions.json");

  // Configure web-push with VAPID keys
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:contact@streamvault.live',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  }

  // Get VAPID public key
  app.get("/api/push/vapid-key", (_req, res) => {
    if (!VAPID_PUBLIC_KEY) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const subscription = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription" });
      }

      // Load existing subscriptions
      let data = { subscriptions: [] as any[] };
      if (existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      }

      // Check for duplicate
      const exists = data.subscriptions.some((s: any) => s.endpoint === subscription.endpoint);
      if (!exists) {
        data.subscriptions.push({
          ...subscription,
          subscribedAt: new Date().toISOString()
        });
        writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
        console.log(`🔔 New push subscriber (total: ${data.subscriptions.length})`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Push subscription error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;

      if (!existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        return res.json({ success: true });
      }

      const data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      data.subscriptions = data.subscriptions.filter((s: any) => s.endpoint !== endpoint);
      writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Get push subscriber count (admin only)
  app.get("/api/admin/push/subscribers", requireAdmin, async (_req, res) => {
    try {
      if (!existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        return res.json({ count: 0 });
      }
      const data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      res.json({ count: data.subscriptions?.length || 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Send push notification (admin only)
  app.post("/api/admin/push/send", requireAdmin, async (req, res) => {
    try {
      const { title, body, url, type, contentId } = req.body;

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(400).json({ error: "VAPID keys not configured" });
      }

      if (!existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        return res.status(400).json({ error: "No push subscribers" });
      }

      const data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      const subscriptions = data.subscriptions || [];

      if (subscriptions.length === 0) {
        return res.status(400).json({ error: "No push subscribers" });
      }

      // Build notification based on type
      let notificationTitle = title || "StreamVault Update";
      let notificationBody = body || "Check out what's new!";
      let notificationUrl = url || "https://streamvault.live";
      let notificationIcon = "https://streamvault.live/favicon.svg";

      // If content type is specified, fetch content details
      if (type && contentId) {
        if (type === 'show') {
          const shows = await storage.getAllShows();
          const show = shows.find((s: any) => s.id === contentId);
          if (show) {
            notificationTitle = `🎬 New on StreamVault: ${show.title}`;
            notificationBody = show.description?.substring(0, 100) + '...' || `Watch ${show.title} now!`;
            notificationUrl = `https://streamvault.live/show/${show.slug}`;
            notificationIcon = show.posterUrl || notificationIcon;
          }
        } else if (type === 'movie') {
          const movies = await storage.getAllMovies();
          const movie = movies.find((m: any) => m.id === contentId);
          if (movie) {
            notificationTitle = `🎬 New Movie: ${movie.title}`;
            notificationBody = movie.description?.substring(0, 100) + '...' || `Watch ${movie.title} now!`;
            notificationUrl = `https://streamvault.live/movie/${movie.slug}`;
            notificationIcon = movie.posterUrl || notificationIcon;
          }
        }
      }

      const payload = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: notificationIcon,
        badge: "https://streamvault.live/favicon.svg",
        url: notificationUrl,
        timestamp: Date.now()
      });

      let sent = 0;
      let failed = 0;
      const failedEndpoints: string[] = [];

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (err: any) {
          failed++;
          // Remove invalid subscriptions (410 Gone or 404)
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedEndpoints.push(sub.endpoint);
          }
        }
      }

      // Clean up invalid subscriptions
      if (failedEndpoints.length > 0) {
        data.subscriptions = data.subscriptions.filter(
          (s: any) => !failedEndpoints.includes(s.endpoint)
        );
        writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
      }

      console.log(`🔔 Push sent: ${sent} success, ${failed} failed`);
      res.json({ success: true, sent, failed, cleaned: failedEndpoints.length });
    } catch (error: any) {
      console.error("Push send error:", error);
      res.status(500).json({ error: error.message || "Failed to send push" });
    }
  });

  // Send newsletter to single subscriber (admin only)
  app.post("/api/admin/newsletter/send-one", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const DATA_FILE = path.join(__dirname, "..", "data", "streamvault-data.json");
      const RESEND_API_KEY = process.env.RESEND_API_KEY;

      if (!RESEND_API_KEY) {
        return res.status(400).json({ error: "RESEND_API_KEY not configured" });
      }

      // Load content data
      if (!existsSync(DATA_FILE)) {
        return res.status(400).json({ error: "No content data found" });
      }

      const contentData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

      // Get featured content
      let newShows = (contentData.shows || [])
        .filter((s: any) => s.trending || s.featured)
        .slice(0, 6);
      if (newShows.length === 0) {
        newShows = (contentData.shows || []).slice(0, 6);
      }

      let newMovies = (contentData.movies || [])
        .filter((m: any) => m.trending || m.featured)
        .slice(0, 6);
      if (newMovies.length === 0) {
        newMovies = (contentData.movies || []).slice(0, 6);
      }

      // Get blog posts
      const blogPosts = await storage.getAllBlogPosts();
      const latestBlogs = blogPosts.filter((b: any) => b.featured).slice(0, 3) || blogPosts.slice(0, 3);

      // Generate email HTML (simplified version)
      const generateContentRow = (items: any[], type: string) => {
        return items.slice(0, 3).map((item: any) => {
          const url = type === 'show'
            ? `https://streamvault.live/show/${item.slug}`
            : `https://streamvault.live/movie/${item.slug}`;
          return `
            <tr>
              <td style="padding:15px 0;border-bottom:1px solid #2a2a2a;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="100" style="vertical-align:top;">
                      <a href="${url}">
                        <img src="${item.posterUrl}" alt="${item.title}" width="100" height="150" style="border-radius:8px;display:block;object-fit:cover;">
                      </a>
                    </td>
                    <td style="padding-left:20px;vertical-align:top;">
                      <a href="${url}" style="text-decoration:none;">
                        <h3 style="margin:0 0 8px 0;font-size:18px;color:#ffffff;font-weight:600;">${item.title}</h3>
                      </a>
                      <p style="margin:0 0 8px 0;color:#888888;font-size:13px;">
                        ${item.year} ${item.imdbRating ? '• ⭐ ' + item.imdbRating : ''}
                      </p>
                      <a href="${url}" style="display:inline-block;background:#e50914;color:#ffffff;padding:10px 24px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:600;">
                        ▶ Watch Now
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        }).join('');
      };

      const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamVault Weekly Newsletter</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#e50914 0%,#b20710 50%,#8b0000 100%);padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:-1px;">StreamVault</h1>
              <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.9);font-size:15px;">🎬 Your Weekly Entertainment Digest</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color:#141414;padding:30px;">
              
              <!-- Welcome Message -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:30px;border-bottom:1px solid #2a2a2a;">
                    <h2 style="margin:0 0 10px 0;color:#ffffff;font-size:24px;font-weight:600;">What's Hot This Week 🔥</h2>
                    <p style="margin:0;color:#888888;font-size:15px;">Handpicked entertainment just for you</p>
                  </td>
                </tr>
              </table>

              <!-- TV Shows Section -->
              ${newShows.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📺 Featured TV Shows</h3>
                  </td>
                </tr>
                ${generateContentRow(newShows, 'show')}
              </table>
              ` : ''}

              <!-- Movies Section -->
              ${newMovies.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">🎬 Featured Movies</h3>
                  </td>
                </tr>
                ${generateContentRow(newMovies, 'movie')}
              </table>
              ` : ''}

              <!-- Blog Section -->
              ${latestBlogs.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📰 Latest Articles</h3>
                  </td>
                </tr>
                ${latestBlogs.map((blog: any) => `
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #2a2a2a;">
                    <a href="https://streamvault.live/blog/${blog.slug}" style="text-decoration:none;">
                      <h4 style="margin:0 0 6px 0;color:#ffffff;font-size:16px;font-weight:600;">${blog.title}</h4>
                      <p style="margin:0;color:#888;font-size:13px;">${(blog.excerpt || '').substring(0, 100)}...</p>
                    </a>
                  </td>
                </tr>
                `).join('')}
              </table>
              ` : ''}

              <!-- Stats Banner -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;background:linear-gradient(135deg,#1a1a1a,#252525);border-radius:10px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="33%" style="text-align:center;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">370+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">TV Shows</p>
                        </td>
                        <td width="33%" style="text-align:center;border-left:1px solid #333;border-right:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">250+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Movies</p>
                        </td>
                        <td width="33%" style="text-align:center;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">HD</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Quality</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://streamvault.live" style="display:inline-block;background:linear-gradient(90deg,#e50914,#b20710);color:#ffffff;padding:16px 50px;border-radius:50px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 15px rgba(229,9,20,0.4);">
                      🎬 Browse All Content
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d0d0d;padding:30px;text-align:center;border-radius:0 0 12px 12px;">
              <!-- Social Links -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:0 8px;"><a href="https://twitter.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Twitter</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://instagram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Instagram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://telegram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Telegram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://whatsapp.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">WhatsApp</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://facebook.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Facebook</a></td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0;color:#555;font-size:12px;">You received this email because you subscribed to StreamVault newsletter.</p>
              <p style="margin:0;color:#444;font-size:12px;">© 2024 StreamVault. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const subject = '🎬 StreamVault Weekly: Top Picks Just For You!';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'StreamVault <noreply@streamvault.live>',
          to: [email],
          subject: subject,
          html: emailHTML,
        }),
      });

      if (response.ok) {
        console.log(`✅ Newsletter sent to ${email}`);
        res.json({ success: true, message: `Newsletter sent to ${email}` });
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to send to ${email}:`, errorText);
        res.status(500).json({ error: `Failed to send: ${errorText}` });
      }
    } catch (error: any) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: error.message || "Failed to send newsletter" });
    }
  });

  // Send newsletter (admin only) - inline version to avoid child_process
  app.post("/api/admin/newsletter/send", requireAdmin, async (_req, res) => {
    try {
      const DATA_FILE = path.join(__dirname, "..", "data", "streamvault-data.json");
      const RESEND_API_KEY = process.env.RESEND_API_KEY;

      // Check for subscribers
      if (!existsSync(SUBSCRIBERS_FILE)) {
        return res.status(400).json({ error: "No subscribers file found" });
      }

      const subscribersData = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      const subscribers = subscribersData.subscribers || [];

      if (subscribers.length === 0) {
        return res.status(400).json({ error: "No subscribers found" });
      }

      // Load content data
      if (!existsSync(DATA_FILE)) {
        return res.status(400).json({ error: "No content data found" });
      }

      const contentData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

      // Get new content from last 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      let newShows = (contentData.shows || []).filter((show: any) => {
        const createdAt = new Date(show.createdAt || 0);
        return createdAt >= cutoffDate;
      }).slice(0, 6);

      let newMovies = (contentData.movies || []).filter((movie: any) => {
        const createdAt = new Date(movie.createdAt || 0);
        return createdAt >= cutoffDate;
      }).slice(0, 6);

      // If no new content, show trending/featured content instead
      if (newShows.length === 0) {
        newShows = (contentData.shows || [])
          .filter((s: any) => s.trending || s.featured)
          .slice(0, 6);
        if (newShows.length === 0) {
          newShows = (contentData.shows || []).slice(0, 6);
        }
      }

      if (newMovies.length === 0) {
        newMovies = (contentData.movies || [])
          .filter((m: any) => m.trending || m.featured)
          .slice(0, 6);
        if (newMovies.length === 0) {
          newMovies = (contentData.movies || []).slice(0, 6);
        }
      }

      // Get featured blog posts
      const blogPosts = await storage.getAllBlogPosts();
      const featuredBlogs = blogPosts.filter((b: any) => b.featured).slice(0, 3);
      const latestBlogs = featuredBlogs.length > 0 ? featuredBlogs : blogPosts.slice(0, 3);

      const totalNew = newShows.length + newMovies.length;

      // Generate professional email HTML
      const generateContentRow = (items: any[], type: string) => {
        return items.map((item: any) => {
          const url = type === 'show'
            ? `https://streamvault.live/show/${item.slug}`
            : `https://streamvault.live/movie/${item.slug}`;
          return `
            <tr>
              <td style="padding:15px 0;border-bottom:1px solid #2a2a2a;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="100" style="vertical-align:top;">
                      <a href="${url}">
                        <img src="${item.posterUrl}" alt="${item.title}" width="100" height="150" style="border-radius:8px;display:block;object-fit:cover;">
                      </a>
                    </td>
                    <td style="padding-left:20px;vertical-align:top;">
                      <a href="${url}" style="text-decoration:none;">
                        <h3 style="margin:0 0 8px 0;font-size:18px;color:#ffffff;font-weight:600;">${item.title}</h3>
                      </a>
                      <p style="margin:0 0 8px 0;color:#888888;font-size:13px;">
                        ${item.year} ${item.genres ? '• ' + (item.genres.split(',')[0] || '') : ''} ${item.imdbRating ? '• ⭐ ' + item.imdbRating : ''}
                      </p>
                      <p style="margin:0 0 12px 0;color:#aaaaaa;font-size:14px;line-height:1.4;">
                        ${(item.description || '').substring(0, 120)}${item.description?.length > 120 ? '...' : ''}
                      </p>
                      <a href="${url}" style="display:inline-block;background:#e50914;color:#ffffff;padding:10px 24px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:600;">
                        ▶ Watch Now
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        }).join('');
      };

      const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamVault Weekly Newsletter</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#e50914 0%,#b20710 50%,#8b0000 100%);padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:-1px;">StreamVault</h1>
              <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.9);font-size:15px;">🎬 Your Weekly Entertainment Digest</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color:#141414;padding:30px;">
              
              <!-- Welcome Message -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:30px;border-bottom:1px solid #2a2a2a;">
                    <h2 style="margin:0 0 10px 0;color:#ffffff;font-size:24px;font-weight:600;">What's Hot This Week 🔥</h2>
                    <p style="margin:0;color:#888888;font-size:15px;">Handpicked entertainment just for you</p>
                  </td>
                </tr>
              </table>

              <!-- TV Shows Section -->
              ${newShows.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📺 Featured TV Shows</h3>
                  </td>
                </tr>
                ${generateContentRow(newShows.slice(0, 3), 'show')}
              </table>
              ` : ''}

              <!-- Movies Section -->
              ${newMovies.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">🎬 Featured Movies</h3>
                  </td>
                </tr>
                ${generateContentRow(newMovies.slice(0, 3), 'movie')}
              </table>
              ` : ''}

              <!-- Stats Banner -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;background:linear-gradient(135deg,#1a1a1a,#252525);border-radius:10px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="33%" style="text-align:center;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">370+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">TV Shows</p>
                        </td>
                        <td width="33%" style="text-align:center;border-left:1px solid #333;border-right:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">250+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Movies</p>
                        </td>
                        <td width="33%" style="text-align:center;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">HD</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Quality</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://streamvault.live" style="display:inline-block;background:linear-gradient(90deg,#e50914,#b20710);color:#ffffff;padding:16px 50px;border-radius:50px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 15px rgba(229,9,20,0.4);">
                      🎬 Browse All Content
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Blog Section -->
              ${latestBlogs.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📰 Latest Articles</h3>
                  </td>
                </tr>
                ${latestBlogs.map((blog: any) => `
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #2a2a2a;">
                    <a href="https://streamvault.live/blog/${blog.slug}" style="text-decoration:none;">
                      <h4 style="margin:0 0 6px 0;color:#ffffff;font-size:16px;font-weight:600;">${blog.title}</h4>
                      <p style="margin:0;color:#888;font-size:13px;">${(blog.excerpt || '').substring(0, 100)}...</p>
                    </a>
                  </td>
                </tr>
                `).join('')}
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d0d0d;padding:30px;text-align:center;border-radius:0 0 12px 12px;">
              <!-- Social Links -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:0 8px;"><a href="https://twitter.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Twitter</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://instagram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Instagram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://telegram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Telegram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://whatsapp.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">WhatsApp</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://facebook.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Facebook</a></td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0;color:#555;font-size:12px;">You received this email because you subscribed to StreamVault newsletter.</p>
              <p style="margin:0;color:#444;font-size:12px;">© 2024 StreamVault. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const subject = '🎬 StreamVault Weekly: Top Picks Just For You!';

      // Send to all subscribers
      let sent = 0;
      let failed = 0;

      for (const subscriber of subscribers) {
        try {
          if (!RESEND_API_KEY) {
            console.log(`📧 [DRY RUN] Would send to: ${subscriber.email}`);
            sent++;
            continue;
          }

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'StreamVault <noreply@streamvault.live>',
              to: [subscriber.email],
              subject: subject,
              html: emailHTML,
            }),
          });

          if (response.ok) {
            sent++;
            console.log(`✅ Newsletter sent to ${subscriber.email}`);
          } else {
            const errorText = await response.text();
            console.error(`❌ Failed to send to ${subscriber.email}:`, errorText);
            failed++;
          }
        } catch (err: any) {
          console.error(`❌ Error sending to ${subscriber.email}:`, err.message);
          failed++;
        }

        // Rate limiting - 2 requests per second max
        await new Promise(r => setTimeout(r, 600));
      }

      res.json({
        success: true,
        message: `Newsletter sent to ${sent} subscribers`,
        sent,
        failed,
        newShows: newShows.length,
        newMovies: newMovies.length
      });
    } catch (error) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
