#!/usr/bin/env node

/**
 * Update Blog Posts Script
 * Updates blog posts for shows AND movies with latest TMDB data
 * 
 * Usage: node scripts/update-blog-posts.cjs
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
                    console.log(`   ⚠️ Retry (${attempt + 1}/${retries})...`);
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

async function searchOnTMDB(title, type = 'tv') {
    const encoded = encodeURIComponent(title);
    const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encoded}&language=en-US`;
    return await httpsGet(url);
}

async function fetchData(id, type = 'tv') {
    console.log(`   Fetching ${type} details...`);
    const item = await httpsGet(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    await delay(300);

    console.log('   Fetching credits...');
    const credits = await httpsGet(`${TMDB_BASE_URL}/${type}/${id}/credits?api_key=${TMDB_API_KEY}`);
    await delay(300);

    console.log('   Fetching reviews...');
    const reviews = await httpsGet(`${TMDB_BASE_URL}/${type}/${id}/reviews?api_key=${TMDB_API_KEY}&language=en-US`);
    await delay(300);

    console.log('   Fetching keywords...');
    const keywords = await httpsGet(`${TMDB_BASE_URL}/${type}/${id}/keywords?api_key=${TMDB_API_KEY}`);
    await delay(300);

    console.log('   Fetching external IDs...');
    const externalIds = await httpsGet(`${TMDB_BASE_URL}/${type}/${id}/external_ids?api_key=${TMDB_API_KEY}`);
    await delay(300);

    console.log('   Fetching videos...');
    const videos = await httpsGet(`${TMDB_BASE_URL}/${type}/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
    await delay(300);

    return { item, credits, reviews, keywords, externalIds, videos };
}

async function fetchSeasonVideos(showId, seasonNumber) {
    const videosUrl = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
    return await httpsGet(videosUrl);
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

function generateShowBlogPost(show, showData, credits, reviews, keywords, externalIds, videos, seasonDetailsList) {
    const { item: tmdbShow } = showData;

    const genre1 = show.genres?.split(',')[0]?.trim() || 'Drama';
    const genre2 = show.genres?.split(',')[1]?.trim() || '';
    const castList = show.cast?.split(',').map(c => c.trim()) || [];
    const lead1 = castList[0] || 'the lead actor';
    const lead2 = castList[1] || 'the supporting cast';
    const creator = show.creators?.split(',')[0]?.trim() || 'the showrunner';
    const seasonText = show.totalSeasons > 1 ? `${show.totalSeasons} seasons` : '1 season';

    const productionCompanies = tmdbShow.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'Various studios';
    const productionCountries = tmdbShow.production_countries?.map(c => c.name).join(', ') || tmdbShow.origin_country?.join(', ') || 'USA';
    const networks = tmdbShow.networks?.map(n => n.name).join(', ') || 'Streaming';
    const tagline = tmdbShow.tagline || '';
    const voteCount = tmdbShow.vote_count || 0;
    const popularity = tmdbShow.popularity?.toFixed(0) || 0;
    const totalEpisodes = tmdbShow.number_of_episodes || 0;
    const status = tmdbShow.status || 'Ongoing';
    const firstAirDate = tmdbShow.first_air_date || '';
    const lastAirDate = tmdbShow.last_air_date || '';

    const realReviews = reviews?.results?.slice(0, 3) || [];
    const reviewExcerpts = realReviews.map(r => {
        const content = r.content.replace(/\r\n/g, '\n').trim();
        return `**${r.author}** writes:\n\n"${content}"`;
    }).join('\n\n---\n\n');

    const keywordList = keywords?.results?.slice(0, 10).map(k => k.name) || [];
    const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const execProducers = credits.crew?.filter(c => c.job === 'Executive Producer').slice(0, 3).map(w => w.name).join(', ') || '';
    const composers = credits.crew?.filter(c => c.job === 'Original Music Composer' || c.job === 'Music' || c.job === 'Composer').slice(0, 2).map(c => c.name).join(', ') || '';

    return {
        id: `blog-${show.slug}-${Date.now()}`,
        title: show.title,
        slug: show.slug,
        contentType: 'show',
        contentId: show.id,
        featuredImage: show.backdropUrl || show.posterUrl,
        excerpt: `${show.title} is a gripping ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} series created by ${creator}, featuring ${lead1} in a stellar role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know.`,
        content: `${show.title} marks an impressive ${genre1.toLowerCase()} experience, delivering one of the most ambitious series of ${show.year}. ${tagline ? `With the tagline "${tagline}", the series sets its tone from the very beginning.\n\n` : ''}${show.description}\n\nSpanning ${seasonText} with ${totalEpisodes} episodes, the show allows its story to breathe and develop complex character arcs. ${show.language !== 'English' ? `Produced primarily in ${show.language}, ${show.title} represents a bold creative choice that adds authenticity to its setting.` : ''}\n\nProduced by ${productionCompanies} and airing on ${networks}, the series originated from ${productionCountries}. The show first aired on ${firstAirDate}${status === 'Ended' ? ` and concluded on ${lastAirDate}` : ` and is currently ${status.toLowerCase()}`}.\n\nWith an ensemble cast featuring ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''} - the series delivers powerhouse performances. ${composers ? `The score by ${composers} elevates every scene.` : ''}`,
        plotSummary: `${show.description}\n\nThe story begins with a compelling premise that draws viewers in immediately. As the narrative unfolds across ${seasonText} and ${totalEpisodes} episodes, we follow the characters through events that test their limits.\n\n${lead1}'s character serves as the emotional anchor. The supporting characters, including those played by ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, add layers of complexity.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}`,
        review: `${show.title} is a masterclass in ${genre1.toLowerCase()} television. ${creator} proves their command over the medium with confident storytelling.\n\n${lead1} delivers a nuanced performance. The character development is portrayed with remarkable subtlety.\n\nThe supporting cast is equally impressive. ${lead2}'s performance is a highlight.${realReviews.length > 0 ? `\n\n**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}\n\nWith a TMDB rating of ${show.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, audience reception has been ${parseFloat(show.imdbRating) >= 7 ? 'overwhelmingly positive' : 'generally favorable'}.\n\nRating: ${show.imdbRating ? (parseFloat(show.imdbRating) >= 8 ? '4.5/5 - A must-watch masterpiece' : parseFloat(show.imdbRating) >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching') : '4/5 - Recommended'}`,
        boxOffice: null,
        trivia: JSON.stringify([
            `${show.title} first aired on ${firstAirDate} and has a popularity score of ${popularity} on TMDB.`,
            `The series is produced by ${productionCompanies} and airs on ${networks}.`,
            `The show spans ${show.totalSeasons} season${show.totalSeasons > 1 ? 's' : ''} with a total of ${totalEpisodes} episodes.`,
            `Current status: ${status}${status === 'Ended' ? ` (concluded on ${lastAirDate})` : ''}.`,
            `${lead1} leads an ensemble cast of ${castList.length} credited actors.`,
            creator !== 'the showrunner' ? `Created by ${creator}.` : `The show was developed by a talented creative team.`,
            execProducers ? `Executive produced by ${execProducers}.` : `The show features experienced executive producers.`,
            composers ? `The musical score was composed by ${composers}.` : `The series features an evocative musical score.`,
            `The show has received ${voteCount.toLocaleString()} ratings on TMDB with an average score of ${show.imdbRating}/10.`,
            trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The show's trailer showcases its impressive production values.`
        ]),
        behindTheScenes: `The making of ${show.title} was an ambitious undertaking spanning ${seasonText}. ${creator !== 'the showrunner' ? `Created by ${creator}, the` : 'The'} series was produced by ${productionCompanies} for ${networks}.\n\n${execProducers ? `Executive producers ${execProducers} oversaw the production.` : 'The executive production team ensured quality.'}`,
        awards: `${show.title} has received recognition:\n\n• TMDB Rating: ${show.imdbRating}/10 (${voteCount.toLocaleString()} votes)\n• Popularity Score: ${popularity}\n• Status: ${status}\n• Network: ${networks}\n${parseFloat(show.imdbRating) >= 7.5 ? '• Critically acclaimed\n' : '• Positive reception\n'}• ${lead1} received praise for their performance\n• Produced by ${productionCompanies}`,
        keywords: JSON.stringify(keywordList),
        seasonDetails: JSON.stringify(seasonDetailsList),
        productionCompanies: null,
        externalLinks: null,
        author: 'StreamVault Editorial',
        published: true,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function generateMovieBlogPost(movie, movieData, credits, reviews, keywords, externalIds, videos) {
    const { item: tmdbMovie } = movieData;

    const genre1 = movie.genres?.split(',')[0]?.trim() || 'Drama';
    const genre2 = movie.genres?.split(',')[1]?.trim() || '';
    const castList = movie.cast?.split(',').map(c => c.trim()) || [];
    const lead1 = castList[0] || 'the lead actor';
    const lead2 = castList[1] || 'the supporting cast';
    const director = movie.director?.split(',')[0]?.trim() || 'the director';

    const productionCompanies = tmdbMovie.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'Various studios';
    const productionCountries = tmdbMovie.production_countries?.map(c => c.name).join(', ') || 'USA';
    const tagline = tmdbMovie.tagline || '';
    const voteCount = tmdbMovie.vote_count || 0;
    const popularity = tmdbMovie.popularity?.toFixed(0) || 0;
    const runtime = tmdbMovie.runtime || movie.duration || 0;
    const budget = tmdbMovie.budget || 0;
    const revenue = tmdbMovie.revenue || 0;
    const releaseDate = tmdbMovie.release_date || '';

    const realReviews = reviews?.results?.slice(0, 3) || [];
    const reviewExcerpts = realReviews.map(r => {
        const content = r.content.replace(/\r\n/g, '\n').trim();
        return `**${r.author}** writes:\n\n"${content}"`;
    }).join('\n\n---\n\n');

    const keywordList = keywords?.keywords?.slice(0, 10).map(k => k.name) || [];
    const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const directors = credits.crew?.filter(c => c.job === 'Director').map(d => d.name).join(', ') || director;
    const writers = credits.crew?.filter(c => c.job === 'Screenplay' || c.job === 'Writer').slice(0, 3).map(w => w.name).join(', ') || '';
    const composers = credits.crew?.filter(c => c.job === 'Original Music Composer' || c.job === 'Music').slice(0, 2).map(c => c.name).join(', ') || '';
    const cinematographers = credits.crew?.filter(c => c.job === 'Director of Photography').map(c => c.name).join(', ') || '';

    const boxOfficeText = budget > 0 || revenue > 0 ? `Budget: $${(budget / 1000000).toFixed(1)}M | Box Office: $${(revenue / 1000000).toFixed(1)}M` : null;

    return {
        id: `blog-${movie.slug}-${Date.now()}`,
        title: movie.title,
        slug: movie.slug,
        contentType: 'movie',
        contentId: movie.id,
        featuredImage: movie.backdropUrl || movie.posterUrl,
        excerpt: `${movie.title} is a captivating ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} film directed by ${directors}, featuring ${lead1} in a powerful role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know.`,
        content: `${movie.title} stands as a remarkable ${genre1.toLowerCase()} achievement from ${movie.year}. ${tagline ? `With the tagline "${tagline}", the film sets its tone from the opening frames.\n\n` : ''}${movie.description}\n\nRunning ${runtime} minutes, the film is expertly paced, allowing its story to unfold naturally. Directed by ${directors}${writers ? ` with a screenplay by ${writers}` : ''}, the movie showcases masterful storytelling.\n\nProduced by ${productionCompanies} and filmed in ${productionCountries}, the production values are exceptional. Released on ${releaseDate}, the film features stellar performances from ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''}. ${composers ? `The score by ${composers} enhances every scene.` : ''}${cinematographers ? ` Cinematography by ${cinematographers} creates stunning visuals.` : ''}`,
        plotSummary: `${movie.description}\n\nThe story unfolds with precision, drawing viewers into its world immediately. ${lead1}'s character anchors the narrative, delivering a performance that resonates long after the credits roll.\n\nThe supporting cast, including ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, adds depth and nuance to the story. Each character feels fully realized, contributing to the film's emotional impact.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}`,
        review: `${movie.title} is a masterclass in ${genre1.toLowerCase()} filmmaking. ${directors} demonstrates exceptional command of the medium, crafting a film that engages on multiple levels.\n\n${lead1} delivers what may be a career-defining performance. The emotional depth and authenticity brought to the role elevates the entire film.\n\nThe supporting cast shines equally. ${lead2}'s performance provides perfect counterbalance.${realReviews.length > 0 ? `\n\n**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}\n\nWith a TMDB rating of ${movie.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, the film has been ${parseFloat(movie.imdbRating) >= 7 ? 'overwhelmingly well-received' : 'generally well-received'}.\n\nRating: ${movie.imdbRating ? (parseFloat(movie.imdbRating) >= 8 ? '4.5/5 - A must-watch masterpiece' : parseFloat(movie.imdbRating) >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching') : '4/5 - Recommended'}`,
        boxOffice: boxOfficeText,
        trivia: JSON.stringify([
            `${movie.title} was released on ${releaseDate} and has a popularity score of ${popularity} on TMDB.`,
            `The film is produced by ${productionCompanies}.`,
            `Runtime: ${runtime} minutes.`,
            budget > 0 ? `Production budget: $${(budget / 1000000).toFixed(1)} million.` : `The film was produced with careful budget management.`,
            revenue > 0 ? `Box office revenue: $${(revenue / 1000000).toFixed(1)} million.` : `The film found its audience through various distribution channels.`,
            `Directed by ${directors}.`,
            writers ? `Screenplay by ${writers}.` : `The screenplay showcases strong writing.`,
            composers ? `Musical score by ${composers}.` : `The film features a memorable musical score.`,
            cinematographers ? `Cinematography by ${cinematographers}.` : `The cinematography creates stunning visuals.`,
            `The film has received ${voteCount.toLocaleString()} ratings on TMDB with an average score of ${movie.imdbRating}/10.`,
            trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The film's trailer showcases its impressive production values.`
        ]),
        behindTheScenes: `The making of ${movie.title} brought together talented filmmakers and crew. Directed by ${directors}, the production was overseen by ${productionCompanies}.\n\n` + (writers ? `The screenplay by ${writers} provided a strong foundation for the film.` : 'The screenplay went through careful development.') + `\n\nPre-production involved extensive planning to bring the vision to life. ${lead1}'s preparation for the role was intensive, bringing authenticity to every scene.\n\nFilmed in ${productionCountries}, the production captured stunning locations and authentic atmospheres. ` + (cinematographers ? `Cinematographer ${cinematographers} crafted the film's distinctive visual style.` : 'The cinematography team created the film\'s distinctive look.') + `\n\n` + (composers ? `Composer ${composers} created the film's memorable score.` : 'The musical score was carefully crafted to enhance the emotional journey.'),
        awards: `${movie.title} has received recognition:\n\n• TMDB Rating: ${movie.imdbRating}/10 (${voteCount.toLocaleString()} votes)\n• Popularity Score: ${popularity}\n${budget > 0 ? `• Budget: $${(budget / 1000000).toFixed(1)}M\n` : ''}${revenue > 0 ? `• Box Office: $${(revenue / 1000000).toFixed(1)}M\n` : ''}${parseFloat(movie.imdbRating) >= 7.5 ? '• Critically acclaimed\n' : '• Positive reception\n'}• ${lead1} received praise for their performance\n• Directed by ${directors}\n• Produced by ${productionCompanies}`,
        keywords: JSON.stringify(keywordList),
        seasonDetails: null,
        productionCompanies: null,
        externalLinks: null,
        author: 'StreamVault Editorial',
        published: true,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

async function updateBlog(item, data, type = 'show') {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Updating blog for: ${item.title}`);
    console.log('='.repeat(80));

    // Search TMDB
    console.log('\n🔍 Searching TMDB...');
    const searchType = type === 'show' ? 'tv' : 'movie';
    const searchResults = await searchOnTMDB(item.title, searchType);
    await delay(300);

    if (!searchResults.results || searchResults.results.length === 0) {
        console.log('   ❌ Not found on TMDB, skipping');
        return false;
    }

    const tmdbItem = searchResults.results[0];
    const tmdbTitle = type === 'show' ? tmdbItem.name : tmdbItem.title;
    console.log(`   ✅ Found: ${tmdbTitle} (ID: ${tmdbItem.id})`);

    // Fetch full data
    console.log('\n📥 Fetching latest data from TMDB...');
    const itemData = await fetchData(tmdbItem.id, searchType);
    await delay(300);

    let blogPost;

    if (type === 'show') {
        // Fetch season details
        console.log('\n📺 Fetching season details...');
        const seasonDetailsList = [];

        for (let seasonNum = 1; seasonNum <= item.totalSeasons; seasonNum++) {
            try {
                const seasonData = await httpsGet(`${TMDB_BASE_URL}/tv/${tmdbItem.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
                await delay(200);

                let seasonVideos = { results: [] };
                try {
                    seasonVideos = await fetchSeasonVideos(tmdbItem.id, seasonNum);
                    await delay(200);
                } catch (err) {
                    // Ignore
                }

                const seasonTrailer = seasonVideos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

                seasonDetailsList.push({
                    seasonNumber: seasonNum,
                    name: seasonData.name || `Season ${seasonNum}`,
                    overview: seasonData.overview || '',
                    airDate: seasonData.air_date || null,
                    episodeCount: seasonData.episodes?.length || 0,
                    posterPath: seasonData.poster_path ? `https://image.tmdb.org/t/p/w300${seasonData.poster_path}` : null,
                    trailerKey: seasonTrailer?.key || null,
                    trailerName: seasonTrailer?.name || null
                });
            } catch (err) {
                console.log(`   ⚠️ Could not fetch season ${seasonNum}`);
            }
        }

        blogPost = generateShowBlogPost(item, itemData, itemData.credits, itemData.reviews, itemData.keywords, itemData.externalIds, itemData.videos, seasonDetailsList);
    } else {
        blogPost = generateMovieBlogPost(item, itemData, itemData.credits, itemData.reviews, itemData.keywords, itemData.externalIds, itemData.videos);
    }

    // Fetch production companies
    console.log('\n🏢 Fetching production company details...');
    const enrichedProductionCompanies = await fetchProductionCompanyDetails(itemData.item.production_companies || []);
    blogPost.productionCompanies = JSON.stringify(enrichedProductionCompanies);

    const externalLinksData = {
        imdb: itemData.externalIds.imdb_id ? `https://www.imdb.com/title/${itemData.externalIds.imdb_id}` : null,
        facebook: itemData.externalIds.facebook_id ? `https://www.facebook.com/${itemData.externalIds.facebook_id}` : null,
        twitter: itemData.externalIds.twitter_id ? `https://twitter.com/${itemData.externalIds.twitter_id}` : null,
        instagram: itemData.externalIds.instagram_id ? `https://www.instagram.com/${itemData.externalIds.instagram_id}` : null,
        homepage: itemData.item.homepage || null,
        wikidata: itemData.externalIds.wikidata_id ? `https://www.wikidata.org/wiki/${itemData.externalIds.wikidata_id}` : null
    };
    blogPost.externalLinks = JSON.stringify(externalLinksData);

    // Remove old blog post
    data.blogPosts = data.blogPosts.filter(b => b.contentId !== item.id && !b.slug.includes(item.slug));

    // Add new blog post
    data.blogPosts.push(blogPost);

    // Update the movie/show object with trailer info
    const trailer = itemData.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const teaser = itemData.videos?.results?.find(v => v.type === 'Teaser' && v.site === 'YouTube');

    if (type === 'show') {
        const showIndex = data.shows.findIndex(s => s.id === item.id);
        if (showIndex !== -1) {
            if (trailer) data.shows[showIndex].youtubeTrailerId = trailer.key;
            if (teaser) data.shows[showIndex].youtubeTeaserId = teaser.key;
            data.shows[showIndex].updatedAt = new Date().toISOString();
        }
    } else {
        const movieIndex = data.movies.findIndex(m => m.id === item.id);
        if (movieIndex !== -1) {
            if (trailer) data.movies[movieIndex].youtubeTrailerId = trailer.key;
            if (teaser) data.movies[movieIndex].youtubeTeaserId = teaser.key;
            data.movies[movieIndex].updatedAt = new Date().toISOString();
        }
    }

    console.log('   ✅ Blog post updated!');
    if (trailer) console.log(`   ✅ Trailer added: ${trailer.name}`);
    if (teaser) console.log(`   ✅ Teaser added: ${teaser.name}`);
    return true;
}

async function main() {
    console.log('📝 StreamVault Blog Post Updater');
    console.log('='.repeat(80));

    if (!TMDB_API_KEY) {
        console.log('❌ Error: TMDB_API_KEY not found in .env file');
        rl.close();
        return;
    }

    try {
        // Load data
        console.log('\n📂 Loading data...');
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        console.log(`   ✅ Loaded ${data.shows.length} shows`);
        console.log(`   ✅ Loaded ${data.movies.length} movies`);
        console.log(`   ✅ Loaded ${data.blogPosts?.length || 0} blog posts`);

        if (!data.blogPosts) data.blogPosts = [];

        // Ask user what to update
        console.log('\n📋 Content Type:');
        console.log('   1. TV Shows');
        console.log('   2. Movies');

        const typeChoice = await question('\nSelect content type (1 or 2): ');
        const contentType = typeChoice === '2' ? 'movie' : 'show';
        const items = contentType === 'show' ? data.shows : data.movies;

        console.log('\n📋 Update Options:');
        console.log(`   1. Update blog for a specific ${contentType}`);
        console.log(`   2. Update blogs for all ${contentType}s`);

        const choice = await question('\nEnter your choice (1 or 2): ');

        if (choice === '1') {
            // Item list
            console.log(`\n📺 Available ${contentType}s:\n`);
            const pageSize = 20;
            let page = 0;
            let selectedItem = null;

            while (!selectedItem) {
                const start = page * pageSize;
                const end = Math.min(start + pageSize, items.length);

                for (let i = start; i < end; i++) {
                    console.log(`   ${i + 1}. ${items[i].title} (${items[i].year})`);
                }

                console.log(`\n   Showing ${start + 1}-${end} of ${items.length}`);
                const input = await question('\nEnter number (or "n" for next, "p" for prev, or search term): ');

                if (input.toLowerCase() === 'n' && end < items.length) {
                    page++;
                    continue;
                } else if (input.toLowerCase() === 'p' && page > 0) {
                    page--;
                    continue;
                } else if (!isNaN(input)) {
                    const idx = parseInt(input) - 1;
                    if (idx >= 0 && idx < items.length) {
                        selectedItem = items[idx];
                    } else {
                        console.log('❌ Invalid number');
                    }
                } else {
                    // Search
                    const matches = items.filter(s =>
                        s.title.toLowerCase().includes(input.toLowerCase())
                    );
                    if (matches.length === 0) {
                        console.log('❌ No matches found');
                    } else if (matches.length === 1) {
                        selectedItem = matches[0];
                    } else {
                        console.log('\n   Matches found:');
                        matches.slice(0, 10).forEach((m, i) => {
                            console.log(`   ${i + 1}. ${m.title} (${m.year})`);
                        });
                        const matchInput = await question('Enter number: ');
                        const matchIdx = parseInt(matchInput) - 1;
                        if (matchIdx >= 0 && matchIdx < matches.length) {
                            selectedItem = matches[matchIdx];
                        }
                    }
                }
            }

            await updateBlog(selectedItem, data, contentType);

        } else if (choice === '2') {
            console.log(`\n🔄 Updating all ${contentType} blogs...`);

            let updated = 0;
            let skipped = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                console.log(`\n[${i + 1}/${items.length}]`);

                const success = await updateBlog(item, data, contentType);
                if (success) {
                    updated++;
                } else {
                    skipped++;
                }

                // Add delay between items
                if (i < items.length - 1) {
                    await delay(1000);
                }
            }

            console.log(`\n✅ Updated ${updated} blogs, skipped ${skipped}`);
        } else {
            console.log('❌ Invalid choice');
            rl.close();
            return;
        }

        // Save data
        console.log('\n💾 Saving data...');
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        console.log('\n✅ COMPLETED!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    rl.close();
}

main();
