import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  console.log(`[Static] Serving static files from: ${distPath}`);
  console.log(`[Static] Directory exists: ${fs.existsSync(distPath)}`);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // List assets directory contents for debugging
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    console.log(`[Static] Assets directory contains ${files.length} files:`, files);
  } else {
    console.log(`[Static] WARNING: Assets directory not found at ${assetsPath}`);
  }

  // Serve static files with proper MIME types
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      console.log(`[Static] Serving file: ${filePath}`);
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res, next) => {
    console.log(`[Catch-all] Handling request: ${req.method} ${req.path}`);
    console.log(`[Catch-all] User-Agent: ${req.headers['user-agent']}`);
    
    // If this is an asset request that reached here, it means the file doesn't exist
    // Return 404 instead of serving index.html
    if (req.path.startsWith('/assets/')) {
      console.log(`[Catch-all] Asset not found: ${req.path}`);
      return res.status(404).send('Asset not found');
    }
    
    // Helper function to escape HTML
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Helper function to inject meta tags
    const injectMetaAndServe = (html: string, metaTags: string) => {
      // Remove ALL existing meta tags that we'll replace
      html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, '');
      html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');
      html = html.replace(/<meta name="title"[^>]*>/g, '');
      html = html.replace(/<meta name="description"[^>]*>/g, '');
      html = html.replace(/<title>.*?<\/title>/g, '');
      
      // Inject new meta tags
      html = html.replace('</head>', `${metaTags}\n  </head>`);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    };

    const indexPath = path.resolve(distPath, "index.html");
    
    // Handle show detail pages
    const showMatch = req.path.match(/^\/show\/([^\/]+)/);
    if (showMatch) {
      const slug = showMatch[1];
      console.log(`[Meta Tags] Show page: ${slug}`);
      
      import('./storage.js').then(({ storage }) => {
        storage.getShowBySlug(slug).then(show => {
          if (show) {
            console.log(`[Meta Tags] Found show: ${show.title}`);
            console.log(`[Meta Tags] Poster URL: ${show.posterUrl}`);
            console.log(`[Meta Tags] Backdrop URL: ${show.backdropUrl}`);
            
            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(show.title);
            const description = escapeHtml(show.description.slice(0, 200));
            const url = `https://streamvault.live/show/${show.slug}`;
            const image = show.posterUrl || show.backdropUrl;

            console.log(`[Meta Tags] Using image: ${image}`);

            const metaTags = `
    <meta property="og:title" content="${title} - Watch Online Free | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.tv_show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <title>${title} - StreamVault</title>`;

            console.log(`[Meta Tags] Injecting meta tags for ${slug}`);
            injectMetaAndServe(html, metaTags);
          } else {
            console.log(`[Meta Tags] Show not found: ${slug}`);
            res.sendFile(indexPath);
          }
        }).catch((err) => {
          console.error(`[Meta Tags] Error fetching show:`, err);
          res.sendFile(indexPath);
        });
      }).catch((err) => {
        console.error(`[Meta Tags] Error importing storage:`, err);
        res.sendFile(indexPath);
      });
      return;
    }

    // Handle episode watch pages
    const watchMatch = req.path.match(/^\/watch\/([^\/]+)/);
    if (watchMatch) {
      const slug = watchMatch[1];
      const season = req.query.season as string;
      const episode = req.query.episode as string;
      
      if (season && episode) {
        console.log(`[Meta Tags] Episode page: ${slug} S${season}E${episode}`);
        
        import('./storage.js').then(({ storage }) => {
          storage.getShowBySlug(slug).then(show => {
            if (show) {
              storage.getEpisodesByShowId(show.id).then(allEpisodes => {
              const episodeData = allEpisodes.find((e: any) => 
                e.showId === show.id && 
                e.season === parseInt(season) && 
                e.episodeNumber === parseInt(episode)
              );
              
              if (episodeData) {
                let html = fs.readFileSync(indexPath, 'utf-8');
                const title = escapeHtml(`${show.title} S${season}E${episode}: ${episodeData.title}`);
                const description = escapeHtml(episodeData.description?.slice(0, 200) || show.description.slice(0, 200));
                const url = `https://streamvault.live/watch/${slug}?season=${season}&episode=${episode}`;
                const image = episodeData.thumbnailUrl || show.backdropUrl;

                const metaTags = `
    <meta property="og:title" content="${title} - StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.episode">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <title>${title} - StreamVault</title>`;

                injectMetaAndServe(html, metaTags);
              } else {
                res.sendFile(indexPath);
              }
              }).catch(() => res.sendFile(indexPath));
            } else {
              res.sendFile(indexPath);
            }
          }).catch(() => res.sendFile(indexPath));
        }).catch(() => res.sendFile(indexPath));
        return;
      }
    }

    // Handle movie detail pages
    const movieMatch = req.path.match(/^\/movie\/([^\/]+)/);
    if (movieMatch) {
      const slug = movieMatch[1];
      console.log(`[Meta Tags] Movie page: ${slug}`);
      
      import('./storage.js').then(({ storage }) => {
        storage.getAllMovies().then(movies => {
          const movie = movies.find((m: any) => m.slug === slug);
          if (movie) {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(`${movie.title} (${movie.year})`);
            const description = escapeHtml(movie.description.slice(0, 200));
            const url = `https://streamvault.live/movie/${slug}`;
            const image = movie.posterUrl || movie.backdropUrl;

            const metaTags = `
    <meta property="og:title" content="${title} - Watch Online Free | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.movie">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <title>${title} - StreamVault</title>`;

            injectMetaAndServe(html, metaTags);
          } else {
            res.sendFile(indexPath);
          }
        }).catch(() => res.sendFile(indexPath));
      }).catch(() => res.sendFile(indexPath));
      return;
    }

    // Handle movie watch pages
    const watchMovieMatch = req.path.match(/^\/watch-movie\/([^\/]+)/);
    if (watchMovieMatch) {
      const slug = watchMovieMatch[1];
      console.log(`[Meta Tags] Movie watch page: ${slug}`);
      
      import('./storage.js').then(({ storage }) => {
        storage.getAllMovies().then(movies => {
          const movie = movies.find((m: any) => m.slug === slug);
          if (movie) {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(`Watch ${movie.title} (${movie.year})`);
            const description = escapeHtml(movie.description.slice(0, 200));
            const url = `https://streamvault.live/watch-movie/${slug}`;
            const image = movie.backdropUrl || movie.posterUrl;

            const metaTags = `
    <meta property="og:title" content="${title} - StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.movie">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <title>${title} - StreamVault</title>`;

            injectMetaAndServe(html, metaTags);
          } else {
            res.sendFile(indexPath);
          }
        }).catch(() => res.sendFile(indexPath));
      }).catch(() => res.sendFile(indexPath));
      return;
    }

    // For all other requests, serve index.html
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
