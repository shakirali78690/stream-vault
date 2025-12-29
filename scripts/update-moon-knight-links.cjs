/**
 * Update Moon Knight show episode Google Drive URLs
 * Run with: node scripts/update-moon-knight-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Episode links (all in /preview format)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1Fn7NUgl7oWW8m_WohudBszRbunw9VEz4/preview',
        2: 'https://drive.google.com/file/d/1kmeoQQIfCkkAZr0nhay8eyIFBaca3Hbt/preview',
        3: 'https://drive.google.com/file/d/1Gnsc1r1giupjaYzlGchifXQ0iHR1NApX/preview',
        4: 'https://drive.google.com/file/d/1CDxWNFEb38QtFDp7E2RLlAnvlE5qgJlu/preview',
        5: 'https://drive.google.com/file/d/12ch_BtG1VkvNIFz7e6rmdF5ljXM0ZlIF/preview',
        6: 'https://drive.google.com/file/d/1p-fhVhVLOl6YQ0MaoKffaiosWx281FPT/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating Moon Knight episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    const show = data.shows.find(s => s.slug === 'moon-knight' || s.title.toLowerCase().includes('moon knight'));
    if (!show) {
        console.log('❌ Show not found!');
        return;
    }

    const SHOW_ID = show.id;
    console.log(`Found show: ${show.title} (${SHOW_ID})\n`);

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
                    updated++;
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Updated ${updated} episodes`);
    console.log('💾 Saved!');
}

updateLinks().catch(console.error);
