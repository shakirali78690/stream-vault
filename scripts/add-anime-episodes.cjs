#!/usr/bin/env node

/**
 * Add Anime Episodes Script
 * Adds episodes to an existing anime in streamvault-data.json
 * 
 * Usage: node scripts/add-anime-episodes.cjs
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

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function fetchSeasonData(tmdbId, seasonNumber) {
    const seasonUrl = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
    return await httpsGet(seasonUrl);
}

async function main() {
    console.log('🎌 StreamVault Anime Episode Adder');
    console.log('===================================\n');

    if (!TMDB_API_KEY) {
        console.log('❌ Error: TMDB_API_KEY not found in .env file');
        rl.close();
        return;
    }

    try {
        // Load existing data
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        if (!data.anime || data.anime.length === 0) {
            console.log('❌ No anime found in database. Use add-anime.cjs first.');
            rl.close();
            return;
        }

        // List available anime
        console.log('Available anime:\n');
        data.anime.forEach((a, i) => {
            const epCount = (data.animeEpisodes || []).filter(e => e.animeId === a.id).length;
            console.log(`  ${i + 1}. ${a.title} (${a.year}) - ${epCount} episodes`);
        });

        const animeIndexStr = await question('\nSelect anime by number: ');
        const animeIndex = parseInt(animeIndexStr) - 1;

        if (isNaN(animeIndex) || animeIndex < 0 || animeIndex >= data.anime.length) {
            console.log('❌ Invalid selection');
            rl.close();
            return;
        }

        const selectedAnime = data.anime[animeIndex];
        console.log(`\n✅ Selected: ${selectedAnime.title}`);

        // Ask for method: TMDB or manual
        const method = await question('\nAdd episodes from TMDB (t) or manually (m)? (t/m): ');

        const newEpisodes = [];

        if (method.toLowerCase() === 't') {
            // TMDB method
            const tmdbId = await question('Enter TMDB TV Show ID for this anime: ');

            if (!tmdbId || isNaN(tmdbId)) {
                console.log('❌ Invalid TMDB ID');
                rl.close();
                return;
            }

            const seasonNum = await question('Season number to add: ');
            const season = parseInt(seasonNum);

            if (isNaN(season) || season < 1) {
                console.log('❌ Invalid season number');
                rl.close();
                return;
            }

            console.log(`\n📥 Fetching season ${season} data from TMDB...`);
            const seasonData = await fetchSeasonData(tmdbId, season);

            if (!seasonData.episodes || seasonData.episodes.length === 0) {
                console.log('❌ No episodes found for this season');
                rl.close();
                return;
            }

            console.log(`   Found ${seasonData.episodes.length} episodes\n`);

            // Check for existing episodes in this season
            const existingEps = (data.animeEpisodes || []).filter(
                e => e.animeId === selectedAnime.id && e.season === season
            );

            if (existingEps.length > 0) {
                console.log(`⚠️  Found ${existingEps.length} existing episodes for season ${season}`);
                const replace = (await question('Replace existing episodes? (y/n): ')).toLowerCase() === 'y';
                if (replace) {
                    data.animeEpisodes = (data.animeEpisodes || []).filter(
                        e => !(e.animeId === selectedAnime.id && e.season === season)
                    );
                }
            }

            // Ask for dubbed/subbed
            const isDubbed = (await question('Are these episodes dubbed? (y/n): ')).toLowerCase() === 'y';

            console.log('\nEnter Google Drive URLs for each episode (or press Enter to skip):\n');

            for (const ep of seasonData.episodes) {
                const epNum = ep.episode_number;
                const epTitle = ep.name || `Episode ${epNum}`;

                const driveUrl = await question(`S${season}E${epNum} - ${epTitle}: `);

                if (driveUrl && driveUrl.trim()) {
                    newEpisodes.push({
                        id: generateUUID(),
                        animeId: selectedAnime.id,
                        season: season,
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

        } else {
            // Manual method
            const season = parseInt(await question('Season number: '));
            const startEp = parseInt(await question('Starting episode number: '));
            const endEp = parseInt(await question('Ending episode number: '));
            const isDubbed = (await question('Are these episodes dubbed? (y/n): ')).toLowerCase() === 'y';

            if (isNaN(season) || isNaN(startEp) || isNaN(endEp) || startEp > endEp) {
                console.log('❌ Invalid episode range');
                rl.close();
                return;
            }

            console.log('\nEnter Google Drive URLs for each episode:\n');

            for (let epNum = startEp; epNum <= endEp; epNum++) {
                const title = await question(`S${season}E${epNum} title (default: Episode ${epNum}): `) || `Episode ${epNum}`;
                const driveUrl = await question(`S${season}E${epNum} Google Drive URL: `);

                if (driveUrl && driveUrl.trim()) {
                    newEpisodes.push({
                        id: generateUUID(),
                        animeId: selectedAnime.id,
                        season: season,
                        episodeNumber: epNum,
                        title: title,
                        description: '',
                        duration: 24,
                        thumbnailUrl: '',
                        googleDriveUrl: driveUrl.trim(),
                        videoUrl: null,
                        airDate: null,
                        dubbed: isDubbed
                    });
                }
            }
        }

        if (newEpisodes.length === 0) {
            console.log('\n⚠️ No episodes to add.');
            rl.close();
            return;
        }

        // Add episodes
        if (!data.animeEpisodes) data.animeEpisodes = [];
        data.animeEpisodes.push(...newEpisodes);

        // Save data
        console.log('\n💾 Saving data...');
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        console.log('\n✅ Episodes added successfully!');
        console.log(`   Anime: ${selectedAnime.title}`);
        console.log(`   Episodes added: ${newEpisodes.length}`);
        console.log(`   Total episodes now: ${data.animeEpisodes.filter(e => e.animeId === selectedAnime.id).length}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    rl.close();
}

main();
