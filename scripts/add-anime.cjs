#!/usr/bin/env node

/**
 * Add Anime Script
 * Fetches anime data from TMDB and adds it to streamvault-data.json
 * Prompts for episode Google Drive links
 * 
 * Usage: node scripts/add-anime.cjs
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
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
                    console.log(`   ⚠️ Connection error, retrying (${attempt + 1}/${retries})...`);
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(err);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (attempt < retries) {
                    console.log(`   ⚠️ Timeout, retrying (${attempt + 1}/${retries})...`);
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
    if (usRating?.rating) {
        return usRating.rating;
    }
    return 'TV-14';
}

function mapAnimeCategory(genres) {
    const genreMap = {
        'Animation': 'animation',
        'Action & Adventure': 'action',
        'Action': 'action',
        'Sci-Fi & Fantasy': 'fantasy',
        'Fantasy': 'fantasy',
        'Drama': 'drama',
        'Romance': 'romance',
        'Comedy': 'comedy',
        'Horror': 'horror',
        'Mystery': 'mystery',
        'Thriller': 'thriller'
    };

    for (const genre of genres || []) {
        if (genreMap[genre.name]) {
            return genreMap[genre.name];
        }
    }
    return 'action';
}

async function fetchAnimeData(animeId) {
    console.log(`\n📥 Fetching anime data from TMDB (ID: ${animeId})...`);

    console.log('   Fetching anime details...');
    const anime = await httpsGet(`${TMDB_BASE_URL}/tv/${animeId}?api_key=${TMDB_API_KEY}&language=en-US`);

    if (anime.success === false) {
        throw new Error(`Anime not found: ${anime.status_message}`);
    }

    await delay(300);
    console.log('   Fetching credits...');
    const credits = await httpsGet(`${TMDB_BASE_URL}/tv/${animeId}/credits?api_key=${TMDB_API_KEY}`);

    await delay(300);
    console.log('   Fetching ratings...');
    const ratings = await httpsGet(`${TMDB_BASE_URL}/tv/${animeId}/content_ratings?api_key=${TMDB_API_KEY}`);

    await delay(300);
    console.log('   Fetching keywords...');
    const keywords = await httpsGet(`${TMDB_BASE_URL}/tv/${animeId}/keywords?api_key=${TMDB_API_KEY}`);

    await delay(300);
    console.log('   Fetching external IDs...');
    const externalIds = await httpsGet(`${TMDB_BASE_URL}/tv/${animeId}/external_ids?api_key=${TMDB_API_KEY}`);

    await delay(300);
    console.log('   Fetching videos (trailers)...');
    const videos = await httpsGet(`${TMDB_BASE_URL}/tv/${animeId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);

    return { anime, credits, ratings, keywords, externalIds, videos };
}

async function fetchSeasonData(animeId, seasonNumber) {
    const seasonUrl = `${TMDB_BASE_URL}/tv/${animeId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
    return await httpsGet(seasonUrl);
}

async function fetchProductionCompanyDetails(companies) {
    const enrichedCompanies = [];
    for (const company of companies.slice(0, 5)) {
        try {
            await delay(100);
            const companyData = await httpsGet(`${TMDB_BASE_URL}/company/${company.id}?api_key=${TMDB_API_KEY}`);
            enrichedCompanies.push({
                name: companyData.name || company.name,
                logoUrl: companyData.logo_path ? `https://image.tmdb.org/t/p/w200${companyData.logo_path}` : null,
                website: companyData.homepage || null,
                country: companyData.origin_country || company.origin_country || null
            });
        } catch (err) {
            enrichedCompanies.push({
                name: company.name,
                logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w200${company.logo_path}` : null,
                website: null,
                country: company.origin_country || null
            });
        }
    }
    return enrichedCompanies;
}

async function main() {
    console.log('🎌 StreamVault Anime Adder');
    console.log('==========================\n');

    if (!TMDB_API_KEY) {
        console.log('❌ Error: TMDB_API_KEY not found in .env file');
        console.log('   Make sure your .env file contains: TMDB_API_KEY=your_key_here');
        console.log('   Get your API key from: https://www.themoviedb.org/settings/api\n');
        rl.close();
        return;
    }

    try {
        // Get TMDB Anime ID
        const animeId = await question('Enter TMDB TV/Anime ID: ');

        if (!animeId || isNaN(animeId)) {
            console.log('❌ Invalid anime ID');
            rl.close();
            return;
        }

        // Fetch anime data
        const { anime, credits, ratings, keywords, externalIds, videos } = await fetchAnimeData(animeId);

        console.log(`\n✅ Found: ${anime.name} (${anime.first_air_date?.split('-')[0] || 'N/A'})`);
        console.log(`   Original Title: ${anime.original_name || anime.name}`);
        console.log(`   Seasons: ${anime.number_of_seasons}`);
        console.log(`   Episodes: ${anime.number_of_episodes}`);
        console.log(`   Overview: ${anime.overview?.substring(0, 100)}...`);

        // Ask for alternative titles (romaji, etc.)
        const altTitles = await question(`\nAlternative titles (e.g., Japanese name, comma-separated, or Enter to skip): `);

        // Ask which seasons to add
        const seasonsInput = await question(`\nWhich seasons to add? (1-${anime.number_of_seasons}, comma-separated, or 'all'): `);

        let seasonsToAdd = [];
        if (seasonsInput.toLowerCase() === 'all') {
            seasonsToAdd = Array.from({ length: anime.number_of_seasons }, (_, i) => i + 1);
        } else {
            seasonsToAdd = seasonsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= anime.number_of_seasons);
        }

        if (seasonsToAdd.length === 0) {
            console.log('❌ No valid seasons selected');
            rl.close();
            return;
        }

        console.log(`\n📋 Will add seasons: ${seasonsToAdd.join(', ')}`);

        // Ask for studio name (anime studios)
        const studioName = anime.production_companies?.[0]?.name || '';
        const studio = await question(`\nStudio (default: ${studioName}): `) || studioName;

        // Ask for status
        const statusOptions = ['Ongoing', 'Completed', 'Hiatus'];
        const statusDefault = anime.status === 'Ended' ? 'Completed' : anime.status === 'Returning Series' ? 'Ongoing' : 'Ongoing';
        const status = await question(`Status (${statusOptions.join('/')}, default: ${statusDefault}): `) || statusDefault;

        // Ask for featured/trending
        const featured = (await question('\nFeatured on homepage? (y/n): ')).toLowerCase() === 'y';
        const trending = (await question('Show in trending? (y/n): ')).toLowerCase() === 'y';

        // Build cast details - for anime, these are typically voice actors
        const topCast = credits.cast?.slice(0, 10) || [];
        const castNames = topCast.map(c => c.name).join(', ');
        const castDetails = topCast.map(c => ({
            name: c.name,
            character: c.character,
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        }));

        // Get creators/directors
        const creators = anime.created_by?.map(c => c.name).join(', ') || '';

        // Generate anime ID
        const newAnimeId = generateUUID();

        // Build anime object
        const newAnime = {
            id: newAnimeId,
            title: anime.name,
            slug: generateSlug(anime.name),
            alternativeTitles: altTitles.trim() || (anime.original_name !== anime.name ? anime.original_name : null),
            description: anime.overview || '',
            posterUrl: anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : '',
            backdropUrl: anime.backdrop_path ? `https://image.tmdb.org/t/p/original${anime.backdrop_path}` : '',
            year: parseInt(anime.first_air_date?.split('-')[0]) || new Date().getFullYear(),
            rating: mapContentRating(ratings),
            imdbRating: anime.vote_average?.toFixed(1) || null,
            malRating: null, // Can be manually added
            genres: anime.genres?.map(g => g.name).join(', ') || 'Animation',
            language: anime.original_language === 'ja' ? 'Japanese' : anime.original_language === 'en' ? 'English' : 'Japanese',
            totalSeasons: anime.number_of_seasons,
            totalEpisodes: anime.number_of_episodes || null,
            status: status,
            studio: studio,
            cast: castNames,
            castDetails: JSON.stringify(castDetails),
            creators: creators,
            featured: featured,
            trending: trending,
            category: mapAnimeCategory(anime.genres)
        };

        // Collect episodes for each season
        const episodes = [];

        for (const seasonNum of seasonsToAdd) {
            console.log(`\n🎬 Season ${seasonNum}`);
            console.log('─'.repeat(40));

            const seasonData = await fetchSeasonData(animeId, seasonNum);

            if (!seasonData.episodes || seasonData.episodes.length === 0) {
                console.log(`   No episodes found for season ${seasonNum}`);
                continue;
            }

            console.log(`   Found ${seasonData.episodes.length} episodes\n`);

            // Ask for dubbed/subbed
            const isDubbed = (await question(`   Are these episodes dubbed? (y/n): `)).toLowerCase() === 'y';

            // Ask for episode links
            console.log('\n   Enter Google Drive URLs for each episode (or press Enter to skip):');

            for (const ep of seasonData.episodes) {
                const epNum = ep.episode_number;
                const epTitle = ep.name || `Episode ${epNum}`;

                const driveUrl = await question(`   S${seasonNum}E${epNum} - ${epTitle}: `);

                if (driveUrl && driveUrl.trim()) {
                    episodes.push({
                        id: generateUUID(),
                        animeId: newAnimeId,
                        season: seasonNum,
                        episodeNumber: epNum,
                        title: epTitle,
                        description: ep.overview || '',
                        duration: ep.runtime || 24,
                        thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '',
                        googleDriveUrl: driveUrl.trim(),
                        videoUrl: null,
                        airDate: ep.air_date || null,
                        dubbed: isDubbed
                    });
                }
            }
        }

        if (episodes.length === 0) {
            console.log('\n⚠️  No episodes added. Anime will be added without episodes.');
        }

        // Load existing data
        console.log('\n📂 Loading existing data...');
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        // Initialize anime array if doesn't exist
        if (!data.anime) data.anime = [];
        if (!data.animeEpisodes) data.animeEpisodes = [];

        // Check if anime already exists
        const existingAnime = data.anime.find(a => a.slug === newAnime.slug);
        if (existingAnime) {
            console.log(`⚠️  Anime "${newAnime.title}" already exists!`);
            const overwrite = (await question('Overwrite anime and add new episodes? (y/n): ')).toLowerCase() === 'y';
            if (!overwrite) {
                console.log('❌ Cancelled');
                rl.close();
                return;
            }
            newAnime.id = existingAnime.id;
            // Remove existing anime
            data.anime = data.anime.filter(a => a.slug !== newAnime.slug);
            // Remove existing episodes for seasons we're adding
            data.animeEpisodes = data.animeEpisodes.filter(e => {
                if (e.animeId !== existingAnime.id) return true;
                return !seasonsToAdd.includes(e.season);
            });
        }

        // Add anime and episodes
        data.anime.push(newAnime);
        data.animeEpisodes.push(...episodes);

        // Generate blog post for anime
        const genre1 = newAnime.genres?.split(',')[0]?.trim() || 'Animation';
        const lead1 = castNames.split(',')[0]?.trim() || 'the lead voice actor';
        const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

        // Fetch enriched production companies
        console.log('   Fetching production company details...');
        const enrichedProductionCompanies = await fetchProductionCompanyDetails(anime.production_companies || []);

        // Build external links
        const externalLinksData = {
            imdb: externalIds.imdb_id ? `https://www.imdb.com/title/${externalIds.imdb_id}` : null,
            mal: null, // MyAnimeList - add manually if available
            facebook: externalIds.facebook_id ? `https://www.facebook.com/${externalIds.facebook_id}` : null,
            twitter: externalIds.twitter_id ? `https://twitter.com/${externalIds.twitter_id}` : null,
            instagram: externalIds.instagram_id ? `https://www.instagram.com/${externalIds.instagram_id}` : null,
            homepage: anime.homepage || null
        };

        const blogPost = {
            id: `blog-${newAnime.slug}-${Date.now()}`,
            title: newAnime.title,
            slug: newAnime.slug,
            contentType: 'anime',
            contentId: newAnime.id,
            featuredImage: newAnime.backdropUrl || newAnime.posterUrl,
            excerpt: `${newAnime.title} is a ${genre1.toLowerCase()} anime${studio ? ` from ${studio}` : ''}. ${newAnime.description?.substring(0, 150)}...`,
            content: `${newAnime.title} is an exciting ${genre1.toLowerCase()} anime that has captivated audiences worldwide.\n\n${newAnime.description}\n\nThe series spans ${newAnime.totalSeasons} season${newAnime.totalSeasons > 1 ? 's' : ''} with ${newAnime.totalEpisodes || 'multiple'} episodes.${studio ? ` Produced by ${studio}.` : ''}\n\nWith an impressive voice cast including ${castNames}, the anime brings its characters to life in stunning fashion.`,
            plotSummary: newAnime.description,
            review: `${newAnime.title} delivers an impressive ${genre1.toLowerCase()} experience. With a rating of ${newAnime.imdbRating}/10 on TMDB, it's clear that audiences appreciate this anime.\n\n${lead1} leads the voice cast, delivering performances that bring the characters to life.${studio ? ` ${studio}'s production quality is evident throughout.` : ''}\n\nRating: ${newAnime.imdbRating ? (parseFloat(newAnime.imdbRating) >= 8 ? '4.5/5 - A must-watch anime' : parseFloat(newAnime.imdbRating) >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching') : '4/5 - Recommended'}`,
            boxOffice: null,
            trivia: JSON.stringify([
                `${newAnime.title} first aired in ${newAnime.year}.`,
                studio ? `Produced by ${studio}.` : 'Features high-quality animation.',
                `The series has ${newAnime.totalSeasons} season${newAnime.totalSeasons > 1 ? 's' : ''} with ${newAnime.totalEpisodes || 'multiple'} episodes.`,
                `Original language: ${newAnime.language}.`,
                trailerUrl ? `Watch the trailer: ${trailerUrl}` : 'Official trailer available.'
            ]),
            behindTheScenes: `${newAnime.title} was produced${studio ? ` by ${studio}` : ''}, showcasing the studio's talent for ${genre1.toLowerCase()} animation.\n\nThe voice cast, led by ${lead1}, brings the characters to life with exceptional performances.`,
            awards: `${newAnime.title} has received recognition:\n\n• TMDB Rating: ${newAnime.imdbRating}/10\n• Status: ${newAnime.status}\n${studio ? `• Studio: ${studio}` : ''}`,
            keywords: JSON.stringify(keywords?.results?.slice(0, 10).map(k => k.name) || []),
            productionCompanies: JSON.stringify(enrichedProductionCompanies),
            externalLinks: JSON.stringify(externalLinksData),
            author: 'StreamVault Editorial',
            published: true,
            featured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!data.blogPosts) data.blogPosts = [];
        // Remove existing blog post for this anime if any
        data.blogPosts = data.blogPosts.filter(b => b.contentId !== newAnime.id && !b.slug.includes(newAnime.slug));
        data.blogPosts.push(blogPost);

        // Save data
        console.log('\n💾 Saving data...');
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        console.log('\n✅ Anime added successfully!');
        console.log(`   Title: ${newAnime.title}`);
        console.log(`   Slug: ${newAnime.slug}`);
        console.log(`   Year: ${newAnime.year}`);
        console.log(`   Seasons: ${newAnime.totalSeasons}`);
        console.log(`   Studio: ${newAnime.studio || 'N/A'}`);
        console.log(`   Status: ${newAnime.status}`);
        console.log(`   Genres: ${newAnime.genres}`);
        console.log(`   Episodes added: ${episodes.length}`);
        console.log(`   Blog post: Created`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    rl.close();
}

main();
