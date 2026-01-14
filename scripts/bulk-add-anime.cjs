#!/usr/bin/env node

/**
 * Bulk Add Anime Script
 * Adds 100 anime from TMDB with placeholder episode links and blog posts
 * Top 10 will be marked as featured
 * 
 * Usage: node scripts/bulk-add-anime.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

// All 100 anime to add - with year ranges to help identify correct TMDB entries
const ANIME_LIST = [
    // Top 10 - Featured
    { name: "Fullmetal Alchemist: Brotherhood", year: 2009, featured: true, trending: true },
    { name: "Steins;Gate", year: 2011, featured: true, trending: true },
    { name: "Hunter x Hunter", year: 2011, featured: true, trending: true },
    { name: "Gintama", year: 2006, featured: true, trending: true },
    { name: "Cowboy Bebop", year: 1998, featured: true, trending: true },
    { name: "Neon Genesis Evangelion", year: 1995, featured: true, trending: true },
    { name: "Attack on Titan", year: 2013, featured: true, trending: true },
    { name: "Code Geass: Lelouch of the Rebellion", year: 2006, featured: true, trending: true },
    { name: "Frieren: Beyond Journey's End", year: 2023, featured: true, trending: true },
    { name: "Legend of the Galactic Heroes", year: 1988, featured: true, trending: false },

    // 11-30
    { name: "Death Note", year: 2006, featured: false, trending: true },
    { name: "Monster", year: 2004, featured: false, trending: false },
    { name: "Mob Psycho 100", year: 2016, featured: false, trending: true },
    { name: "Clannad: After Story", year: 2008, featured: false, trending: false },
    { name: "Bakemonogatari", year: 2009, featured: false, trending: false },
    { name: "Vinland Saga", year: 2019, featured: false, trending: true },
    { name: "Demon Slayer: Kimetsu no Yaiba", year: 2019, featured: false, trending: true },
    { name: "Jujutsu Kaisen", year: 2020, featured: false, trending: true },
    { name: "Made in Abyss", year: 2017, featured: false, trending: true },
    { name: "The Tatami Galaxy", year: 2010, featured: false, trending: false },
    { name: "Fate/Zero", year: 2011, featured: false, trending: false },
    { name: "Mushishi", year: 2005, featured: false, trending: false },
    { name: "Puella Magi Madoka Magica", year: 2011, featured: false, trending: false },
    { name: "Tengen Toppa Gurren Lagann", year: 2007, featured: false, trending: false },
    { name: "Haikyu!!", year: 2014, featured: false, trending: true },
    { name: "One Piece", year: 1999, featured: false, trending: true },
    { name: "Chainsaw Man", year: 2022, featured: false, trending: true },
    { name: "Spy x Family", year: 2022, featured: false, trending: true },
    { name: "Violet Evergarden", year: 2018, featured: false, trending: false },
    { name: "Your Lie in April", year: 2014, featured: false, trending: false },

    // 31-60
    { name: "Rurouni Kenshin: Trust and Betrayal", year: 1999, featured: false, trending: false },
    { name: "Ping Pong the Animation", year: 2014, featured: false, trending: false },
    { name: "March Comes in Like a Lion", year: 2016, featured: false, trending: false },
    { name: "Baccano!", year: 2007, featured: false, trending: false },
    { name: "Samurai Champloo", year: 2004, featured: false, trending: false },
    { name: "FLCL", year: 2000, featured: false, trending: false },
    { name: "Serial Experiments Lain", year: 1998, featured: false, trending: false },
    { name: "Trigun", year: 1998, featured: false, trending: false },
    { name: "Ghost in the Shell: Stand Alone Complex", year: 2002, featured: false, trending: false },
    { name: "Bleach: Thousand-Year Blood War", year: 2022, featured: false, trending: true },
    { name: "Fruits Basket", year: 2019, featured: false, trending: false },
    { name: "Kaguya-sama: Love Is War", year: 2019, featured: false, trending: true },
    { name: "DAN DA DAN", year: 2024, featured: false, trending: true },
    { name: "Solo Leveling", year: 2024, featured: false, trending: true },
    { name: "Delicious in Dungeon", year: 2024, featured: false, trending: true },
    { name: "Hellsing Ultimate", year: 2006, featured: false, trending: false },
    { name: "Space Brothers", year: 2012, featured: false, trending: false },
    { name: "Cross Game", year: 2009, featured: false, trending: false },
    { name: "Nodame Cantabile", year: 2007, featured: false, trending: false },
    { name: "Toradora!", year: 2008, featured: false, trending: false },
    { name: "Spice and Wolf", year: 2008, featured: false, trending: false },
    { name: "Re:Zero − Starting Life in Another World", year: 2016, featured: false, trending: true },
    { name: "One Punch Man", year: 2015, featured: false, trending: true },
    { name: "Bakuman", year: 2010, featured: false, trending: false },
    { name: "Kingdom", year: 2012, featured: false, trending: false },
    { name: "Major", year: 2004, featured: false, trending: false },
    { name: "Nana", year: 2006, featured: false, trending: false },
    { name: "Usagi Drop", year: 2011, featured: false, trending: false },
    { name: "Welcome to the NHK", year: 2006, featured: false, trending: false },
    { name: "Haibane Renmei", year: 2002, featured: false, trending: false },

    // 61-80
    { name: "Beck: Mongolian Chop Squad", year: 2004, featured: false, trending: false },
    { name: "The Promised Neverland", year: 2019, featured: false, trending: false },
    { name: "JoJo's Bizarre Adventure", year: 2012, featured: false, trending: true },
    { name: "My Hero Academia", year: 2016, featured: false, trending: true },
    { name: "Tokyo Ghoul", year: 2014, featured: false, trending: false },
    { name: "Assassination Classroom", year: 2015, featured: false, trending: false },
    { name: "Durarara!!", year: 2010, featured: false, trending: false },
    { name: "Angel Beats!", year: 2010, featured: false, trending: false },
    { name: "Yu Yu Hakusho", year: 1992, featured: false, trending: false },
    { name: "Black Lagoon", year: 2006, featured: false, trending: false },
    { name: "Kill la Kill", year: 2013, featured: false, trending: false },
    { name: "Psycho-Pass", year: 2012, featured: false, trending: false },
    { name: "91 Days", year: 2016, featured: false, trending: false },
    { name: "Odd Taxi", year: 2021, featured: false, trending: false },
    { name: "Parasyte: The Maxim", year: 2014, featured: false, trending: false },
    { name: "Tokyo Revengers", year: 2021, featured: false, trending: true },
    { name: "Black Clover", year: 2017, featured: false, trending: false },
    { name: "Fire Force", year: 2019, featured: false, trending: false },
    { name: "Hell's Paradise", year: 2023, featured: false, trending: true },

    // 81-100
    { name: "Dr. Stone", year: 2019, featured: false, trending: false },
    { name: "Tower of God", year: 2020, featured: false, trending: false },
    { name: "Grand Blue Dreaming", year: 2018, featured: false, trending: false },
    { name: "Shirobako", year: 2014, featured: false, trending: false },
    { name: "Outlaw Star", year: 1998, featured: false, trending: false },
    { name: "The Rose of Versailles", year: 1979, featured: false, trending: false },
    { name: "Ashita no Joe", year: 1970, featured: false, trending: false },
    { name: "Lupin III", year: 1971, featured: false, trending: false },
    { name: "Naruto: Shippuden", year: 2007, featured: false, trending: true },
    { name: "Erased", year: 2016, featured: false, trending: false },
    { name: "Sword Art Online", year: 2012, featured: false, trending: false },
    { name: "KonoSuba: God's Blessing on This Wonderful World!", year: 2016, featured: false, trending: false },
    { name: "Overlord", year: 2015, featured: false, trending: false },
    { name: "That Time I Got Reincarnated as a Slime", year: 2018, featured: false, trending: true },
    { name: "Noragami", year: 2014, featured: false, trending: false },
    { name: "Great Teacher Onizuka", year: 1999, featured: false, trending: false },
    { name: "Slam Dunk", year: 1993, featured: false, trending: false },
    { name: "Hajime no Ippo", year: 2000, featured: false, trending: false },
    { name: "Honey and Clover", year: 2005, featured: false, trending: false },
    { name: "Chihayafuru", year: 2011, featured: false, trending: false },
];

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
                    console.log(`   ⚠️ Retry ${attempt + 1}/${retries}...`);
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
                    reject(new Error('Timeout'));
                }
            });
        };
        makeRequest(1);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function mapContentRating(ratings) {
    const usRating = ratings?.results?.find(r => r.iso_3166_1 === 'US');
    if (usRating?.rating) return usRating.rating;
    return 'TV-14';
}

async function searchAnime(name, year) {
    const query = encodeURIComponent(name);
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${query}&first_air_date_year=${year}&language=en-US`;
    const result = await httpsGet(url);

    // Try to find best match
    if (result.results && result.results.length > 0) {
        // Prefer exact year match
        const exactMatch = result.results.find(r => r.first_air_date?.startsWith(String(year)));
        return exactMatch || result.results[0];
    }

    // Try without year
    const url2 = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${query}&language=en-US`;
    const result2 = await httpsGet(url2);
    return result2.results?.[0] || null;
}

async function fetchAnimeDetails(tmdbId) {
    const [anime, credits, ratings, videos, externalIds] = await Promise.all([
        httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
        httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
        httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/content_ratings?api_key=${TMDB_API_KEY}`),
        httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`),
        httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`)
    ]);
    return { anime, credits, ratings, videos, externalIds };
}

async function fetchSeasonDetails(tmdbId, seasonNumber) {
    return await httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
}

async function main() {
    console.log('🎌 Bulk Anime Adder - 100 Anime');
    console.log('================================\n');

    if (!TMDB_API_KEY) {
        console.log('❌ TMDB_API_KEY not found in .env');
        return;
    }

    // Load existing data
    console.log('📂 Loading existing data...');
    let data;
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        console.log('Creating new data file...');
        data = { shows: [], episodes: [], movies: [], anime: [], animeEpisodes: [], blogPosts: [] };
    }

    if (!data.anime) data.anime = [];
    if (!data.animeEpisodes) data.animeEpisodes = [];
    if (!data.blogPosts) data.blogPosts = [];

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < ANIME_LIST.length; i++) {
        const item = ANIME_LIST[i];
        console.log(`\n[${i + 1}/${ANIME_LIST.length}] ${item.name} (${item.year})`);

        // Check if already exists
        const existingSlug = generateSlug(item.name);
        if (data.anime.find(a => a.slug === existingSlug)) {
            console.log('   ⏭️  Already exists, skipping...');
            skipped++;
            continue;
        }

        try {
            // Search for anime on TMDB
            const searchResult = await searchAnime(item.name, item.year);
            await delay(250);

            if (!searchResult) {
                console.log('   ❌ Not found on TMDB');
                failed++;
                continue;
            }

            console.log(`   📥 Found: ${searchResult.name} (TMDB ID: ${searchResult.id})`);

            // Fetch full details
            const { anime, credits, ratings, videos, externalIds } = await fetchAnimeDetails(searchResult.id);
            await delay(250);

            // Build cast details
            const topCast = credits.cast?.slice(0, 10) || [];
            const castNames = topCast.map(c => c.name).join(', ');
            const castDetails = topCast.map(c => ({
                name: c.name,
                character: c.character,
                profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
            }));

            // Get studio
            const studio = anime.production_companies?.[0]?.name || anime.networks?.[0]?.name || '';

            // Generate anime ID
            const animeId = generateUUID();

            // Determine status
            const status = anime.status === 'Ended' ? 'Completed' : anime.status === 'Returning Series' ? 'Ongoing' : 'Ongoing';

            // Create anime object
            const newAnime = {
                id: animeId,
                title: anime.name,
                slug: generateSlug(anime.name),
                alternativeTitles: anime.original_name !== anime.name ? anime.original_name : null,
                description: anime.overview || `${anime.name} is a popular anime series.`,
                posterUrl: anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : '',
                backdropUrl: anime.backdrop_path ? `https://image.tmdb.org/t/p/original${anime.backdrop_path}` : '',
                year: parseInt(anime.first_air_date?.split('-')[0]) || item.year,
                rating: mapContentRating(ratings),
                imdbRating: anime.vote_average?.toFixed(1) || null,
                malRating: null,
                genres: anime.genres?.map(g => g.name).join(', ') || 'Animation',
                language: anime.original_language === 'ja' ? 'Japanese' : 'Japanese',
                totalSeasons: anime.number_of_seasons || 1,
                totalEpisodes: anime.number_of_episodes || null,
                status: status,
                studio: studio,
                cast: castNames,
                castDetails: JSON.stringify(castDetails),
                creators: anime.created_by?.map(c => c.name).join(', ') || '',
                featured: item.featured,
                trending: item.trending,
                category: 'animation'
            };

            data.anime.push(newAnime);

            // Fetch episodes for first season (with placeholder links)
            try {
                const seasonData = await fetchSeasonDetails(searchResult.id, 1);
                await delay(200);

                if (seasonData.episodes && seasonData.episodes.length > 0) {
                    const episodesToAdd = seasonData.episodes.slice(0, 12); // Limit to 12 episodes per anime

                    for (const ep of episodesToAdd) {
                        const episode = {
                            id: generateUUID(),
                            animeId: animeId,
                            season: 1,
                            episodeNumber: ep.episode_number,
                            title: ep.name || `Episode ${ep.episode_number}`,
                            description: ep.overview || '',
                            duration: ep.runtime || 24,
                            thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : newAnime.posterUrl,
                            googleDriveUrl: `https://drive.google.com/file/d/placeholder_${animeId}_s1e${ep.episode_number}/view`,
                            videoUrl: null,
                            airDate: ep.air_date || null,
                            dubbed: false
                        };
                        data.animeEpisodes.push(episode);
                    }
                    console.log(`   📺 Added ${episodesToAdd.length} episodes`);
                }
            } catch (e) {
                console.log(`   ⚠️ Could not fetch episodes: ${e.message}`);
            }

            // Create blog post
            const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

            const blogPost = {
                id: `blog-${newAnime.slug}-${Date.now()}`,
                title: newAnime.title,
                slug: newAnime.slug,
                contentType: 'anime',
                contentId: animeId,
                featuredImage: newAnime.backdropUrl || newAnime.posterUrl,
                excerpt: `${newAnime.title} is a ${newAnime.genres.split(',')[0]?.trim()?.toLowerCase() || 'popular'} anime${studio ? ` from ${studio}` : ''}. ${newAnime.description?.substring(0, 150)}...`,
                content: `# ${newAnime.title}\n\n${newAnime.description}\n\n## Details\n\n- **Year:** ${newAnime.year}\n- **Status:** ${newAnime.status}\n- **Studio:** ${studio || 'N/A'}\n- **Episodes:** ${newAnime.totalEpisodes || 'TBA'}\n- **Genres:** ${newAnime.genres}\n- **Rating:** ${newAnime.imdbRating}/10\n\n## Cast\n\n${castNames || 'Voice cast information coming soon.'}\n\n${trailerUrl ? `## Watch Trailer\n\n[Watch on YouTube](${trailerUrl})` : ''}`,
                plotSummary: newAnime.description,
                review: `${newAnime.title} is a highly acclaimed anime that has captivated audiences worldwide. With a rating of ${newAnime.imdbRating}/10, it stands as one of the most beloved anime series.\n\nThe ${newAnime.genres.split(',')[0]?.trim()?.toLowerCase() || 'anime'} storytelling combined with stunning animation makes this a must-watch for any anime fan.`,
                boxOffice: null,
                trivia: JSON.stringify([
                    `${newAnime.title} first aired in ${newAnime.year}.`,
                    studio ? `Produced by ${studio}.` : 'Features stunning animation.',
                    `Original language: ${newAnime.language}.`,
                    `Current status: ${newAnime.status}.`
                ]),
                behindTheScenes: `${newAnime.title} is produced${studio ? ` by ${studio}` : ''}, showcasing top-tier animation quality and storytelling.`,
                awards: `${newAnime.title} - TMDB Rating: ${newAnime.imdbRating}/10`,
                keywords: JSON.stringify(newAnime.genres.split(',').map(g => g.trim().toLowerCase())),
                productionCompanies: JSON.stringify(anime.production_companies?.slice(0, 3).map(c => ({
                    name: c.name,
                    logoUrl: c.logo_path ? `https://image.tmdb.org/t/p/w200${c.logo_path}` : null
                })) || []),
                externalLinks: JSON.stringify({
                    imdb: externalIds?.imdb_id ? `https://www.imdb.com/title/${externalIds.imdb_id}` : null,
                    homepage: anime.homepage || null
                }),
                author: 'StreamVault Editorial',
                published: true,
                featured: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Remove existing blog post for this anime
            data.blogPosts = data.blogPosts.filter(b => b.slug !== newAnime.slug);
            data.blogPosts.push(blogPost);

            console.log(`   ✅ Added: ${newAnime.title}`);
            added++;

            // Rate limiting
            await delay(300);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }
    }

    // Save data
    console.log('\n💾 Saving data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log('\n================================');
    console.log(`✅ Added: ${added} anime`);
    console.log(`⏭️  Skipped: ${skipped} (already exist)`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📺 Total episodes: ${data.animeEpisodes.length}`);
    console.log(`📝 Total blog posts: ${data.blogPosts.filter(b => b.contentType === 'anime').length}`);
    console.log('================================');
}

main().catch(console.error);
