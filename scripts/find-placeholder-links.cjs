/**
 * Find all shows/movies with placeholder links
 * Run with: node scripts/find-placeholder-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Known placeholder patterns
const PLACEHOLDER_PATTERNS = [
    'PLACEHOLDER',
    '1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', // Default placeholder ID
];

function isPlaceholder(url) {
    if (!url) return true;
    return PLACEHOLDER_PATTERNS.some(p => url.includes(p));
}

async function findPlaceholders() {
    console.log('🔍 Finding content with placeholder links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // Track shows with placeholder episodes
    const showsWithPlaceholders = {};

    // Check episodes
    for (const episode of data.episodes) {
        if (isPlaceholder(episode.googleDriveUrl)) {
            const show = data.shows.find(s => s.id === episode.showId);
            if (show) {
                if (!showsWithPlaceholders[show.title]) {
                    showsWithPlaceholders[show.title] = {
                        slug: show.slug,
                        totalSeasons: show.totalSeasons,
                        placeholderEpisodes: [],
                        totalEpisodes: 0
                    };
                }
                showsWithPlaceholders[show.title].placeholderEpisodes.push({
                    season: episode.season,
                    episode: episode.episodeNumber,
                    title: episode.title
                });
            }
        }
    }

    // Count total episodes per show
    for (const showTitle of Object.keys(showsWithPlaceholders)) {
        const show = data.shows.find(s => s.title === showTitle);
        if (show) {
            const episodes = data.episodes.filter(e => e.showId === show.id);
            showsWithPlaceholders[showTitle].totalEpisodes = episodes.length;
        }
    }

    // Check movies
    const moviesWithPlaceholders = [];
    for (const movie of data.movies) {
        if (isPlaceholder(movie.googleDriveUrl)) {
            moviesWithPlaceholders.push({
                title: movie.title,
                slug: movie.slug,
                year: movie.year
            });
        }
    }

    // Print results
    console.log('='.repeat(80));
    console.log('📺 SHOWS WITH PLACEHOLDER EPISODES');
    console.log('='.repeat(80));

    const showsList = Object.entries(showsWithPlaceholders)
        .sort((a, b) => b[1].placeholderEpisodes.length - a[1].placeholderEpisodes.length);

    let totalPlaceholderEpisodes = 0;

    for (const [title, info] of showsList) {
        const placeholderCount = info.placeholderEpisodes.length;
        totalPlaceholderEpisodes += placeholderCount;

        console.log(`\n🎬 ${title} (${info.slug})`);
        console.log(`   Placeholder episodes: ${placeholderCount}/${info.totalEpisodes}`);

        // Group by season
        const bySeason = {};
        for (const ep of info.placeholderEpisodes) {
            if (!bySeason[ep.season]) bySeason[ep.season] = [];
            bySeason[ep.season].push(ep.episode);
        }

        for (const [season, episodes] of Object.entries(bySeason)) {
            episodes.sort((a, b) => a - b);
            console.log(`   Season ${season}: Episodes ${episodes.join(', ')}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎥 MOVIES WITH PLACEHOLDER LINKS');
    console.log('='.repeat(80));

    if (moviesWithPlaceholders.length === 0) {
        console.log('\n✅ No movies with placeholder links!');
    } else {
        for (const movie of moviesWithPlaceholders) {
            console.log(`\n🎬 ${movie.title} (${movie.year}) - ${movie.slug}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nShows with placeholders: ${showsList.length}`);
    console.log(`Total placeholder episodes: ${totalPlaceholderEpisodes}`);
    console.log(`Movies with placeholders: ${moviesWithPlaceholders.length}`);

    // Save to file
    const report = {
        generatedAt: new Date().toISOString(),
        showsWithPlaceholders: Object.fromEntries(showsList),
        moviesWithPlaceholders,
        summary: {
            showsCount: showsList.length,
            placeholderEpisodesCount: totalPlaceholderEpisodes,
            moviesCount: moviesWithPlaceholders.length
        }
    };

    const reportFile = path.join(__dirname, 'placeholder-links-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportFile}`);
}

findPlaceholders().catch(console.error);
