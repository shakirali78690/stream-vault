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
    console.log(`[Catch-all] Original URL: ${req.originalUrl}`);
    console.log(`[Catch-all] Base URL: ${req.baseUrl}`);
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
    const requestPath = req.originalUrl.split('?')[0]; // Get path without query params

    console.log(`[Meta Tags] Checking path: ${requestPath}`);

    // === HIGH PRIORITY: Homepage ===
    if (requestPath === '/' || requestPath === '') {
      console.log(`[Meta Tags] Homepage`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="StreamVault - Free Movies & TV Shows | Watch Online HD">
    <meta property="og:description" content="Watch 200+ movies & TV shows free in HD. No registration required. Stream Hollywood, Bollywood & international content instantly on any device.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="StreamVault">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="StreamVault - Free Movies & TV Shows">
    <meta name="twitter:description" content="Watch 200+ movies & TV shows free in HD. No registration required.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Watch 200+ movies & TV shows free in HD. No registration required. Stream Hollywood, Bollywood & international content instantly on any device.">
    <title>StreamVault - Free Movies & TV Shows | Watch Online HD</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // === HIGH PRIORITY: Browse pages ===
    if (requestPath === '/browse' || requestPath === '/browse-shows') {
      console.log(`[Meta Tags] Browse Shows page`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="Browse TV Shows - Free Streaming | StreamVault">
    <meta property="og:description" content="Browse our complete collection of TV shows. From drama to comedy, find your next binge-worthy series and stream free in HD.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live${requestPath}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Browse TV Shows | StreamVault">
    <meta name="twitter:description" content="Browse our complete collection of TV shows and stream free in HD.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Browse our complete collection of TV shows. From drama to comedy, find your next binge-worthy series and stream free in HD.">
    <title>Browse TV Shows - Free Streaming | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    if (requestPath === '/browse-movies' || requestPath === '/movies') {
      console.log(`[Meta Tags] Movies page`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="Browse Movies - Free HD Streaming | StreamVault">
    <meta property="og:description" content="Watch the latest movies free in HD. Action, comedy, drama, horror and more. No registration required. Stream instantly.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live${requestPath}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Browse Movies | StreamVault">
    <meta name="twitter:description" content="Watch the latest movies free in HD. No registration required.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Watch the latest movies free in HD. Action, comedy, drama, horror and more. No registration required.">
    <title>Browse Movies - Free HD Streaming | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // === HIGH PRIORITY: Browse Anime page ===
    if (requestPath === '/browse-anime' || requestPath === '/anime') {
      console.log(`[Meta Tags] Anime page`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="Browse Anime - Free HD Streaming | StreamVault">
    <meta property="og:description" content="Watch the best anime free in HD. Action, romance, fantasy, isekai and more. No registration required. Stream instantly.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live${requestPath}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Browse Anime | StreamVault">
    <meta name="twitter:description" content="Watch the best anime free in HD. No registration required.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Watch the best anime free in HD. Action, romance, fantasy, isekai and more. No registration required.">
    <title>Browse Anime - Free HD Streaming | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // === HIGH PRIORITY: Trending page ===
    if (requestPath === '/trending') {
      console.log(`[Meta Tags] Trending page`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="Trending Now - Popular Movies & TV Shows | StreamVault">
    <meta property="og:description" content="Discover what's trending! Watch the most popular movies and TV shows everyone is streaming right now. Free HD quality.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live/trending">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Trending Now | StreamVault">
    <meta name="twitter:description" content="Discover what's trending! Watch the most popular movies and TV shows.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Discover what's trending! Watch the most popular movies and TV shows everyone is streaming right now.">
    <title>Trending Now - Popular Movies & TV Shows | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // === HIGH PRIORITY: Search page ===
    if (requestPath === '/search') {
      const query = req.query.q as string || '';
      console.log(`[Meta Tags] Search page: ${query}`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const searchTitle = query ? `Search: ${escapeHtml(query)}` : 'Search Movies & TV Shows';
      const metaTags = `
    <meta property="og:title" content="${searchTitle} | StreamVault">
    <meta property="og:description" content="Search our library of 200+ movies & TV shows. Find and stream your favorites free in HD.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live/search${query ? '?q=' + encodeURIComponent(query) : ''}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${searchTitle} | StreamVault">
    <meta name="twitter:description" content="Search and stream movies & TV shows free in HD.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Search our library of 200+ movies & TV shows. Find and stream your favorites free in HD.">
    <title>${searchTitle} | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // === MEDIUM PRIORITY: Static pages ===
    const staticPages: Record<string, { title: string; description: string }> = {
      '/about': { title: 'About Us', description: 'Learn about StreamVault - your free streaming destination for movies and TV shows.' },
      '/contact': { title: 'Contact Us', description: 'Get in touch with StreamVault. We\'re here to help with any questions or concerns.' },
      '/privacy': { title: 'Privacy Policy', description: 'StreamVault privacy policy. Learn how we protect your data and privacy.' },
      '/terms': { title: 'Terms of Service', description: 'StreamVault terms of service. Read our usage terms and conditions.' },
      '/dmca': { title: 'DMCA', description: 'StreamVault DMCA policy. Information about copyright and content removal.' },
      '/faq': { title: 'FAQ', description: 'Frequently asked questions about StreamVault. Get answers to common questions.' },
      '/help': { title: 'Help Center', description: 'StreamVault help center. Find solutions and tips for using our platform.' },
      '/request': { title: 'Request Content', description: 'Request movies or TV shows to be added to StreamVault.' },
      '/report': { title: 'Report Issue', description: 'Report broken links or issues with StreamVault content.' },
      '/watchlist': { title: 'My Watchlist', description: 'Your saved movies and TV shows on StreamVault.' },
      '/continue-watching': { title: 'Continue Watching', description: 'Pick up where you left off. Your recently watched content on StreamVault.' },
      '/blog': { title: 'Blog - Movie & TV News', description: 'StreamVault blog - Latest news, reviews, and updates about movies and TV shows.' },
      '/create-room': { title: 'Create Watch Party', description: 'Create a watch party room to watch movies and TV shows together with friends.' },
    };

    if (staticPages[requestPath]) {
      const page = staticPages[requestPath];
      console.log(`[Meta Tags] Static page: ${requestPath}`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="${page.title} | StreamVault">
    <meta property="og:description" content="${page.description}">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live${requestPath}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.title} | StreamVault">
    <meta name="twitter:description" content="${page.description}">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="${page.description}">
    <title>${page.title} | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // === Category pages ===
    const categoryMatch = requestPath.match(/^\/category\/([^\/]+)/);
    if (categoryMatch) {
      const category = categoryMatch[1];
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
      console.log(`[Meta Tags] Category page: ${category}`);
      let html = fs.readFileSync(indexPath, 'utf-8');
      const metaTags = `
    <meta property="og:title" content="${escapeHtml(categoryTitle)} Movies & Shows | StreamVault">
    <meta property="og:description" content="Browse ${escapeHtml(categoryTitle.toLowerCase())} movies and TV shows. Stream free in HD on StreamVault.">
    <meta property="og:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta property="og:url" content="https://streamvault.live/category/${category}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(categoryTitle)} | StreamVault">
    <meta name="twitter:description" content="Browse ${escapeHtml(categoryTitle.toLowerCase())} content on StreamVault.">
    <meta name="twitter:image" content="https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png">
    <meta name="description" content="Browse ${escapeHtml(categoryTitle.toLowerCase())} movies and TV shows. Stream free in HD on StreamVault.">
    <title>${escapeHtml(categoryTitle)} Movies & Shows | StreamVault</title>`;
      injectMetaAndServe(html, metaTags);
      return;
    }

    // Handle show detail pages
    const showMatch = requestPath.match(/^\/show\/([^\/]+)/);
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
    const watchMatch = requestPath.match(/^\/watch\/([^\/]+)/);
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
    const movieMatch = requestPath.match(/^\/movie\/([^\/]+)/);
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

    // Handle blog movie pages
    const blogMovieMatch = requestPath.match(/^\/blog\/movie\/([^\/]+)/);
    if (blogMovieMatch) {
      const slug = blogMovieMatch[1];
      console.log(`[Meta Tags] Blog movie page: ${slug}`);

      import('./storage.js').then(({ storage }) => {
        storage.getAllMovies().then(movies => {
          const movie = movies.find((m: any) => m.slug === slug);
          if (movie) {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(`${movie.title} (${movie.year}) - Complete Guide, Cast & Reviews`);
            const description = escapeHtml(`Everything about ${movie.title}: Plot, cast, ratings, and more. ${movie.description.slice(0, 150)}...`);
            const url = `https://streamvault.live/blog/movie/${slug}`;
            const image = movie.backdropUrl || movie.posterUrl;

            const metaTags = `
    <meta property="og:title" content="${title} | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.movie">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <title>${title} | StreamVault</title>`;

            injectMetaAndServe(html, metaTags);
          } else {
            res.sendFile(indexPath);
          }
        }).catch(() => res.sendFile(indexPath));
      }).catch(() => res.sendFile(indexPath));
      return;
    }

    // Handle blog show pages
    const blogShowMatch = requestPath.match(/^\/blog\/show\/([^\/]+)/);
    if (blogShowMatch) {
      const slug = blogShowMatch[1];
      console.log(`[Meta Tags] Blog show page: ${slug}`);

      import('./storage.js').then(({ storage }) => {
        storage.getShowBySlug(slug).then(show => {
          if (show) {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(`${show.title} (${show.year}) - Complete Guide, Cast & Reviews`);
            const description = escapeHtml(`Everything about ${show.title}: Plot, cast, ratings, and more. ${show.description.slice(0, 150)}...`);
            const url = `https://streamvault.live/blog/show/${slug}`;
            const image = show.backdropUrl || show.posterUrl;

            const metaTags = `
    <meta property="og:title" content="${title} | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.tv_show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <title>${title} | StreamVault</title>`;

            injectMetaAndServe(html, metaTags);
          } else {
            res.sendFile(indexPath);
          }
        }).catch(() => res.sendFile(indexPath));
      }).catch(() => res.sendFile(indexPath));
      return;
    }

    // Handle movie watch pages
    const watchMovieMatch = requestPath.match(/^\/watch-movie\/([^\/]+)/);
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

    // Handle watch-together pages
    const watchTogetherMatch = requestPath.match(/^\/watch-together\/([^\/]+)/);
    if (watchTogetherMatch) {
      const roomCode = watchTogetherMatch[1];
      console.log(`[Meta Tags] Watch Together page: ${roomCode}`);

      let html = fs.readFileSync(indexPath, 'utf-8');
      const title = roomCode === 'NEW' ? 'Create Watch Party' : `Watch Together - Room ${roomCode}`;
      const description = 'Join a synchronized watch party and enjoy movies and TV shows together with friends! Chat, react with emojis, and use voice chat in real-time.';
      const url = `https://streamvault.live/watch-together/${roomCode}`;
      const image = 'https://streamvault.live/og-watch-together.png';

      const metaTags = `
    <meta property="og:title" content="${title} | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="1024">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="StreamVault">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title} | StreamVault">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    <meta name="description" content="${description}">
    <title>${title} | StreamVault</title>`;

      injectMetaAndServe(html, metaTags);
      return;
    }

    // Handle anime detail pages
    const animeMatch = requestPath.match(/^\/anime\/([^\/]+)/);
    if (animeMatch) {
      const slug = animeMatch[1];
      console.log(`[Meta Tags] Anime page: ${slug}`);

      import('./storage.js').then(({ storage }) => {
        storage.getAllAnime().then((animeList: any[]) => {
          const anime = animeList.find((a: any) => a.slug === slug);
          if (anime) {
            console.log(`[Meta Tags] Found anime: ${anime.title}`);
            console.log(`[Meta Tags] Poster URL: ${anime.posterUrl}`);
            console.log(`[Meta Tags] Backdrop URL: ${anime.backdropUrl}`);

            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(anime.title);
            const description = escapeHtml((anime.description || '').slice(0, 200));
            const url = `https://streamvault.live/anime/${anime.slug}`;
            const image = anime.posterUrl || anime.backdropUrl;

            console.log(`[Meta Tags] Using image: ${image}`);

            const metaTags = `
    <meta property="og:title" content="${title} - Watch Anime Free | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.tv_show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <meta name="description" content="${description}">
    <title>${title} - StreamVault</title>`;

            console.log(`[Meta Tags] Injecting meta tags for anime: ${slug}`);
            injectMetaAndServe(html, metaTags);
          } else {
            console.log(`[Meta Tags] Anime not found: ${slug}`);
            res.sendFile(indexPath);
          }
        }).catch((err: any) => {
          console.error(`[Meta Tags] Error fetching anime:`, err);
          res.sendFile(indexPath);
        });
      }).catch((err: any) => {
        console.error(`[Meta Tags] Error importing storage:`, err);
        res.sendFile(indexPath);
      });
      return;
    }

    // Handle anime watch pages
    const watchAnimeMatch = requestPath.match(/^\/watch-anime\/([^\/]+)/);
    if (watchAnimeMatch) {
      const slug = watchAnimeMatch[1];
      const season = req.query.season as string;
      const episode = req.query.episode as string;

      console.log(`[Meta Tags] Anime watch page: ${slug} S${season}E${episode}`);

      import('./storage.js').then(({ storage }) => {
        storage.getAllAnime().then((animeList: any[]) => {
          const anime = animeList.find((a: any) => a.slug === slug);
          if (anime) {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const episodeTitle = season && episode ? `S${season}E${episode}` : '';
            const title = escapeHtml(`Watch ${anime.title}${episodeTitle ? ` - ${episodeTitle}` : ''}`);
            const description = escapeHtml((anime.description || '').slice(0, 200));
            const url = `https://streamvault.live/watch-anime/${slug}${season ? `?season=${season}` : ''}${episode ? `&episode=${episode}` : ''}`;
            const image = anime.backdropUrl || anime.posterUrl;

            const metaTags = `
    <meta property="og:title" content="${title} - StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.episode">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <meta name="description" content="${description}">
    <title>${title} - StreamVault</title>`;

            injectMetaAndServe(html, metaTags);
          } else {
            res.sendFile(indexPath);
          }
        }).catch(() => res.sendFile(indexPath));
      }).catch(() => res.sendFile(indexPath));
      return;
    }

    // Handle blog anime pages
    const blogAnimeMatch = requestPath.match(/^\/blog\/anime\/([^\/]+)/);
    if (blogAnimeMatch) {
      const slug = blogAnimeMatch[1];
      console.log(`[Meta Tags] Blog anime page: ${slug}`);

      import('./storage.js').then(({ storage }) => {
        storage.getAllAnime().then((animeList: any[]) => {
          const anime = animeList.find((a: any) => a.slug === slug);
          if (anime) {
            let html = fs.readFileSync(indexPath, 'utf-8');
            const title = escapeHtml(`${anime.title}${anime.year ? ` (${anime.year})` : ''} - Complete Guide, Cast & Reviews`);
            const description = escapeHtml(`Everything about ${anime.title}: Plot, cast, ratings, and more. ${(anime.description || '').slice(0, 150)}...`);
            const url = `https://streamvault.live/blog/anime/${slug}`;
            const image = anime.backdropUrl || anime.posterUrl;

            const metaTags = `
    <meta property="og:title" content="${title} | StreamVault">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="video.tv_show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${image}">
    <meta name="description" content="${description}">
    <title>${title} | StreamVault</title>`;

            injectMetaAndServe(html, metaTags);
          } else {
            res.sendFile(indexPath);
          }
        }).catch(() => res.sendFile(indexPath));
      }).catch(() => res.sendFile(indexPath));
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
