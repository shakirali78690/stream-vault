import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Shows table
export const shows = pgTable("shows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  year: integer("year").notNull(),
  rating: text("rating").notNull(), // e.g., "TV-MA", "PG-13"
  imdbRating: text("imdb_rating"), // e.g., "8.5"
  genres: text("genres").notNull(), // comma-separated string
  language: text("language").notNull(),
  totalSeasons: integer("total_seasons").notNull(),
  cast: text("cast"), // comma-separated string
  castDetails: text("cast_details"), // JSON string with cast photos and character names
  creators: text("creators"), // comma-separated string
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  category: text("category"), // "action", "drama", "comedy", etc.
});

// Episodes table
export const episodes = pgTable("episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  showId: varchar("show_id").notNull(),
  season: integer("season").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  duration: integer("duration").notNull(), // in minutes
  googleDriveUrl: text("google_drive_url").notNull(),
  videoUrl: text("video_url"), // New field for video URLs (Archive.org, etc.)
  airDate: text("air_date"),
});

// Movies table
export const movies = pgTable("movies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  year: integer("year").notNull(),
  rating: text("rating").notNull(), // e.g., "PG-13", "R"
  imdbRating: text("imdb_rating"), // e.g., "8.5"
  genres: text("genres").notNull(), // comma-separated string
  language: text("language").notNull(),
  duration: integer("duration").notNull(), // in minutes
  cast: text("cast"), // comma-separated string
  castDetails: text("cast_details"), // JSON string with cast photos and character names
  directors: text("directors"), // comma-separated string
  googleDriveUrl: text("google_drive_url").notNull(),
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  category: text("category"), // "action", "drama", "comedy", etc.
});

// Anime table (similar structure to Shows, for anime content)
export const anime = pgTable("anime", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  alternativeTitles: text("alternative_titles"), // Japanese title, romaji, etc.
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  year: integer("year").notNull(),
  rating: text("rating").notNull(), // "TV-14", "TV-MA", "PG"
  imdbRating: text("imdb_rating"),
  malRating: text("mal_rating"), // MyAnimeList rating
  genres: text("genres").notNull(), // comma-separated string
  language: text("language").notNull().default("Japanese"),
  totalSeasons: integer("total_seasons").notNull(),
  totalEpisodes: integer("total_episodes"),
  status: text("status"), // "Ongoing", "Completed", "Upcoming"
  studio: text("studio"), // Animation studio
  cast: text("cast"), // Voice actors
  castDetails: text("cast_details"), // JSON string with cast photos and character names
  creators: text("creators"), // Directors/creators
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  category: text("category"), // "action", "romance", "shonen", etc.
});

// Anime Episodes table
export const animeEpisodes = pgTable("anime_episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  animeId: varchar("anime_id").notNull(),
  season: integer("season").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  duration: integer("duration").notNull(), // in minutes
  googleDriveUrl: text("google_drive_url").notNull(),
  videoUrl: text("video_url"), // Archive.org or other video URLs
  airDate: text("air_date"),
  dubbed: boolean("dubbed").default(false), // English dub available
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  episodeId: varchar("episode_id"), // null if it's a movie comment
  movieId: varchar("movie_id"), // null if it's an episode comment
  animeEpisodeId: varchar("anime_episode_id"), // null if not anime comment
  parentId: varchar("parent_id"), // null if it's a top-level comment
  userName: text("user_name").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Watchlist table (localStorage for MVP)
export const watchlistSchema = z.object({
  showId: z.string().optional(),
  movieId: z.string().optional(),
  animeId: z.string().optional(),
  addedAt: z.string(),
}).refine(data => data.showId || data.movieId || data.animeId, {
  message: "Either showId, movieId, or animeId must be provided"
});

// Viewing progress (localStorage for MVP)
export const viewingProgressSchema = z.object({
  showId: z.string(),
  episodeId: z.string(),
  season: z.number(),
  episodeNumber: z.number(),
  progress: z.number(), // percentage 0-100
  lastWatched: z.string(),
});

// Insert schemas
export const insertShowSchema = createInsertSchema(shows).omit({ id: true });
export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertMovieSchema = createInsertSchema(movies).omit({ id: true });
export const insertAnimeSchema = createInsertSchema(anime).omit({ id: true });
export const insertAnimeEpisodeSchema = createInsertSchema(animeEpisodes).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });

// Select types
export type Show = typeof shows.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Movie = typeof movies.$inferSelect;
export type Anime = typeof anime.$inferSelect;
export type AnimeEpisode = typeof animeEpisodes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type InsertShow = z.infer<typeof insertShowSchema>;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type InsertAnime = z.infer<typeof insertAnimeSchema>;
export type InsertAnimeEpisode = z.infer<typeof insertAnimeEpisodeSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type WatchlistItem = z.infer<typeof watchlistSchema>;
export type ViewingProgress = z.infer<typeof viewingProgressSchema>;

// Blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  contentType: text("content_type").notNull(), // "movie", "show", or "anime"
  contentId: varchar("content_id"), // Reference to movie, show, or anime ID (optional)
  featuredImage: text("featured_image").notNull(),
  excerpt: text("excerpt").notNull(), // Short description for cards
  content: text("content").notNull(), // Full HTML/Markdown content
  plotSummary: text("plot_summary"), // Detailed plot
  review: text("review"), // Review section
  boxOffice: text("box_office"), // Box office info (JSON string)
  trivia: text("trivia"), // Fun facts (JSON array string)
  behindTheScenes: text("behind_the_scenes"), // Production info
  awards: text("awards"), // Awards info
  keywords: text("keywords"), // TMDB keywords (JSON array string)
  seasonDetails: text("season_details"), // Season info for shows (JSON array string)
  // NEW: Production company & external links for SEO backlinks
  productionCompanies: text("production_companies"), // JSON: [{name, logoUrl, website}]
  externalLinks: text("external_links"), // JSON: {imdb, facebook, twitter, instagram, homepage}
  author: text("author").default("StreamVault"),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// Category type
export type Category = {
  id: string;
  name: string;
  slug: string;
};
