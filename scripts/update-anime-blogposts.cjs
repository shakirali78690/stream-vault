#!/usr/bin/env node

/**
 * Update Anime Blog Posts with Full Season Details
 * Fetches season details, trailers, production companies, external links from TMDB
 * and updates anime blog posts to have rich content like TV shows
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY is required. Set it in your .env file.');
    process.exit(1);
}

function httpsGet(url, retries = 3) {
    return new Promise((resolve, reject) => {
        const makeRequest = (attempt) => {
            const req = https.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'StreamVault/1.0',
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', (err) => {
                if (attempt < retries) {
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(err);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (attempt < retries) {
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(new Error('Request timeout'));
                }
            });
        };

        makeRequest(1);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchAnime(title, year) {
    console.log(`   🔍 Searching TMDB for "${title}" (${year})...`);
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&first_air_date_year=${year}`;

    const searchResult = await httpsGet(searchUrl);

    if (!searchResult.results || searchResult.results.length === 0) {
        // Try without year
        const fallbackUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const fallbackResult = await httpsGet(fallbackUrl);

        if (!fallbackResult.results || fallbackResult.results.length === 0) {
            return null;
        }
        return fallbackResult.results[0];
    }

    return searchResult.results[0];
}

async function fetchAnimeDetails(tmdbId) {
    const detailsUrl = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids,videos,keywords,reviews`;
    return await httpsGet(detailsUrl);
}

async function fetchSeasonData(tmdbId, seasonNumber) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    return await httpsGet(url);
}

async function fetchSeasonVideos(tmdbId, seasonNumber) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/videos?api_key=${TMDB_API_KEY}`;
    return await httpsGet(url);
}

function generateRichBlogPost(anime, details, seasonDetailsList) {
    const title = anime.title;
    const year = anime.year;
    const genres = anime.genres || '';
    const cast = anime.cast || '';
    const creators = anime.creators || anime.studio || '';
    const description = anime.description || '';
    const language = anime.language || 'Japanese';
    const rating = anime.rating || 'TV-14';
    const imdbRating = anime.imdbRating || 'N/A';

    const slug = `${anime.slug}-${year}-complete-guide`;

    // Extract external IDs
    const externalIds = details.external_ids || {};
    const externalLinks = {
        homepage: details.homepage || null,
        imdb: externalIds.imdb_id ? `https://www.imdb.com/title/${externalIds.imdb_id}` : null,
        facebook: externalIds.facebook_id ? `https://www.facebook.com/${externalIds.facebook_id}` : null,
        twitter: externalIds.twitter_id ? `https://twitter.com/${externalIds.twitter_id}` : null,
        instagram: externalIds.instagram_id ? `https://www.instagram.com/${externalIds.instagram_id}` : null,
        wikidata: externalIds.wikidata_id ? `https://www.wikidata.org/wiki/${externalIds.wikidata_id}` : null
    };

    // Extract production companies
    const productionCompanies = (details.production_companies || []).map(company => ({
        name: company.name,
        logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w200${company.logo_path}` : null,
        website: null,
        country: company.origin_country || null
    }));

    // Get trailer from videos
    const videos = details.videos?.results || [];
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
        videos.find(v => v.type === 'Opening Credits' && v.site === 'YouTube') ||
        videos.find(v => v.site === 'YouTube');

    const excerpt = `${title} (${year}) is a ${genres.split(',')[0]?.trim() || 'captivating'} anime from ${creators || 'a renowned studio'} that has captured audiences worldwide. This comprehensive guide covers everything you need to know - from plot details to behind-the-scenes insights.`;

    const content = `${title} stands as one of the most ${genres.includes('Action') ? 'thrilling' : genres.includes('Drama') ? 'emotionally compelling' : genres.includes('Comedy') ? 'entertaining' : 'captivating'} anime of ${year}. Spanning ${anime.totalSeasons || 'multiple'} season${anime.totalSeasons !== 1 ? 's' : ''}, this ${genres.split(',')[0]?.trim()?.toLowerCase() || ''} masterpiece delivers an unforgettable viewing experience.

${description}

The anime features an impressive voice cast including ${cast || 'talented performers'}, each bringing depth and authenticity to their roles. ${creators ? `Produced by ${creators}, the animation achieves a perfect balance of storytelling and visual spectacle.` : ''}

Available in ${language}${language !== 'Japanese' ? '' : ' with English subtitles'}, ${title} has garnered critical acclaim${imdbRating !== 'N/A' ? ` with an IMDb rating of ${imdbRating}/10` : ''}, cementing its place as a must-watch anime for fans of ${genres || 'quality entertainment'}.`;

    const plotSummary = `${title} takes viewers on an extraordinary journey through its ${genres.includes('Action') ? 'action-packed' : genres.includes('Drama') ? 'emotionally rich' : genres.includes('Thriller') ? 'suspenseful' : 'compelling'} narrative.

${description}

The story unfolds with masterful pacing, keeping audiences engaged from the first episode to the season finale. Each character is carefully developed, with their arcs interweaving to create a rich tapestry of storytelling that anime fans have come to love.

The anime explores themes of ${genres.includes('Romance') ? 'love and relationships' : genres.includes('Action') ? 'courage and perseverance' : genres.includes('Drama') ? 'human connection and growth' : genres.includes('Thriller') ? 'tension and mystery' : 'life and its complexities'}, resonating deeply with viewers across all demographics.`;

    const review = `${title} (${year}) delivers exactly what fans of ${genres || 'quality anime'} are looking for. ${creators ? `Studio ${creators.split(',')[0]?.trim()} demonstrates` : 'The creative team demonstrates'} a clear vision that translates beautifully to the screen.

The animation quality is stunning throughout. From fluid action sequences to subtle character expressions, every frame showcases the dedication of the animation team. The art style perfectly complements the narrative tone.

The voice performances are uniformly excellent. ${cast ? cast.split(',').slice(0, 2).join(' and ') : 'The lead voice actors'} deliver standout performances that anchor the series emotionally. The supporting cast provides equally impressive work, creating a fully realized world.

The soundtrack deserves special mention - from the opening theme to the background score, the music enhances every emotional beat. ${trailer ? `Watch the official trailer to get a taste of what awaits.` : ''}

${imdbRating !== 'N/A' ? `With an IMDb rating of ${imdbRating}/10, audience reception has been overwhelmingly positive.` : 'Audience reception has been positive across the board.'}

**Our Rating: ${imdbRating !== 'N/A' ? (parseFloat(imdbRating) >= 8 ? '5/5 - Masterpiece' : parseFloat(imdbRating) >= 7 ? '4/5 - Highly Recommended' : parseFloat(imdbRating) >= 6 ? '3.5/5 - Worth Watching' : '3/5 - Decent') : '4/5 - Recommended'}**`;

    // Include trailer URL in trivia
    const triviaItems = [
        `${title} was released in ${year} and quickly became a fan favorite.`,
        `The anime features ${cast ? cast.split(',').length : 'multiple'} talented voice actors in key roles.`,
        `${genres ? `It belongs to the ${genres} genre${genres.includes(',') ? 's' : ''}.` : 'It spans multiple genres.'}`,
        `${language !== 'English' ? `Originally produced in ${language}, it has been appreciated by international audiences.` : 'The production showcases top-tier animation quality.'}`,
        `${imdbRating !== 'N/A' ? `It holds an impressive ${imdbRating} rating on IMDb.` : 'It has received positive reviews from critics and audiences alike.'}`
    ];

    if (trailer) {
        triviaItems.push(`Official Trailer: https://www.youtube.com/watch?v=${trailer.key}`);
    }

    const trivia = JSON.stringify(triviaItems);

    const behindTheScenes = `The making of ${title} involved a dedicated team of animators, voice actors, and production staff working tirelessly to bring this vision to life.

${creators ? `${creators.split(',')[0]?.trim()} led the production, ensuring every episode captured the intended emotional impact.` : 'The creative team worked collaboratively to achieve the final product.'}

The animation production took place at ${creators || 'a renowned Japanese animation studio'}, known for their attention to detail and high-quality output. Each episode went through multiple stages of production, from storyboarding to final compositing.

The voice recording sessions brought together ${cast ? `talented actors including ${cast.split(',').slice(0, 3).join(', ')}` : 'a stellar voice cast'}, who worked closely with the sound directors to perfect their performances.

Post-production involved extensive work on sound design, music composition, and final editing to create the polished final product that fans enjoy today.`;

    const awards = imdbRating !== 'N/A' && parseFloat(imdbRating) >= 7.5
        ? `Critically Acclaimed - IMDb ${imdbRating}/10\nAudience Favorite ${year}\nTop Rated ${genres.split(',')[0]?.trim() || ''} Anime`
        : null;

    // Extract keywords
    const keywordsList = details.keywords?.results?.map(k => k.name) || [];
    const genreKeywords = genres.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
    const allKeywords = [...new Set([...keywordsList, ...genreKeywords, 'anime', 'japanese animation'])];

    return {
        id: `blog-${anime.slug}-${year}`,
        title: `${title} (${year}) - Complete Anime Guide: Cast, Plot & Review`,
        slug,
        contentType: 'anime',
        contentId: anime.id,
        featuredImage: anime.backdropUrl || anime.posterUrl,
        excerpt,
        content,
        plotSummary,
        review,
        boxOffice: null,
        trivia,
        behindTheScenes,
        awards,
        keywords: JSON.stringify(allKeywords.slice(0, 20)),
        productionCompanies: JSON.stringify(productionCompanies),
        externalLinks: JSON.stringify(externalLinks),
        seasonDetails: JSON.stringify(seasonDetailsList),
        author: "StreamVault Editorial",
        published: true,
        featured: anime.featured || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

async function main() {
    console.log('🎌 Updating Anime Blog Posts with Full Season Details\n');

    try {
        console.log('📖 Reading data file...');
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        if (!data.anime || data.anime.length === 0) {
            console.log('❌ No anime found in database');
            return;
        }

        if (!data.blogPosts) {
            data.blogPosts = [];
        }

        console.log(`📊 Found ${data.anime.length} anime to process\n`);

        let updatedCount = 0;
        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < data.anime.length; i++) {
            const anime = data.anime[i];
            console.log(`\n[${i + 1}/${data.anime.length}] Processing: ${anime.title} (${anime.year})`);

            try {
                // Search for anime on TMDB
                const searchResult = await searchAnime(anime.title, anime.year);

                if (!searchResult) {
                    console.log(`   ⚠️ Not found on TMDB, skipping...`);
                    skippedCount++;
                    continue;
                }

                await delay(300);

                // Fetch full details
                const details = await fetchAnimeDetails(searchResult.id);

                if (!details || details.success === false) {
                    console.log(`   ⚠️ Could not fetch details, skipping...`);
                    skippedCount++;
                    continue;
                }

                // Fetch season details with trailers
                const seasonDetailsList = [];
                const numSeasons = details.number_of_seasons || anime.totalSeasons || 1;

                console.log(`   📺 Fetching ${numSeasons} season(s)...`);

                for (let s = 1; s <= Math.min(numSeasons, 10); s++) {
                    await delay(200);

                    try {
                        const seasonData = await fetchSeasonData(searchResult.id, s);

                        // Fetch season-specific trailers
                        let seasonTrailer = null;
                        try {
                            await delay(150);
                            const seasonVideos = await fetchSeasonVideos(searchResult.id, s);
                            seasonTrailer = seasonVideos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                                seasonVideos?.results?.find(v => v.site === 'YouTube');
                        } catch (e) {
                            // Ignore
                        }

                        seasonDetailsList.push({
                            seasonNumber: s,
                            name: seasonData.name || `Season ${s}`,
                            overview: seasonData.overview || '',
                            airDate: seasonData.air_date || null,
                            episodeCount: seasonData.episodes?.length || 0,
                            posterPath: seasonData.poster_path ? `https://image.tmdb.org/t/p/w300${seasonData.poster_path}` : null,
                            trailerKey: seasonTrailer?.key || null,
                            trailerName: seasonTrailer?.name || null
                        });

                        console.log(`      Season ${s}: ${seasonData.episodes?.length || 0} episodes${seasonTrailer ? ' + trailer' : ''}`);
                    } catch (e) {
                        console.log(`      Season ${s}: Error fetching`);
                    }
                }

                // Generate rich blog post
                const blogPost = generateRichBlogPost(anime, details, seasonDetailsList);

                // Check if blog post exists
                const existingIndex = data.blogPosts.findIndex(bp =>
                    bp.contentId === anime.id ||
                    bp.slug === blogPost.slug ||
                    bp.slug.startsWith(anime.slug + '-')
                );

                if (existingIndex > -1) {
                    // Update existing
                    data.blogPosts[existingIndex] = {
                        ...data.blogPosts[existingIndex],
                        ...blogPost,
                        id: data.blogPosts[existingIndex].id, // Keep original ID
                        createdAt: data.blogPosts[existingIndex].createdAt // Keep original creation date
                    };
                    console.log(`   ✅ Updated blog post`);
                    updatedCount++;
                } else {
                    // Add new
                    data.blogPosts.push(blogPost);
                    console.log(`   ✅ Added new blog post`);
                    addedCount++;
                }

                // Rate limiting
                await delay(400);

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                errorCount++;
            }
        }

        // Save data
        data.lastUpdated = new Date().toISOString();

        console.log('\n💾 Saving data file...');
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

        console.log('\n🎉 Complete!');
        console.log(`   ✅ Updated: ${updatedCount} blog posts`);
        console.log(`   ➕ Added: ${addedCount} blog posts`);
        console.log(`   ⏭️ Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total blog posts: ${data.blogPosts.length}`);

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

main();
