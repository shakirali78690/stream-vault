/**
 * Update Task show episode Google Drive URLs
 * Run with: node scripts/update-task-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Task show ID
const SHOW_ID = '2d416ca5-439d-42f1-a218-f21d7aea1bad';

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1pU8i-0VTFGPp8JJN_50KoVmROCSHcu7B/preview',
        2: 'https://drive.google.com/file/d/1YnE9UF_uT3gCWk9Ce_GJmoNbYL5Ql4Ru/preview',
        3: 'https://drive.google.com/file/d/1_IOO4qcT8gvBXcizQvyA0PicWEjANJ8F/preview',
        4: 'https://drive.google.com/file/d/1w-968MPgQ8OabFnY9eOg5y2U3XKAZiP5/preview',
        5: 'https://drive.google.com/file/d/1NpRcbhnpmiJ3IJO9F8J-3rWfbyuJ0Qv8/preview',
        6: 'https://drive.google.com/file/d/1AExaE60CHzVHJb_ijgHuZTUSXjasb90k/preview',
        7: 'https://drive.google.com/file/d/1vXlIZYNjMYc7EfWgLcRItc45O5Y4cYux/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating Task show episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    let updated = 0;

    for (const episode of data.episodes) {
        if (episode.showId === SHOW_ID) {
            const season = episode.season;
            const epNum = episode.episodeNumber;

            if (episodeLinks[season] && episodeLinks[season][epNum]) {
                const newUrl = episodeLinks[season][epNum];
                const oldUrl = episode.googleDriveUrl;

                if (oldUrl !== newUrl) {
                    episode.googleDriveUrl = newUrl;
                    console.log(`✅ S${season}E${epNum}: ${episode.title}`);
                    console.log(`   Old: ${oldUrl}`);
                    console.log(`   New: ${newUrl}\n`);
                    updated++;
                } else {
                    console.log(`⏭️  S${season}E${epNum}: Already correct`);
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Updated ${updated} episodes`);
    console.log('💾 Saved to:', DATA_FILE);
}

updateLinks().catch(console.error);
